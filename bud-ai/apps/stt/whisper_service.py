import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer

from faster_whisper import WhisperModel


MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
BEAM_SIZE = int(os.environ.get("WHISPER_BEAM_SIZE", "4"))
PORT = int(os.environ.get("STT_PORT", "8787"))
HOST = os.environ.get("STT_HOST", "127.0.0.1")

print("Loading faster-whisper model: %s" % MODEL_SIZE, flush=True)
MODEL = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Whisper service ready on port %s" % PORT, flush=True)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        body = json.dumps({"status": "ok", "service": "whisper", "model": MODEL_SIZE}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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
        suffix = ".webm" if "webm" in self.headers.get("Content-Type", "") else ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix) as source:
            source.write(audio)
            source.flush()
            segments, info = MODEL.transcribe(
                source.name,
                beam_size=BEAM_SIZE,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            parts = []
            for segment in segments:
                text = segment.text.strip()
                if text:
                    parts.append(text)

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


HTTPServer((HOST, PORT), Handler).serve_forever()
