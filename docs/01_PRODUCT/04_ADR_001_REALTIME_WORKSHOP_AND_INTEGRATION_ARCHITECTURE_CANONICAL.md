# ADR-001 — Real-Time Workshop and Integration Architecture

**Status:** Accepted for Hackathon Prototype — Canonical reconstructed edition

## Contents

- [Decision](#decision)
- [Why](#why)
- [Alternatives](#alternatives)
- [Layers](#layers)
- [Voice and Language Pipeline](#voicelanguage-pipeline)
- [Authority](#authority)
- [Privacy](#privacy)
- [Future Production Direction](#future-production-direction)

## Decision

Build a **platform-independent AI Partner Core** and prove it first through a **lightweight standalone multi-user workshop web application using LiveKit for real-time communications**.

Communication environments connect to the core through a **normalized event boundary**.

A **Zoom adapter** is secondary to the stable standalone/core experience. Google Meet remains a future adapter rather than a primary hackathon dependency.

```text
LiveKit Workshop ─┐
Zoom Adapter ─────┼──> Normalized Events ──> AI Partner Core ──> Bounded Actions/UI
Future Meet ──────┘
```

> **The product is the intelligence layer, not the meeting platform.**

## Why

The product must support genuine voice/text interaction, participant attribution, preserved original-language evidence, meaningful translation, structured context/state, bounded AI actions, application-controlled permissions, and independence from a single meeting vendor.

### Bud context assembly

The application server is the context boundary for every Bud. Leader Bud
receives a room-scoped context assembled from the active Workshop Source Pack,
the Leader-edited learning plan after publication, the current workshop
instruction, recent public and group-shared messages from the main room and
breakout groups, and current public/group operational evidence. Private
learner-Bud messages are excluded. Learner Bud receives its own private
history plus the public/shared context permitted for its current room or
group. The server performs this filtering and assembly; the language model
does not choose which private data it may see. Permitted Bud conversation
memory and shared workshop state are persisted in the local workshop data
volume, so a container restart does not erase the Bud's accumulated context.
Breakout assignments are room state and shared messages carry their
`breakout-room-N` group identity, allowing Leader Bud to summarize a selected
group without receiving private learner-Bud conversations.
When a source is absent, Bud must say it does not know rather than fill the
gap with general assumptions.

## Alternatives

### Google Meet primary runtime
Familiar and strategically valuable, but integration/access constraints increase hackathon reproducibility risk. Future adapter.

### Zoom primary runtime
Strong adoption and integration story, but vendor-specific setup/credentials/permissions increase prototype dependency. Secondary adapter after core stability.

### Build WebRTC ourselves
Rejected. Conferencing infrastructure is solved complexity and not the innovation.

### LiveKit standalone
Selected to provide genuine browser-based real-time communication while retaining control of AI-native UX and avoiding low-level conferencing work.

## Layers

### AI Partner Core
Responsible for workshop context, participant/group/workshop state reasoning, semantic evaluation, meaning interpretation, intervention selection, facilitator recommendations, privacy/authority-aware decisions, and bounded tool selection.

### Normalized Events
Platform-independent descriptions such as:

```text
participant_joined
participant_utterance
participant_message
facilitator_instruction
peer_message
ai_partner_request
permission_request
permission_response
workshop_state_request
```

Exact contracts remain downstream.

### LiveKit standalone workshop
Primary reproducible hackathon runtime supporting bounded multi-user voice/text and AI surfaces.

### Zoom adapter
Secondary integration target mapping Zoom events into the same normalized event model without rewriting core intelligence.

## Voice/language pipeline

> **Listen continuously. Translate complete thoughts. Reason when meaning warrants it.**

```text
Speech
  ↓
Streaming multilingual STT
  ↓
Original transcript accumulation
  ↓
Meaningful utterance completion
  ↓
Original preserved
  ├── contextual translation when required
  └── semantic AI evaluation when warranted
```

Distinguish transcription latency, translation latency, and AI-reasoning latency.

Preserve:
- original;
- translation;
- interpretation.

## Authority

> **The model reasons, but the application owns state, permissions, and allowed actions.**

The model is not the sole database, permission system, or authority layer.

## Bounded agency

Conceptual tools may include:

```text
update_participant_state(...)
send_private_checkin(...)
send_support_message(...)
propose_meaning_interpretation(...)
request_peer_confirmation(...)
create_facilitator_signal(...)
recommend_facilitator_action(...)
request_private_access(...)
```

Exact contracts are downstream.

## Privacy

Recognize public/shared, group/shared, and private participant–AI spaces.

Facilitators receive minimum-necessary operational signals rather than unrestricted private content.

## Build priority

1. AI Partner Core + normalized event contracts.
2. LiveKit standalone multi-user workshop.
3. Multilingual STT → utterance completion → contextual translation.
4. ME → US → THE ROOM intelligent behaviors.
5. Privacy/permission boundary.
6. Zoom adapter only if priorities 1–5 are stable.
7. Polish, evaluation, README, demo.

## Future production direction

Potential evolution:

```text
Multiple environments
        ↓
Event ingestion/routing
        ↓
Privacy-aware context router
        ↓
Specialized learner/facilitator/group workflows
        ↓
Durable state/memory
        ↓
Governed tool execution
        ↓
Observability/audit/evaluation
```

Future options may include specialized agents/workflows, model routing, hosted/local inference, richer multimodality, scalable concurrency, and additional platform/LMS adapters.

These are directions, not prototype claims.

## Decision seal

> **Build the intelligence once. Let environments become adapters.**

> **Preserve information upstream. Interpret downstream.**
