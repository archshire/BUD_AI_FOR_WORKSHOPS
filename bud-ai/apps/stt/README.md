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
an input-language boundary; the Bud server discards a transcript when
Whisper detects a different language, so it does not enter translation or AI
reasoning. The service binds to localhost and does not send audio to a remote
provider.

The prototype defaults to `WHISPER_BEAM_SIZE=4`, which considers several
candidate decodings and can improve recognition of unclear or accented speech.
Set `WHISPER_BEAM_SIZE=1` for a faster greedy-decoding comparison when
benchmarking latency. The final demo setting should be validated against the
actual hardware and varied workshop utterances.
