# Bud AI Architecture

## Status

Current prototype architecture. This document is the formal architecture
reference for the runnable Bud AI demo. It records both the system structure
and the reasons behind the principal technology choices.

## Contents

- [Architectural Objective](#architectural-objective)
- [Logical Architecture](#logical-architecture)
- [Runtime Components](#runtime-components)
- [Docker Compose Topology](#docker-compose-topology)
- [Technology Choices and Rationale](#technology-choices-and-rationale)
- [Privacy and Authority Boundaries](#privacy-and-authority-boundaries)
- [Prototype Constraints](#prototype-constraints)
- [Future Evolution](#future-evolution)

## Architectural Objective

Bud AI is a native, multilingual workshop runtime. It gives each learner a
private Bud, gives the facilitator a private Facil-Bud and room-level signals,
and preserves a shared workshop conversation through voice, text, and
translation.

The architecture keeps communication infrastructure, AI reasoning, provider
services, and authoritative workshop state separate. This allows the demo to
prove the core interaction without making the AI dependent on a particular
meeting platform or model provider.

## Logical Architecture

```text
Participant browser                Facilitator browser
 voice / text / Bud                 voice / text / Facil-Bud
          |                                  |
          +---------- LiveKit room ---------+
                         |
                   LiveKit adapter
                         |
                normalized workshop events
                         |
                    Bud AI Core
       context retrieval, privacy, uncertainty,
       decision generation, WAIT / NO_ACTION
                         |
              application validator
                         |
                  bounded tool calls
                         |
       authoritative state and permitted UI events
```

Bud Core does not consume LiveKit-specific objects. The adapter translates
platform events into the normalized event contract. The validator, not the
model, owns state mutation and permission enforcement.

## Runtime Components

### Browser clients

- `/` is the learner/participant view.
- `/facilitator` is the teacher/facilitator view.
- `/topview` is a development and diagnostics view.

The facilitator client and the Bud server are separate roles. The teacher may
launch the local server for the prototype, but the teacher browser is not the
server. The facilitator starts rooms and allocates participants through the
facilitator view.

### Bud application server

The Node server is the application boundary. It serves the browser views,
issues participant-bound LiveKit tokens, owns the in-memory workshop state,
routes normalized events, invokes provider services, validates AI decisions,
and emits privacy-scoped updates.

### LiveKit

LiveKit supplies the real-time room, participant presence, microphone
publishing, and signalling layer. It was selected for the prototype because it
provides a controllable native room runtime without requiring a Zoom marketplace
application, external meeting-platform authorization, or a platform-specific
transcript integration.

LiveKit is communication infrastructure, not Bud's reasoning layer. A future
Zoom/Meet adapter can feed the same normalized event boundary, but that is not
an MVP dependency.

### Bud AI Core

Bud Core receives permitted normalized events and current workshop context. It
produces structured decisions for learner support, comprehension signals,
facilitator signals, clarification, correction, escalation, or WAIT. It does
not directly mutate state and it must not expose private learner content to the
facilitator without permission.

### Local provider services

- **Whisper**: faster-whisper speech-to-text service on port `8787`.
- **NLLB**: CTranslate2 translation service on port `8788` for English,
  Spanish, Simplified Chinese, Burmese, and French.
- **Qwen**: local `llama-cpp-python` text response service on port `8790`.
  The current hardware-constrained demo uses
  `Qwen3-1.7B.Q4_K_M.gguf` in non-thinking mode. The larger Qwen3-8B direction
  remains a future benchmarked upgrade.

Whisper and NLLB remain separate from Qwen because speech recognition,
translation, and reasoning have different performance and replacement needs.

Bud uses the local reasoning path for two bounded proactive behaviors. A
learner may receive a short private progress summary after joining and at most
once per 90-second cooldown. When the facilitator view loads, the application
projects the latest aggregate comprehension report immediately; this report is
derived from participant-reported signals and does not expose private Bud
messages. Both behaviors remain subject to the same privacy and uncertainty
rules as manually requested support.

## Docker Compose Topology

The repository's `docker-compose.yml` runs five services:

```text
browser clients
      |
   bud :3002
      |
      +-- livekit :7880, :7881, :7882/udp
      +-- whisper :8787
      +-- translation :8788
      +-- qwen :8790
```

The `bud` container uses Docker service names for internal calls. Browsers use
the public host-facing LiveKit URL. This distinction allows the same compose
configuration to work with container networking while preserving a browser-
reachable LiveKit address.

Model data is kept outside the application image:

- Whisper model data uses the `whisper-models` volume.
- NLLB model data uses the `nllb-models` volume.
- Qwen uses the `qwen-models` volume by default or a host bind mount supplied
  through `QWEN_MODEL_MOUNT`.

`make` is the default foreground launch command. `make up-d` runs in the
background; `make logs`, `make ps`, `make down`, and `make clean` manage the
stack.

## Technology Choices And Rationale

| Choice | Role | Rationale |
| --- | --- | --- |
| Node.js | Application server | Matches the existing runtime and LiveKit server SDK integration. |
| Browser HTML/CSS/JS | Demo clients | Keeps the prototype easy to run and inspect without adding frontend build complexity. |
| LiveKit | Real-time rooms and media | Provides native room control and avoids Zoom marketplace authorization and adapter risk. |
| faster-whisper | Local STT | Keeps workshop audio on the local server and avoids a remote transcription round trip. |
| NLLB + CTranslate2 | Translation | Provides a dedicated multilingual translation path with model data under local control. |
| Qwen3 local GGUF | Bud and Facil-Bud text replies | Avoids closed API latency, cost, and external data transfer in the demo. |
| Docker Compose | Deployment | Gives teammates one repeatable command and isolates the five runtime responsibilities. |
| In-memory state | Prototype state | Keeps the timeboxed demo focused; durable persistence is a future requirement. |

## Privacy And Authority Boundaries

- Learner Bud conversations are private by default.
- Facil-Bud conversations are private to the facilitator.
- The facilitator receives minimum-necessary operational signals, not raw
  private learner content.
- Room-level rollups use participant-reported evidence and preserve `unknown`
  when no response exists.
- The model proposes decisions; application validation and human authority
  determine whether bounded actions occur.
- Raw audio is not written to the session log by the prototype.

## Prototype Constraints

- Demo authentication is intentionally omitted; participant-bound internal
  IDs and teacher-controlled allocation provide the bounded demo admission
  flow.
- Workshop state is in memory and is lost when the application server stops.
- The local stack is intended for the teacher-hosted prototype and LAN/demo
  operation, not production internet deployment.
- External deployment requires authentication, HTTPS/WSS, TURN/network
  configuration, durable persistence, tenant isolation, and a model-serving
  capacity plan.

## Future Evolution

The architecture leaves room for a cloud-hosted Bud server, a durable state
store, stronger authentication, larger benchmarked local models, and an
external-platform adapter. These changes must preserve the normalized event
boundary, privacy projections, participant/facilitator authority, and the
ME / US / THE ROOM reasoning scopes.
