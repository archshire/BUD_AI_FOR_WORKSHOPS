# Bud AI Architecture

## Status

Current prototype architecture. This document is the formal architecture
reference for the runnable Bud AI demo. It records both the system structure
and the reasons behind the principal technology choices.

## Contents

- [Architectural Objective](#architectural-objective)
- [Logical Architecture](#logical-architecture)
- [Persona and Reasoning Boundary](#persona-and-reasoning-boundary)
- [Runtime Components](#runtime-components)
- [Docker Compose Topology](#docker-compose-topology)
- [Technology Choices and Rationale](#technology-choices-and-rationale)
- [Privacy and Authority Boundaries](#privacy-and-authority-boundaries)
- [Prototype Constraints](#prototype-constraints)
- [Future Evolution](#future-evolution)

## Architectural Objective

Bud AI is a native, multilingual workshop runtime. It gives each learner a
private Learner Bud, gives the facilitator a private Leader Bud and room-level signals,
and preserves a shared workshop conversation through voice, text, and
translation.

The architecture keeps communication infrastructure, AI reasoning, provider
services, and authoritative workshop state separate. This allows the demo to
prove the core interaction without making the AI dependent on a particular
meeting platform or model provider.

## Logical Architecture

```text
Participant browser                Facilitator browser
 voice / text / Learner Bud         voice / text / Leader Bud
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

## Persona and Reasoning Boundary

Qwen is the local reasoning engine. It receives a role-specific system
contract plus only the permitted workshop context and user request. It does
not own Bud identity, privacy permissions, authoritative state, or workshop
truth.

The application selects one of two persona contracts:

- `apps/server/src/config/learner-bud-config.js` defines the private Learner
  Bud behavior: source-grounded support, gentle clarification, learner
  correction, `unknown`, `WAIT`, and minimum intervention.
- `apps/server/src/config/leader-bud-config.js` defines the private Leader Bud
  behavior: room-level operational support, active Source Pack grounding,
  concise clarification when evidence is missing, and protection of private
  learner content.

Leader Bud context is assembled with explicit boundaries. The active Source
Pack and learning plan are authoritative workshop evidence; public main-room
and breakout messages, room evidence, attendance evidence, and the Leader's
private Markdown memory are additional permitted sources. Learner-private Bud
messages and private DMs are excluded. The application bounds each source
before sending it to Qwen so the local model's context window is not exceeded.

The execution path is:

```text
permitted context + user request
             ↓
selected Bud persona contract
             ↓
Qwen reasoning provider
             ↓
application grounding/privacy/freshness checks
             ↓
private response or bounded application action
```

If the permitted context does not support an answer, the application and
persona contract require an explicit unknown/clarification response. A generic
Qwen completion is not accepted as workshop truth. If Qwen cannot complete a
bounded request, the user receives a visible grounding fallback rather than an
empty chat response.

### Current response-routing flow

The current server uses a source-first flow, rather than treating Qwen as an
unrestricted chatbot:

```text
user message
    ↓
intent and scope classification in application code
    ├── direct source route: identity, attendance, lesson, task insight,
    │   breakout membership, room status, or permitted shared-chat summary
    └── constrained reasoning route
           ↓
       selected Bud persona + scoped ledger retrieval + authoritative source
           ↓
       local Qwen rendering/reasoning
           ↓
       output guard: evidence boundary, privacy boundary, no prompt-label leak
```

Leader Bud's room-status route is deliberately deterministic. It reads the
same task-response records that drive Room Insights, current public support
signals, and permitted Live/Breakout chat. It reports named support only where
a learner explicitly marked a task yellow or red; it does not infer a need from
silence or expose a learner's private Bud content. A follow-up such as “how are
they doing?” inherits the preceding room-status subject rather than falling
back to a generic model explanation.

Learner Bud's identity, assigned-group, lesson, self-check-in, evidence,
next-step, uncertainty, and other-learner-location questions are also direct
source routes. Its constrained-Qwen path receives only active source material,
the locked learning plan, that learner's task check-ins, permitted group scope,
and private memory. It has the same authoritative-source gate as Leader Bud;
unsupported workshop questions do not reach Qwen. A post-generation guard
rejects generic greetings, promises to search context, and generic
workshop-partner text in favor of a grounded fallback. For personal questions
that lack a fact in that Bud's own private Markdown memory, the application
requires an unknown-without-guessing response.

Explicit learner distress, threats of harm, and clearly off-task questions
also have deterministic Learner Bud routes. The first two provide a calm
support or urgent-safety boundary without diagnosing the learner; off-task
questions return honestly to the current workshop rather than being handed to
Qwen as an open-ended chat request.

Breakout membership is resolved by stable participant ID before a legacy
display-name fallback. The server also replaces a requested breakout target
with the sender's current assigned group, preventing a duplicate guest name or
stale browser state from writing into another breakout chat.

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

LiveKit supplies the real-time room, participant presence, microphone and optional camera/screen publishing, and signalling layer. It was selected for the prototype because it
provides a controllable native room runtime without requiring a Zoom marketplace
application, external meeting-platform authorization, or a platform-specific
transcript integration.

LiveKit is communication infrastructure, not Bud's reasoning layer. A future
Zoom/Meet adapter can feed the same normalized event boundary, but that is not
an MVP dependency.

Connected clients subscribe to remote microphone tracks and attach them to
local audio playback. This permits ordinary workshop voice communication while
the same speaker's local published track is separately captured for Bud's STT
path. Raw microphone audio is not written to the session log.

### Live-vid media policy

The `live-vid` branch has one main media space. At most one screen-share track may be active at a time. The facilitator can share by default; participant screen sharing is permission-controlled, and a second share is rejected rather than silently replacing or queueing the current share. The facilitator may stop an active participant share. The facilitator camera is optional presence media. Participant camera video is not required. Camera and screen tracks are not passed to Bud Core, are not recorded, and are not written to the event log. Bud continues to reason from permitted text and microphone transcripts only.

### Bud AI Core

Bud Core receives permitted normalized events and current workshop context. It
produces structured decisions for learner support, comprehension signals,
facilitator signals, clarification, correction, escalation, or WAIT. It does
not directly mutate state and it must not expose private learner content to the
facilitator without permission.

Persona contracts are applied at the provider boundary after Bud Core has
established the permitted scope. They shape Qwen's response; they do not
replace Bud Core's decision logic or the application's authority checks.

### Local provider services

- **Whisper**: multilingual faster-whisper `small` speech-to-text service on
  port `8787`, using beam size 2 and configurable CPU threads by default. The
  browser segments talk turns with voice activity detection, skips silent
  chunks, and sends the selected native language as a language hint.
- **NLLB**: CTranslate2 translation service on port `8788` for English,
  Spanish, Simplified Chinese, Burmese, French, and Thai.
- **Qwen**: local `llama-cpp-python` text response service on port `8790`.
  The current hardware-constrained demo uses
  `Qwen3-1.7B.Q4_K_M.gguf` in non-thinking mode. The larger Qwen3-8B direction
  remains a future benchmarked upgrade.

Whisper and NLLB remain separate from Qwen because speech recognition,
translation, and reasoning have different performance and replacement needs.

Bud uses signal-driven rather than periodic learner intervention in the current
prototype. A yellow or red task self-report records an open private support
signal and may trigger one bounded private offer of clarification; a later
green response records that support as resolved. Quietness alone does not
trigger a learner-Bud check-in. When the facilitator view loads, the
application projects the latest aggregate comprehension report immediately;
this report is derived from participant-reported signals and does not expose
private Bud messages. Both behaviors remain subject to the same privacy and
uncertainty rules as manually requested support.

## Workshop Source Pack Architecture

The facilitator's approved workshop materials form a separate, workshop-scoped
Source Pack. The prototype accepts `.pptx`, `.pdf`, and `.docx`; Google Slides
enters through an explicit exported PDF/PPTX import rather than a Google
authorization flow. The ingestion boundary extracts text and preserves
slide/page/section locations. A later implementation may replace the local
extractor with a richer parser or retrieval index without changing Bud's
normalized evidence contract.

The application owns Source Pack lifecycle:

1. The facilitator uploads or imports materials into a draft version.
2. The application validates the file type, associates it with the workshop,
   and extracts/indexes permitted text.
3. The facilitator activates one version before or during the workshop.
4. Bud retrieves from the active version for shared grounding. During
   leader-private setup, Leader Bud may use draft uploaded material when no
   active version exists, but it must label the material as draft/not locked.
5. A replacement creates a new version; historical evidence keeps the prior
   version reference.

Source Pack content is shared workshop context, not private learner context.
Learner messages and private Bud conversations never become source material
automatically. Bud answers should carry source location references when
available and must use `WAIT`/`NO_ACTION` or ask for clarification when the
active materials do not support a workshop-specific answer.

The current prototype may begin with local extracted text and a simple
retrieval index. Production deployment would need durable object storage,
malware scanning, stronger document parsing, access controls, deletion and
retention policies, and an embedding or full-text retrieval strategy sized to
the workshop corpus.

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
- Workshop Source Packs use the `source-packs` volume and are mounted at
  `/app/data/source-packs` in the Bud container.

`make` is the default foreground launch command. `make up-d` runs in the
background; `make logs`, `make ps`, `make down`, and `make clean` manage the
stack.

## Persistent Contextual Memory Ledger

Bud maintains contextual awareness through a structured, room-scoped Markdown
memory ledger from the first workshop interaction. The ledger is not a raw chat
dump and not a replacement for authoritative runtime state. It is an auditable,
privacy-scoped retrieval layer that helps each Bud carry continuity without
rebuilding every answer from scattered runtime fragments.

The top-level ledger categories are created when the room is created:

- Ground Context: room identity, active/draft Source Pack, generated and locked
  learning plan, attendance roster, active participants, workshop stage, and
  current source versions.
- People Index: stable participant IDs, display names, role, guest/registered
  status, attendance state, public/group references, and private-scope pointers.
- Shared Workshop Chat: main-room messages and public/group summaries.
- Breakout Context: one section per `breakout-room-N`, including members,
  group-labelled messages, and unresolved group questions.
- Leader Bud Memory: facilitator-private exchanges, leader preferences, open
  operational follow-ups, and room-management notes.
- Learner Bud Memory: one privacy-isolated section per learner Bud. Raw learner
  private content remains retrievable only by that learner's Bud unless explicit
  permission creates a minimum-necessary projection.
- Open Questions / Unknowns: known missing evidence, unresolved references, and
  uncertainty that must not be converted into fact.
- Exclusions / Privacy Boundaries: content types that must not be logged,
  retrieved, or projected across scopes.

Every ledger entry must carry at least: timestamp, room ID, actor ID, display
name when known, source event ID, privacy scope, usable-by scope, category, and
staleness/version markers where relevant. Uploaded materials, learning plans,
attendance, chat, and Bud conversations are cross-referenced by identity rather
than merged into one undifferentiated context.

Qwen may assist with compacting and classifying new events into ledger buckets,
and may suggest a new category when an event does not fit existing buckets. The
application owns validation and writes: it checks privacy scope, category
allowlist, source references, and staleness before appending or updating the
ledger. Qwen-generated compactions are never authoritative facts by themselves.

Retrieval is category- and scope-based. For example, a lesson question retrieves
Ground Context; a question about Aisha retrieves the People Index plus public or
permitted Aisha-related evidence; a breakout question retrieves the matching
Breakout Context. The application should prefer active Source Pack and locked
learning-plan state over ledger memory when they conflict.

Bud's cognition loop is:

1. Initialize or load the room ledger from the template.
2. Retrieve only the permitted, relevant memory slice for the requesting Bud,
   person, room, group, and question.
3. Build the answer from the authority order: current runtime state; active
   Source Pack and locked learning plan; permitted ledger entries; then model
   reasoning bounded by uncertainty rules.
4. If the retrieved context does not contain the information, answer with a
   grounded fallback such as unknown, clarification, or a next-check suggestion
   instead of inventing workshop facts.
5. Compact the new interaction/event and append or update it under the correct
   scoped ledger section, including Open Questions / Unknowns when evidence was
   missing.

This is a retrieve -> reason -> answer -> compact/log loop. Bud must not replay
or inspect an entire raw chat transcript as its default memory strategy.

In the current prototype, application events create and retrieve the ledger
entries; Qwen consumes the permitted retrieval as context. Model-assisted
compaction/category suggestions remain a future enhancement and are not
treated as an authoritative write path.

## Technology Choices And Rationale

| Choice | Role | Rationale |
| --- | --- | --- |
| Node.js | Application server | Matches the existing runtime and LiveKit server SDK integration. |
| Browser HTML/CSS/JS | Demo clients | Keeps the prototype easy to run and inspect without adding frontend build complexity. |
| LiveKit | Real-time rooms and media | Provides native room control and avoids Zoom marketplace authorization and adapter risk. |
| faster-whisper | Local STT | Keeps workshop audio on the local server and avoids a remote transcription round trip. |
| NLLB + CTranslate2 | Translation | Provides a dedicated multilingual translation path with model data under local control. |
| Qwen3 local GGUF | Learner Bud and Leader Bud text replies | Avoids closed API latency, cost, and external data transfer in the demo. |
| Docker Compose | Deployment | Gives teammates one repeatable command and isolates the five runtime responsibilities. |
| Structured Markdown memory ledger | Prototype contextual memory | Keeps the demo inspectable while preserving permitted session context across turns; production should replace the file-backed ledger with a durable scoped memory service using the same categories, privacy keys, and retrieval rules. |

## Privacy And Authority Boundaries

- Learner Bud conversations are private by default.
- Leader Bud conversations are private to the facilitator.
- The facilitator receives minimum-necessary operational signals, not raw
  private learner content.
- Room-level rollups use participant-reported evidence and preserve `unknown`
  when no response exists.
- The model proposes decisions; application validation and human authority
  determine whether bounded actions occur.
- Raw audio is not written to the session log by the prototype.
- Camera and screen-share media are not recorded or written to the session log.
- Screen-share audio is optional, requires browser tab-audio selection, and remains separate from Bud's microphone transcription path.

## Prototype Constraints

- Demo authentication is intentionally omitted; participant-bound internal
  IDs and teacher-controlled allocation provide the bounded demo admission
  flow.
- Workshop state and permitted Bud conversation memory are persisted in the mounted local data volume for the demo. The memory is still prototype-grade: it is bounded recent retrieval, not a production memory system.
- The local stack is intended for the teacher-hosted prototype and LAN/demo
  operation, not production internet deployment.
- The `live-vid` media path requires browser permissions and, for reliable external-network use, HTTPS/WSS and TURN/network configuration.
- External deployment requires authentication, HTTPS/WSS, TURN/network
  configuration, durable persistence, tenant isolation, and a model-serving
  capacity plan.

## Future Evolution

### Efficient Bud memory

Future builds should replace the prototype Markdown ledger with a session-
scoped memory service: retain an append-only event log, maintain rolling
structured summaries for the Ground Context, People Index, shared chat,
breakout context, and each Bud-private scope, retrieve only relevant
source/chat/person evidence, and enforce room, participant, group, version, and
privacy keys at the storage layer. This will keep context useful over long
workshops while reducing token use and preventing memory from crossing
workshop sessions.

The architecture leaves room for a cloud-hosted Bud server, a durable state
store, stronger authentication, larger benchmarked local models, and an
external-platform adapter. These changes must preserve the normalized event
boundary, privacy projections, participant/facilitator authority, and the
ME / US / THE ROOM reasoning scopes.
