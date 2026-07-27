import base64
import json
import os
import re
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from faster_whisper import WhisperModel

# Whisper was trained on subtitled video, so when it is handed background noise with
# no speech in it, it emits the phrases that pad the end of those subtitle tracks.
# These come back with high no_speech_prob, but not always high enough to be cut by
# the threshold alone, so a segment that is nothing but one of these is dropped.
HALLUCINATED_PHRASES = {
    "thank you",
    "thanks for watching",
    "thanks for watching!",
    "thank you for watching",
    "please subscribe",
    "bye",
    "bye bye",
    "you",
    "okay",
    "so",
    "the end",
    "subtitles by the amara.org community",
    "transcription by castingwords",
}


def is_hallucinated(text):
    stripped = re.sub(r"[\s.,!?…]+", " ", text.lower()).strip()
    return stripped in HALLUCINATED_PHRASES


def collapse_repeats(parts):
    # A weak model that starts looping repeats the same short phrase until the chunk
    # ends ("Okay. Okay. Okay."). Keep the first occurrence and drop the echoes.
    collapsed = []
    for part in parts:
        if collapsed and part.strip().lower() == collapsed[-1].strip().lower():
            continue
        collapsed.append(part)
    return collapsed


def decode_prompt(raw):
    # Whisper attends to only a short prompt window, so keep the tail of the sentence.
    # A malformed header must never take the transcription down — drop it and carry on.
    if not raw:
        return ""
    try:
        return base64.b64decode(raw).decode("utf-8")[-400:]
    except Exception:
        return ""


MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
# How many candidate transcriptions the decoder keeps alive at once before picking the
# best one. Five costs roughly five times the decoding work for a point or two of
# accuracy, which is a bad trade when the words are wanted as captions in a live room.
BEAM_SIZE = int(os.environ.get("WHISPER_BEAM_SIZE", "2"))
# A segment whose "this is not speech" score is above this is discarded. Whisper only
# invents text where there is no speech, so this is the main hallucination guard.
NO_SPEECH_THRESHOLD = float(os.environ.get("WHISPER_NO_SPEECH_THRESHOLD", "0.6"))
# Average token confidence, in log space. Below this the model was guessing.
LOG_PROB_THRESHOLD = float(os.environ.get("WHISPER_LOG_PROB_THRESHOLD", "-1.0"))
CPU_THREADS = int(os.environ.get("WHISPER_CPU_THREADS", "8"))
# Threading the HTTP server is not enough on its own: with one worker the model runs
# transcriptions one at a time internally, so concurrent requests would still queue,
# just inside the model rather than in the socket. Two workers times eight threads is
# sixteen, which is what the demo machine has; raising either past that makes the
# workers fight each other for cores rather than getting through the queue faster.
NUM_WORKERS = int(os.environ.get("WHISPER_NUM_WORKERS", "2"))
PORT = int(os.environ.get("STT_PORT", "8787"))
HOST = os.environ.get("STT_HOST", "127.0.0.1")

print("Loading faster-whisper model: %s" % MODEL_SIZE, flush=True)
MODEL = WhisperModel(
    MODEL_SIZE,
    device=DEVICE,
    compute_type=COMPUTE_TYPE,
    cpu_threads=CPU_THREADS,
    num_workers=NUM_WORKERS,
)
print(
    "Whisper service ready on port %s (beam_size=%s, cpu_threads=%s, num_workers=%s)"
    % (PORT, BEAM_SIZE, CPU_THREADS, NUM_WORKERS),
    flush=True,
)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/transcribe":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 10 * 1024 * 1024:
            self.send_error(400, "Audio body must be between 1 byte and 10 MB")
            return

        audio = self.rfile.read(length)
        print("Received %s bytes for transcription" % len(audio), flush=True)
        # When the caller knows the speaker's language, pin it. Auto-detection on a
        # few seconds of audio is unreliable, and a wrong guess wrecks the transcript.
        language = (self.headers.get("X-Language-Hint") or "").strip().lower() or None
        # The sentence so far, base64-encoded by the caller because HTTP headers
        # cannot carry Burmese or Chinese text directly. Used as preceding context so
        # this chunk continues the sentence instead of restarting cold.
        prompt = decode_prompt(self.headers.get("X-Prompt"))
        suffix = ".webm" if "webm" in self.headers.get("Content-Type", "") else ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix) as source:
            source.write(audio)
            source.flush()
            segments, info = MODEL.transcribe(
                source.name,
                language=language,
                beam_size=BEAM_SIZE,
                vad_filter=True,
                # Trim the silence around the speech more aggressively than the
                # defaults do. Leftover silence inside a chunk is exactly what the
                # model fills with invented subtitle text.
                vad_parameters={
                    "min_silence_duration_ms": 500,
                    "speech_pad_ms": 200,
                },
                # Feeding the model its own previous output is what makes it loop:
                # once it emits "Okay." twice, its own transcript becomes evidence
                # that "Okay." is what comes next, and it never escapes. The prompt
                # below still carries cross-chunk context without that feedback.
                condition_on_previous_text=False,
                # Mild penalty on tokens already produced, as a second brake on the
                # same failure mode.
                repetition_penalty=1.1,
                # A single greedy pass. This used to be a ladder of rising randomness
                # (0.0 up to 1.0) that re-transcribed the whole chunk from scratch each
                # time the previous pass looked degenerate — up to six transcriptions of
                # the same audio, which is where the occasional caption that arrived
                # ten seconds late was going. The per-segment confidence and no-speech
                # checks below are what actually catch invented text, and they still run.
                temperature=0.0,
                compression_ratio_threshold=2.4,
                log_prob_threshold=LOG_PROB_THRESHOLD,
                no_speech_threshold=NO_SPEECH_THRESHOLD,
                initial_prompt=prompt or None,
            )
            parts = []
            dropped = 0
            for segment in segments:
                text = segment.text.strip()
                if not text:
                    continue
                # Whisper reports per-segment how confident it is that the audio was
                # silence, and how confident it is in the words themselves. A segment
                # that fails either test is invention, not speech.
                if segment.no_speech_prob >= NO_SPEECH_THRESHOLD:
                    dropped += 1
                    continue
                if segment.avg_logprob < LOG_PROB_THRESHOLD and is_hallucinated(text):
                    dropped += 1
                    continue
                parts.append(text)
            parts = collapse_repeats(parts)
            # A chunk whose entire content is one stock subtitle phrase is noise that
            # slipped past the numeric checks.
            if len(parts) == 1 and is_hallucinated(parts[0]):
                dropped += 1
                parts = []
            if dropped:
                print("Dropped %s hallucinated segment(s)" % dropped, flush=True)

        response = {
            "text": " ".join(parts).strip(),
            "language": info.language or "und",
            "language_probability": float(info.language_probability or 0),
            "provider": "faster-whisper-%s" % MODEL_SIZE,
        }
        print("Transcribed: %s" % response["text"], flush=True)
        body = json.dumps(response).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        return


# Threaded because transcription blocks for seconds at a time. On a single-threaded
# server a second speaker's audio sat untouched in the socket queue until the first
# speaker's chunk had been fully decoded, so every extra person in the room added their
# own transcription time to everyone else's captions. The threads share the same CPU
# cores, so this does not make one speaker faster — it stops several speakers queueing.
SERVER = ThreadingHTTPServer((HOST, PORT), Handler)
# A request still decoding must not keep the container alive on shutdown.
SERVER.daemon_threads = True
SERVER.serve_forever()
