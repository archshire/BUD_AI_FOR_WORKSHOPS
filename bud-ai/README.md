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
beam size 2 and configurable CPU threads. The browser uses bounded voice
activity detection to submit meaningful utterances after a pause, and sends
the selected native language as a Whisper hint. `WHISPER_BEAM_SIZE=1`
remains available for latency comparison.

Qwen is a constrained reasoning provider, not Bud's source of truth. The
application chooses the Learner Bud or Leader Bud persona, retrieves only the
permitted source/plan/chat/memory context, uses direct source routes for known
facts such as attendance and task insights, and blocks unsupported or
privacy-violating answers before display.

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

Qwen uses `/tmp/bud-qwen-model` by default. The first `make up` downloads
`Qwen3-1.7B-Q4_K_M.gguf` there if it is missing, and later launches reuse it.
Override `QWEN_MODEL_MOUNT`, `QWEN_MODEL_FILE`, or `QWEN_MODEL_URL` when using a
different host directory or permitted GGUF source. `make clean` does not delete
the host model directory.

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

The browser sends meaningful, pause-bounded microphone utterances to the local
Whisper service; Bud converts completed results into normalized utterance
events. Microphone capture is bounded by explicit `Talk to Bud` /
`Talk to Leader Bud` controls and stops when the user presses `Stop talking`,
after a sustained pause between utterances, or after 15 seconds of continuous
speech. The selected native language is passed to Whisper and is not rejected
merely because short-chunk language detection disagrees. Remote LiveKit
microphone tracks are subscribed to and played by the other workshop clients;
raw audio is not written to the session log. Learner Bud and Leader Bud message histories
remain scrollable within bounded client panels.

## Current Capabilities

- Shared contract-shaped runtime validators.
- In-memory workshop state.
- Text-first normalized event ingestion.
- Bud Core decisions for ME, US, THE ROOM, corrections, privacy, and WAIT.
- Private "Help, I'm Stuck" support request flow.
- Signal-driven private learner support when a learner explicitly marks a task
  yellow or red; a later green response resolves that support signal.
- Context retrieval for facilitator instructions and recent permitted workshop evidence.
- Evidence-based room insights and Leader Bud briefings drawn from explicit task
  check-ins plus permitted Live/Breakout chat; quiet learners remain unknown.
- Dependency-free learner web UI with a private Bud panel, "Help, I'm Stuck" action, private message composer, Live Chat, and assigned Breakout Room view.
- Local HTTP API for learner state, private help requests, private messages, and observation scans.
- Application-side tool validation.
- Demo fixtures and smoke tests.
- Server-issued, participant-bound LiveKit tokens when credentials are configured.
- Facilitator room management: start named rooms, allocate learners, and
  reject unallocated learners from managed rooms.
- Automatic facilitator room report on facilitator view entry, with the
  existing manual room scan retained as an explicit refresh.
- Browser LiveKit client connection and microphone publishing controls.
- Remote LiveKit microphone playback between connected workshop clients.
- Local faster-whisper transcription and NLLB translation services for
  English, Spanish, Simplified Chinese, Burmese, French, and Thai.
- Local Qwen3-1.7B text response service for private Bud questions on port
  8790; replies are grounded with the current workshop documents and run with
  Qwen3's non-thinking mode for lower latency.
- Leader Bud uses the same local Qwen service for leader-private questions;
  Learner Bud and Leader Bud remain separate privacy scopes and receive
  different permitted contextual-memory retrievals.

## Not Yet Implemented

- Model-assisted ledger compaction/category suggestions; the current ledger
  write path is application-owned and source-validated.
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
