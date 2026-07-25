# Local Whisper STT

This service loads the locally installed `faster-whisper` `base` model and
accepts short WebM or WAV recordings at `POST /transcribe`.

Start it from the repository root with:

```sh
/tmp/bud-stt-venv/bin/python bud-ai/apps/stt/whisper_service.py
```

The Bud server forwards browser audio chunks here and converts completed
transcripts into normalized `participant_utterance` and
`utterance_completed` events. The service binds to localhost and does not
send audio to a remote provider.
