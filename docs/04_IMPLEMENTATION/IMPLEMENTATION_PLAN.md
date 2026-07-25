# IMPLEMENTATION_PLAN

## Status

Implementation-ready plan. Product meaning is locked; the critical runtime
gaps identified by the problem-statement alignment audit remain to be built.

## Objective

Build a native Bud AI workshop demonstration using LiveKit for real-time communication. Bud preserves shared meaning across ME, US, and THE ROOM while enforcing privacy and application-owned authority inside the platform the team controls.

## Source Of Truth

Implementation must follow:

- `docs/02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_STATE.md`
- `docs/03_CONTRACTS/STATE_MODEL_CONTRACT.md`
- `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md`
- `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md`
- `docs/03_CONTRACTS/TOOL_CONTRACT.md`

## MVP Scope

### Demo Identity Boundary

The prototype does not build login/password accounts. Teacher-issued
workshop links/codes, teacher approval, internal participant IDs, and
short-lived LiveKit tokens provide the bounded demo admission flow. This
keeps the timebox focused on proving Bud's workshop intelligence rather
than production authentication.

### Must Build

- Native multi-user LiveKit workshop runtime.
- Existing Bud scaffold evolved into the real workshop runtime.
- Learner and facilitator roles.
- At least two supported languages.
- Voice and text input surfaces.
- Utterance-level original -> translation -> interpretation pipeline.
- Bud AI Core receiving normalized events, not LiveKit objects.
- ME private participant support.
- Private "Help, I'm Stuck" learner action grounded in facilitator transcript/current workshop context.
- Private facilitator interaction through **Facil-Bud**, using the same local
  Qwen service while keeping facilitator messages facilitator-private.
- US peer meaning repair.
- THE ROOM facilitator synthesis and recommendations.
- Permission boundary for private participant-Bud content.
- WAIT / NO_ACTION behavior.
- Human correction of translation or interpretation.

### Locked Local Provider Direction

- Use the current CPU-compatible `Qwen3-1.7B.Q4_K_M` local model for the demo;
  retain the larger Qwen3-8B direction as a future benchmarked upgrade.
- Run Qwen in non-thinking mode for the low-latency prototype path.
- Use a separate Whisper-family provider for voice transcription.
- Keep STT, translation, and LLM behind the existing provider interfaces so the exact Whisper variant and routing can be benchmarked and replaced without changing Bud Core.

### May Simplify

- Persistence may be in-memory or lightweight local database.
- Provider adapters may begin as interface-compatible mock/development providers.
- Participant count may be constrained.
- Guaranteed languages may be constrained.
- Visual polish may be focused on demo-critical flows.

### Must Not Claim

- Production security or compliance.
- Zoom/Meet integration unless separately built and verified as a future adapter.
- Validated learner scoring.
- Dynamic intelligence if behavior is hard-coded to the demo path.
- Permission enforcement unless application logic actually blocks access.

## Architecture

```text
LiveKit workshop room
  -> LiveKit Adapter
  -> Normalized Events
  -> Bud AI Core
  -> AI Decision
  -> Application Validator
  -> Bounded Tools
  -> State Updates / UI Events

Browser voice/text clients
  -> same Normalized Events and Bud AI Core
```

## Deployment Evolution

### Prototype topology

- The workshop owner, who is also the teacher, launches the Bud AI server.
- Learners connect with browser clients to that teacher-hosted workshop instance.
- The server owns authoritative workshop state and keeps learner Bud interactions participant-scoped and private.
- This local teacher-hosted arrangement is the prototype assumption; it is not a production deployment claim.

### Future cloud option

Future builds may host the Bud AI server in the cloud so the teacher and learners connect to a shared remote workshop instance. This is an accepted future direction, not part of the current prototype lock. Before implementing it, define authentication and participant identity, workshop and room lifecycle, persistence and retention, network reachability, tenant isolation, and operational ownership. Cloud hosting must preserve the existing privacy boundary and ME / US / THE ROOM behavior.

