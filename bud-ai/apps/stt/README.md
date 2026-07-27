# Local Whisper STT

## Contents

- [Service Overview](#local-whisper-stt)
- [Start the Service](#start-it-from-the-repository-root-with)
- [Integration Behavior](#integration-behavior)

## Start the Service

This service loads the locally installed multilingual `faster-whisper` `small` model and
accepts short WebM or WAV recordings at `POST /transcribe`.

Start it from the repository root with:

```sh
/tmp/bud-stt-venv/bin/python bud-ai/apps/stt/whisper_service.py
```

## Integration Behavior

The Bud server forwards browser audio chunks here and converts completed
transcripts into normalized `participant_utterance` and
`utterance_completed` events. The browser-selected native language is sent as
`X-Language-Hint`, which pins Whisper's language on short recordings. Whisper's
own language guess is not used to silently discard an utterance; the selected
participant language remains the input boundary. The service binds to
localhost and does not send audio to a remote provider.

The prototype defaults to `WHISPER_BEAM_SIZE=2` and
`WHISPER_CPU_THREADS=8`. Set `WHISPER_BEAM_SIZE=1` for a faster
greedy-decoding comparison when benchmarking latency. The browser performs
voice-activity segmentation before sending audio: sustained pauses close an
utterance, silent chunks are skipped, and a continuous talk turn is capped at
15 seconds. The final quality and latency setting should be validated against
the actual hardware and varied workshop utterances.
