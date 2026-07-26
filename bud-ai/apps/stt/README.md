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
`utterance_completed` events. The browser-selected native language arrives as
an `X-Language-Hint` header and is passed straight to Whisper as the expected
language, rather than letting it re-detect on every short chunk. Transcripts are
no longer discarded when the detected language differs from the selection — that
dropped too much genuine speech. The service binds to localhost and does not send
audio to a remote provider.

This service is now the **fallback** path. When `GROQ_API_KEY` is set, the Bud
server sends audio to Groq's hosted `whisper-large-v3` instead, and only falls
back here if that call fails. Set `STT_PROVIDER=local` to force this service.

The prototype defaults to `WHISPER_BEAM_SIZE=4`, which considers several
candidate decodings and can improve recognition of unclear or accented speech.
Set `WHISPER_BEAM_SIZE=1` for a faster greedy-decoding comparison when
benchmarking latency. The final demo setting should be validated against the
actual hardware and varied workshop utterances.
