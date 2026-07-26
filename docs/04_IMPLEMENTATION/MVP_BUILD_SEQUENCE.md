# MVP_BUILD_SEQUENCE

## Status

Draft build sequence for Bud AI MVP.

## Principle

Build the intelligence path, then establish the native LiveKit workshop runtime before considering external-platform adapters.

## Contents

- [Principle](#principle)
- [Sequence](#sequence)
- [Suggested First Sprint](#suggested-first-sprint)

## Sequence

### 1. Contract Types

Deliver:

- TypeScript types for state, events, decisions, and tools.
- Runtime validation schemas.
- Fixtures for each major event and decision.

Proof:

- Invalid tool calls are rejected.
- Private raw content cannot pass to facilitator view without permission.
- WAIT / NO_ACTION validates as a real decision.

### 2. Text-First Workshop Loop

Deliver:

- Basic workshop session.
- Learner and facilitator roles.
- Text message ingestion.
- Normalized event log.
- In-memory state store.

Proof:

- Participant message becomes `participant_message`.
- Facilitator instruction becomes `facilitator_instruction`.
- Bud Core receives no platform-specific objects.

### 3. Bud Core MVP

Deliver:

- Context retrieval.
- Evidence index.
- Basic decision generation path.
- Application-side decision validator.
- Tool execution log.

Proof:

- Same scenario with varied wording produces context-dependent decisions.
- Missing evidence produces unknown or WAIT.
- Tool calls require evidence references.

### 4. ME Flow

Deliver:

- Private learner-Bud check-in.
- "Help, I'm Stuck" private learner action.
- Learner web surface for the private Bud thread, Help action, private response, and prompt dismissal.
- Simplified explanation grounded in facilitator transcript, current activity, or permitted shared context.
- Participation observer generates low-activity observations from recent shared workshop activity.
- Adaptive check-in privately invites a quieter participant to ask, clarify, keep listening, or contribute without diagnosing disengagement.
- Participant support message.
- Participant correction.
- ParticipantState revision.

Proof:

- Learner can receive help privately.
- Help response does not invent unrelated lesson material.
- Adaptive check-in is optional, private, and based only on generated observable participation patterns.
- Facilitator does not see raw private content.
- Correction revises dependent state.

### 5. US Flow

Deliver:

- Meaning gap detection.
- Proposed interpretation.
- Peer confirmation prompt.
- GroupState update.

Proof:

- Translation success does not automatically equal shared meaning.
- Humans can confirm, correct, or leave productive disagreement unresolved.

### 6. THE ROOM Flow

Deliver:

- FacilitatorViewState.
- Privacy-aware signals.
- Recommendations with evidence/confidence.
- Human decision owner displayed.

Proof:

- Facilitator sees operational signal without raw private content.
- Recommendation does not automatically perform facilitator decision.

### 7. LiveKit Room And Media Runtime

Deliver:

- Teacher-owned room creation and short-lived participant tokens.
- Facilitator room management and participant allocation; managed rooms reject
  unallocated learner tokens while open demo rooms remain available for
  rapid testing.
- LiveKit participant, voice/text/transcript, and room-event adapter.
- Normalized events with participant and privacy scopes.
- Bud behavior inside the native workshop.

Proof:

- Bud receives only permitted LiveKit input.
- LiveKit participant identity maps to the correct Bud context.
- The teacher sees minimum-necessary operational signals.
- The integration works with varied supported input.

### 8. Voice, Translation, And Low-Latency AI

Deliver:

- STT provider adapter.
- Utterance completion.
- Translation provider adapter.
- LLM provider adapter.
- Structured `AiDecision` output.
- JSON validation and rejection path.
- Local/open-source model benchmark.
- Fallback behavior.

Proof:

- Malformed model output is rejected.
- Low confidence can produce ASK_CLARIFY or WAIT.
- Privacy violations are blocked by application validation.

### 9. Room Failure And Recovery

Deliver:

- Keep the native Bud workshop runnable.
- Add teacher-led reconnect and room-recovery behavior.
- Preserve the approved WorkshopModel and permitted state during recoverable reconnects.

Proof:

- Reconnect does not expose private Bud content or cross participant boundaries.
- Room recovery does not silently create a new workshop identity.

### 10. Demo Hardening

Deliver:

- Demo scenario setup.
- README.
- Test script.
- Limitations section.

Proof:

- A judge can vary participant wording and still see evidence-linked reasoning.
- The app does not claim external-platform integration until a future adapter is implemented and verified.
- The build starts reproducibly from documented commands.

### 10. Future Deployment Note

The prototype assumes that the workshop owner/teacher launches the Bud AI server and learners connect through browser clients. A later build may move that server into the cloud so teacher and learner clients connect remotely. Treat cloud hosting as a future deployment path until identity, room lifecycle, persistence, privacy, and operational ownership are specified.

## Suggested First Sprint

Build through step 6 with text-first mocked provider adapters. Then add LiveKit voice and real providers once the Bud intelligence loop is stable.