## Future Existing-Platform Integration

The platform-independent event boundary preserves the option to add Zoom or another meeting-platform adapter later. This is not an MVP dependency or claim. Any future adapter must translate only permitted platform input into the same normalized events consumed by Bud AI Core and must be separately authorized and verified.

## Core Runtime Responsibilities

### Frontend

- Join workshop room.
- Show voice, transcript, text, translation, and Bud surfaces.
- Render learner private support.
- Render a learner "Help, I'm Stuck" action.
- Render peer meaning repair prompts.
- Render facilitator view state and recommendations.
- Capture corrections and permission responses.

### Backend

- Issue short-lived LiveKit room tokens after teacher approval.
- Receive and route LiveKit room, participant, voice, text, and reconnect events.
- Run provider adapters for STT, translation, and LLM.
- Own authoritative state.
- Validate AI decisions and tool calls.
- Emit normalized updates back to clients.

### Bud AI Core

- Interpret normalized events.
- Retrieve permitted state/context.
- Decide whether to WAIT, help, ask, propose meaning, signal, recommend, escalate, or request permission.
- Produce structured `AiDecision`.
- Never directly mutate authoritative state.

## Implementation Phases

### Phase 1 - Scaffold And Types

- Create web app and backend structure.
- Convert contracts into runtime types.
- Add schema validation.
- Add event/state/decision/tool fixtures.
- Add contract-level tests.

### Phase 2 - Local Workshop Loop

- Implement workshop creation and participant roles.
- Implement text events first.
- Implement normalized event ingestion.
- Implement in-memory state store.
- Implement context retrieval for facilitator instructions/current workshop evidence.
- Implement participation observation generation from recent shared workshop activity.
- Implement Bud Core deterministic development path for basic decisions.

### Phase 3 - ME / US / THE ROOM Flows

- ME: private check-in and support.
- ME: "Help, I'm Stuck" simplified explanation from permitted workshop context.
- ME: learner web surface with private Bud thread, Help button, private composer, and adaptive prompt controls.
- ME: adaptive private check-in for quieter participants based on generated observable low-interaction events, framed as an optional invitation.
- US: meaning gap proposal and peer confirmation.
- THE ROOM: facilitator signal and recommendation.
- Add correction and state revision behavior.

### Phase 4 - LiveKit Room And Media Runtime

- Create teacher-owned rooms and issue short-lived participant tokens.
- Let the facilitator create named rooms and allocate participant IDs to those
  rooms before learner access is issued.
- Map permitted LiveKit participant, voice, text, transcript, and room events into normalized events.
- Preserve participant identity, reconnect behavior, and privacy scope.
- Prove Bud behavior inside the native workshop.

### Phase 5 - Low-Latency Providers

- Add translation provider adapter.
- Add LLM provider adapter.
- Enforce structured decision output.
- Add fallback behavior for STT/translation/LLM failure.
- Benchmark local/open-source inference against the latency target.
- Reject or cancel stale sensemaking results.

### Phase 6 - Demo Hardening

- Keep the native workshop scaffold usable as a teacher-launched runtime.
- Add clear room join, reconnect, and failure states.
- Add seeded workshop setup without hard-coded intelligence.
- Add judge-varied scenario tests.
- Add README setup.
- Add demo script and limitations.

## Open Decisions

- App framework and package manager.
- Runtime validation library.
- STT provider.
- Translation provider.
- Qwen3-8B runtime and remaining provider routing.
- Persistence choice.
- LiveKit room and media lifecycle.
- Token issuance and reconnect behavior.
- Future Zoom adapter path, if reopened after the native workshop is stable.

## Recommended Default

Use the existing shared contracts, Node backend, provider interfaces, and platform-independent Bud Core. Build and validate the LiveKit workshop runtime first. Use Qwen3-8B locally as the default reasoning/text-translation model and a separate Whisper-family STT provider, subject to hardware and latency benchmarking.
