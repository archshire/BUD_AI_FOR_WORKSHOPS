# Bud AI

Bud AI is a LiveKit-first real-time multilingual workshop MVP.

The scaffold currently proves the text-first Bud Core loop and includes
the first LiveKit room/token boundary:

```text
NormalizedEvent -> Bud Core -> AiDecision -> validator -> tool -> state update
```

The local demo now includes faster-whisper STT, NLLB translation, and a
CPU-local Qwen3-1.7B quantized model for private text replies.
Voice transcription defaults to multilingual faster-whisper `small` with
beam size 4; `WHISPER_BEAM_SIZE=1` remains available for latency comparison.

## Contents

- [Quick Start](#quick-start)
- [Current Capabilities](#current-capabilities)
- [Not Yet Implemented](#not-yet-implemented)
- [Documentation](#documentation)

## Quick Start

Requires Node 18+ for the LiveKit runtime. The contract tests can still run
on older Node versions, but the workshop server and LiveKit SDK require
Node 18 or newer.

```sh
npm run demo
npm test
```

For the complete local demo, start LiveKit, Whisper, NLLB translation, and
Bud together:

```sh
./scripts/start-demo.sh
```

From the repository root, the Docker Compose demo is also available:

```sh
make up
```

The first Compose launch downloads the Whisper `small` model into the
persistent `whisper-models` volume. Later launches reuse that volume. Set
`WHISPER_MODEL` explicitly if benchmarking another Whisper variant.

When the services are ready, use:

- `http://127.0.0.1:3002/` for a participant
- `http://127.0.0.1:3002/facilitator` for the facilitator
- `http://127.0.0.1:3002/topview` for development diagnostics

The facilitator opens the room and allocates participants. Participants join
from the root URL after allocation. The topview page is a separate diagnostic
surface and should not be used as a workshop participant page.

Use `QWEN_MODEL_MOUNT=/var/tmp/bud-qwen-model make up` to mount the existing
local Qwen model, or use `/tmp/bud-qwen-model` when the home filesystem is
short on space. `make down` preserves Docker model volumes; `make clean`
removes Docker-managed volumes.

The launcher prints the learner and facilitator URLs and writes service logs
to `/tmp/bud-demo-logs`. Press `Ctrl+C` to stop the services it started.

For development diagnostics, open `/topview` on the Bud server. This view
shows live rooms, connected participants, selected languages, microphone
state, provider configuration, latency, and recent operational events. It
does not expose private Bud conversations or raw audio.

To run only the speech service manually:

```sh
/tmp/bud-stt-venv/bin/python apps/stt/whisper_service.py
```

The browser sends short microphone chunks to the localhost Whisper service;
Bud converts completed results into normalized utterance events. Microphone
capture is bounded by explicit `Talk to Bud` / `Talk to Facil-Bud` controls and
stops when the user presses `Stop talking` or after 15 seconds without
meaningful audio. Bud and Facil-Bud message histories remain scrollable within
bounded client panels.

## Current Capabilities

- Shared contract-shaped runtime validators.
- In-memory workshop state.
- Text-first normalized event ingestion.
- Bud Core decisions for ME, US, THE ROOM, corrections, privacy, and WAIT.
- Private "Help, I'm Stuck" support request flow.
- Private periodic learner progress summaries with a bounded 90-second cooldown.
- Context retrieval for facilitator instructions and recent permitted workshop evidence.
- Adaptive private check-in flow for low observable participation.
- Participation observation generator that can scan recent shared workshop activity and emit low-activity observations for quieter learners.
- Dependency-free learner web UI with a private Bud panel, "Help, I'm Stuck" action, private message composer, and adaptive scan control.
- Local HTTP API for learner state, private help requests, private messages, and observation scans.
- Application-side tool validation.
- Demo fixtures and smoke tests.
- Server-issued, participant-bound LiveKit tokens when credentials are configured.
- Facilitator room management: start named rooms, allocate learners, and
  reject unallocated learners from managed rooms.
- Automatic facilitator room report on facilitator view entry, with the
  existing manual room scan retained as an explicit refresh.
- Browser LiveKit client connection and microphone publishing controls.
- Local faster-whisper transcription and NLLB translation services for
  English, Spanish, Simplified Chinese, Burmese, French, and Thai.
- Local Qwen3-1.7B text response service for private Bud questions on port
  8790; replies are grounded with the current workshop prompt and run with
  Qwen3's non-thinking mode for lower latency.
- Facil-Bud uses the same local Qwen service for facilitator-private questions;
  learner Bud and Facil-Bud remain separate privacy scopes.

## Not Yet Implemented

- LiveKit/frontend scheduler wiring for periodic adaptive observation scans.
- LiveKit event normalization and production room lifecycle behavior.
- Production transcript/current-activity provider pipeline.
- Production STT and translation provider integrations.
- Voice-to-Bud LLM response chaining (voice currently proves STT and
  translation; private text is the first Qwen path).
- Durable database.

## Documentation

Source docs live one level above this scaffold:

- `../docs/02_KRYSTALIZE/`
- `../docs/03_CONTRACTS/`
- `../docs/04_IMPLEMENTATION/`
