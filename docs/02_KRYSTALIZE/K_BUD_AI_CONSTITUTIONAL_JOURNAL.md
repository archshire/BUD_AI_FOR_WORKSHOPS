# K_BUD_AI_CONSTITUTIONAL_JOURNAL

## Table of Contents

- [Document Metadata](#document-metadata)
- [Initial Intent](#initial-intent)
- [Clarification Sessions](#clarification-sessions)
- [Clarification Rationale Tracking](#clarification-rationale-tracking)
- [Warning Events](#warning-events)
- [Reset Events](#reset-events)
- [Intent Drift Events](#intent-drift-events)
- [Resolution Rationale](#resolution-rationale)
- [Deferred Issues](#deferred-issues)
- [Reopened Topics](#reopened-topics)
- [Governance Notes](#governance-notes)
- [Major Constitutional Shifts](#major-constitutional-shifts)
- [Traceability Index](#traceability-index)

## Document Metadata

```yaml
artifact_type: constitutional_journal
protocol: KRYSTALIZE
protocol_version: 1
session_id: KRYS-bud-ai-001
project_name: Bud AI
short_name: Bud
created_at: 2026-07-25
updated_at: 2026-07-25
status: draft
```

## Initial Intent

### Initial Statement

Bud AI is a real-time multilingual workshop partner that helps learners and facilitators maintain shared meaning across language differences in online or hybrid learning environments.

### Initial Context

The source documents originally use "AI Partner" as the project term. On 2026-07-25, the human clarified that the AI should be named "Bud AI" and referred to in short form as "Bud". The constitutional artifacts generated after that clarification use the Bud AI naming convention while preserving traceability to earlier AI Partner source documents.

## Clarification Sessions

Each session should preserve what was clarified, what remained unresolved, and what changed.

### Session CJ-001

```yaml
session_id: CJ-001
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: constitutional naming and artifact initialization
```

#### Clarification Target

Clarify the project AI name and determine the constitutional artifact filenames to be updated/generated.

#### Ambiguity Severity

Tier 4 - Cosmetic / Low-risk.

The naming change does not alter the core doctrine, architecture, privacy model, or implementation obligations. It still matters for traceability and downstream consistency.

#### Prioritization Rationale

This clarification was prioritized because the human directly named the AI before contract generation or implementation began. Recording the naming decision now prevents future artifact drift between product identity and implementation documentation.

#### Traversal Layer

WHY -> HOW -> WHAT.

The WHY is the product identity: the AI has a human-facing name, Bud AI. The HOW is traceability preservation from existing AI Partner source docs. The WHAT is the concrete filename convention `K_BUD_AI...`.

#### Questions Asked

##### Active Clarification Question

No additional question was required for the naming decision. The human instruction was explicit enough to lock the artifact naming convention.

##### Adjacent Branches Tracked Internally

- Whether existing canonical files should be renamed from AI Partner to Bud AI.
- Whether product-facing UI copy should prefer "Bud" or "Bud AI".
- Whether implementation package/module names should use `bud-ai`, `bud_ai`, or another convention.

##### Blocked Questions

- Provider/model choices remain blocked pending contract and implementation planning.
- Exact state/event/decision/tool schemas remain blocked pending contract generation.

#### Human Responses

- "For now, I will name the AI - Bud AI and for short form I will call it Bud."
- "Rename the constituion docs where you will be updatin to be K_BUD_AI..."

#### Locked Outcomes

- The AI is named "Bud AI".
- The short form is "Bud".
- KRYSTALIZE constitutional artifact filenames for this project use the prefix `K_BUD_AI`.
- Existing source terminology "AI Partner" remains traceable canonical lineage unless a full rename pass is explicitly requested.

#### Remaining Unresolved Issues

- The four downstream implementation contracts remain ungenerated.
- Provider/model choices remain unresolved.
- Zoom final-scope inclusion remains conditional.
- UI visual system and fallback behavior remain unresolved.

#### Accepted Uncertainty

- Legacy source documents may continue to say "AI Partner" while generated constitutional artifacts use "Bud AI".

#### Conversational Reflection Summary

The project identity now has a clearer product name without changing the underlying doctrine. Bud AI inherits the established AI Partner thesis: translation is only one part of shared meaning, and the system must protect privacy while helping individuals, groups, and facilitators continue working together.

### Session CJ-002

```yaml
session_id: CJ-002
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: downstream implementation contract generation
```

#### Clarification Target

Generate the implementation contracts required before building Bud AI source code.

#### Ambiguity Severity

Tier 3 - Implementation destabilizing.

The missing contracts blocked deterministic implementation, adapter boundaries, validation, privacy enforcement, and meaningful tests.

#### Prioritization Rationale

This step was prioritized because the canonical handoff requires semantic stabilization before implementation, and the consistency report names state, event, decision, and tool contracts as the immediate downstream artifacts.

#### Traversal Layer

HOW -> WHAT.

The WHY was already stable: Bud exists to preserve shared meaning beyond translation. This session clarified HOW state, events, decisions, and tools should relate, then produced WHAT-level Markdown contracts.

#### Questions Asked

##### Active Clarification Question

No new human question was required. The human said "ok let's continue", which was treated as implicit authorization to generate the next documented artifacts.

##### Adjacent Branches Tracked Internally

- Provider/model selection remains unresolved.
- Exact frontend visual system remains unresolved.
- Zoom inclusion remains conditional after LiveKit-first core stability.

##### Blocked Questions

- Runtime provider choices are blocked until implementation planning or benchmarking.
- Persistence choice is blocked until MVP repo architecture is selected.

#### Human Responses

- "ok let's continue"

#### Locked Outcomes

- `docs/03_CONTRACTS/STATE_MODEL_CONTRACT.md` was generated.
- `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md` was generated.
- `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md` was generated.
- `docs/03_CONTRACTS/TOOL_CONTRACT.md` was generated.
- The contracts preserve application-owned state, permissions, and tool execution.
- Provider/model choices remain open and configurable.

#### Remaining Unresolved Issues

- STT provider/model.
- Translation provider/model and prompting strategy.
- LLM provider/routing abstraction.
- Turn completion thresholds.
- Persistence/database.
- UI visual system and fallback UX.
- Whether Zoom enters final hackathon scope.

#### Accepted Uncertainty

- Provider-specific details may remain unresolved while implementation scaffolding begins, as long as interfaces make the unresolved choice explicit.

#### Conversational Reflection Summary

Bud now has enough contract structure to move from constitutional clarification into implementation planning. The contracts preserve the core doctrine: Bud observes permitted events, preserves original evidence, interprets cautiously, proposes bounded decisions, and lets the application enforce state, permissions, and actions.

### Session CJ-003

```yaml
session_id: CJ-003
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: implementation documentation bridge
```

#### Clarification Target

Create implementation-facing documentation that bridges Bud AI doctrine and contracts into build work.

#### Ambiguity Severity

Tier 3 - Implementation destabilizing.

Implementation needed a concrete plan, repo layout, build sequence, provider abstraction plan, and test/demo proof plan before source scaffolding.

#### Prioritization Rationale

This step was prioritized because the human asked to continue the docs, and implementation should begin from a shared map rather than from unanchored package choices.

#### Traversal Layer

HOW -> WHAT.

The HOW is the planned build structure and provider abstraction. The WHAT is the created documentation set in `/docs/04_IMPLEMENTATION/`.

#### Questions Asked

##### Active Clarification Question

No new human clarification was required. Existing doctrine and contracts were sufficient for documentation.

##### Adjacent Branches Tracked Internally

- Source scaffold creation.
- Package manager and framework choice.
- Real provider installation and credentials.
- LiveKit dependency installation.

##### Blocked Questions

- Exact STT, translation, and LLM providers remain blocked pending implementation planning or user preference.
- Exact persistence choice remains blocked pending source scaffold.

#### Human Responses

- "ok do it"

#### Locked Outcomes

- `docs/04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md` was generated.
- `docs/04_IMPLEMENTATION/REPO_STRUCTURE.md` was generated.
- `docs/04_IMPLEMENTATION/MVP_BUILD_SEQUENCE.md` was generated.
- `docs/04_IMPLEMENTATION/PROVIDER_ABSTRACTION_PLAN.md` was generated.
- `docs/05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md` was generated.

#### Remaining Unresolved Issues

- Runtime stack confirmation.
- Provider choices.
- Persistence choice.
- UI visual system.
- Real LiveKit installation/token setup.

#### Accepted Uncertainty

- Documentation recommends a TypeScript full-stack structure with React, Node, Zod, and LiveKit, but this remains an implementation recommendation rather than a constitutional lock.

#### Conversational Reflection Summary

Bud now has a practical bridge from constitution to code. The next move can be source scaffolding: shared types first, then a text-first workshop loop, then ME/US/THE ROOM behavior, then LiveKit voice and real providers.

### Session CJ-004

```yaml
session_id: CJ-004
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: executable source scaffold
```

#### Clarification Target

Create the initial executable Bud AI scaffold from the implementation docs.

#### Ambiguity Severity

Tier 3 - Implementation destabilizing.

The project needed a runnable core loop before LiveKit or provider integration.

#### Prioritization Rationale

This step was prioritized because the human asked to create the scaffold. Local tooling showed Node 12 and no TypeScript compiler, so the first scaffold was made dependency-free to verify behavior immediately.

#### Traversal Layer

WHAT.

The WHY and HOW were already stabilized by the constitutional state, contracts, and implementation docs. This session created concrete source files.

#### Questions Asked

##### Active Clarification Question

No new human clarification was required.

##### Adjacent Branches Tracked Internally

- TypeScript/Zod upgrade.
- React frontend scaffold.
- LiveKit dependency installation.
- Real provider wiring.

##### Blocked Questions

- Real STT/translation/LLM provider choices remain blocked pending implementation preference or benchmarking.

#### Human Responses

- "ok do that"

#### Locked Outcomes

- `bud-ai/` scaffold was created.
- The scaffold is dependency-free and works on local Node 12.
- The text-first core loop runs.
- Demo and tests pass.

#### Remaining Unresolved Issues

- TypeScript compiler and Zod installation.
- Browser UI implementation.
- LiveKit installation and token flow.
- Real STT, translation, and LLM providers.
- Durable persistence.

#### Accepted Uncertainty

- The first scaffold uses CommonJS JavaScript rather than TypeScript because the local environment does not currently have TypeScript installed.

#### Conversational Reflection Summary

Bud now exists as a small executable system, not only as docs. It can ingest normalized text events, decide across ME, US, and THE ROOM, validate decisions/tools, enforce privacy at the application boundary, and update in-memory state.

### Session CJ-005

```yaml
session_id: CJ-005
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: Help, I'm Stuck feature addition
```

#### Clarification Target

Evaluate and add the teammate-recommended **Help, I'm Stuck** feature.

#### Ambiguity Severity

Tier 3 - Implementation destabilizing.

The feature is philosophically aligned with Bud, but its grounding requirement depends on transcript/current-context retrieval that is not yet fully implemented.

#### Prioritization Rationale

This feature was prioritized because it directly strengthens the ME layer and demonstrates Bud's thesis: translation alone is insufficient; learners need contextual meaning support.

#### Traversal Layer

WHY -> HOW -> WHAT.

The WHY is private learner understanding support. The HOW is a ME-layer request grounded in facilitator transcript/current context. The WHAT is contract/doc/scaffold support for `help_stuck`.

#### Questions Asked

##### Active Clarification Question

No new human clarification was required. The human explicitly approved adding the feature.

##### Adjacent Branches Tracked Internally

- Lesson transcript retrieval.
- UI button placement.
- Grounded explanation generation by LLM provider.
- Optional facilitator operational signal when repeated help requests occur.

##### Blocked Questions

- Exact transcript retrieval mechanism remains blocked pending provider/state work.
- Exact UI design remains blocked pending frontend implementation.

#### Human Responses

- "ok then add it and update the relevant docs"

#### Locked Outcomes

- Bud includes a private **Help, I'm Stuck** learner action.
- The feature belongs to ME by default.
- It must ground explanations in facilitator transcript, current workshop activity, or permitted shared context.
- It must not invent unrelated lesson content.
- It must not expose raw private learner confusion to facilitators without permission.

#### Remaining Unresolved Issues

- Real transcript/current-context retrieval.
- Real LLM-grounded explanation generation.
- Frontend control design.
- Whether repeated private help requests should produce a minimum-necessary facilitator signal.

#### Accepted Uncertainty

- This session initially accepted placeholder context-grounded behavior as scaffold-only. CJ-007 superseded that scaffold state by adding stored context retrieval; full provider-grounded behavior still depends on live transcript/current-activity ingestion.

#### Conversational Reflection Summary

Help, I'm Stuck is a good Bud feature because it makes private confusion actionable without shame or surveillance. It gives the learner a direct way to ask for context-aware support while keeping disclosure under learner/application control.

### Session CJ-006

```yaml
session_id: CJ-006
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: Adaptive Check-in feature addition
```

#### Clarification Target

Evaluate and add the teammate-recommended **Adaptive Check-in for quieter participants** feature.

#### Ambiguity Severity

Tier 3 - Implementation destabilizing.

The feature is aligned with Bud's ME-layer support doctrine. CJ-008 later added scaffold observation generation, while fully production periodic behavior still depends on LiveKit adapter or frontend scheduler wiring.

#### Prioritization Rationale

This feature was prioritized because it strengthens inclusion while preserving agency. It gives quiet participants a private, low-pressure way to ask, clarify, keep listening, or contribute without forcing them into public disclosure.

#### Traversal Layer

WHY -> HOW -> WHAT.

The WHY is inclusion without surveillance. The HOW is an optional ME-layer check-in grounded only in observable activity patterns. The WHAT is contract/doc/scaffold support for `participation_observation` and adaptive private check-ins.

#### Questions Asked

##### Active Clarification Question

No new human clarification was required. The human explicitly approved adding adaptive check-in.

##### Adjacent Branches Tracked Internally

- Live participation analytics window.
- Check-in cooldown and anti-nag behavior.
- UI affordance for dismissing or responding privately.
- Facilitator-visible aggregate participation patterns without raw private content.

##### Blocked Questions

- Exact production scheduler wiring remains blocked pending LiveKit/frontend implementation.
- Exact cooldown duration may be refined during user testing.

#### Human Responses

- "yes ok add adaptive check in"

#### Locked Outcomes

- Bud includes adaptive private check-ins for quieter participants.
- Low observable activity may trigger an optional private invitation.
- Bud must not infer disengagement, confusion, motivation, or personality from quietness alone.
- The participant owns whether to ignore, dismiss, respond privately, ask for clarification, or contribute.
- Raw private responses remain private unless permission allows disclosure.

#### Remaining Unresolved Issues

- LiveKit/frontend scheduler wiring for periodic participation observation.
- UI control for adaptive prompt response/dismissal.
- Production cooldown and fatigue policy.

#### Accepted Uncertainty

- CJ-008 supersedes the manual-only scaffold state by adding stored-evidence observation generation. Full production periodic detection still depends on adapter/frontend scheduling and richer activity streams.

#### Conversational Reflection Summary

Adaptive Check-in fits Bud because it treats quietness with humility. Bud does not decide what silence means; it simply opens a private door and lets the learner choose whether to walk through it.

### Session CJ-007

```yaml
session_id: CJ-007
krystalize_session_id: KRYS-bud-ai-001
date: 2026-07-25
participants:
  - human project owner
  - Codex using KRYSTALIZE
scope: Help, I'm Stuck context retrieval scaffold
```

#### Clarification Target

Implement the next recommended step: retrieve permitted workshop context for **Help, I'm Stuck** instead of using a placeholder explanation.

#### Ambiguity Severity

Tier 3 - Implementation destabilizing.

The scaffold can now resolve stored context evidence, but production transcript/current-activity ingestion still depends on LiveKit/provider/frontend wiring.

#### Prioritization Rationale

This step was prioritized because grounded support is central to the Help, I'm Stuck promise. Bud must explain from facilitator/current workshop context or ask for clarification instead of inventing lesson material.

#### Traversal Layer

HOW -> WHAT.

The WHY was already locked: private learner support without surveillance. The HOW is context resolution from evidence refs and recent permitted workshop evidence. The WHAT is a context resolver module, guarded tool execution, fixtures, and tests.

#### Human Responses

- "ok do that"

#### Locked Outcomes

- The scaffold includes a context resolver for stored facilitator/current workshop evidence.
- Help, I'm Stuck explanations now use resolved source context refs.
- Missing context produces a private clarification prompt rather than invented content.
- Tool execution rejects Help, I'm Stuck explanations that reference missing source context.

#### Remaining Unresolved Issues

- Live transcript/current-activity ingestion from real providers.
- Richer LLM-based simplification over retrieved context.
- UI display of source context and uncertainty.

#### Accepted Uncertainty

- The current explanation builder is deterministic and scaffold-level. It is acceptable for proof of grounding, but real provider-based simplification remains future work.

#### Conversational Reflection Summary

This makes Bud more honest. When Bud has context, it helps from that context. When it does not, it asks privately instead of filling the gap with confident-sounding invention.

### Session CJ-008

```yaml
session_id: CJ-008
date: 2026-07-25
trigger: Human approved implementing the adaptive participation observation generator.
scope: Adaptive check-in observation generation scaffold
authority: human proceed instruction
```

#### Intent

Move adaptive check-in from manually supplied `participation_observation` fixtures toward application-generated observations.

#### KRYSTALIZE Classification

- Tier 3 implementation dependency.
- WHY: inclusion without surveillance.
- HOW: generate only low-observable-activity evidence from recent shared workshop activity, then keep the actual intervention private and optional.
- WHAT: add a scaffold observer and runtime entrypoint that produce validated `participation_observation` events.

#### Locked Outcomes

- Added `bud-ai/apps/server/src/observation/participation-observer.js`.
- Added `runtime.observeParticipation(...)`.
- The observer requires recent shared workshop activity before marking a learner as low observable.
- Active learners are skipped.
- Recent adaptive check-ins are skipped through cooldown.
- Empty-room silence does not trigger a check-in.
- Observation events are routed through the existing Bud Core decision path and tool validator.

#### Warning / Dependency Update

`[WARNING :: UNRESOLVED_DEPENDENCY]`

Adaptive check-in still depends on LiveKit/frontend scheduler wiring and richer activity streams for production periodic behavior. The scaffold can generate observations from stored shared evidence, but must not claim full production LiveKit-driven analytics yet.

#### Verification

- `npm test` passed.
- Prior demo smoke run passed; observer-specific behavior is covered by tests.

#### Conversational Reflection Summary

This is the right shape for Bud: quietness becomes a reason to gently open a private option, not a reason to label the learner.

### Session CJ-009

```yaml
session_id: CJ-009
date: 2026-07-25
trigger: Human instructed Codex to continue after learner UI was identified as the next step.
scope: Learner UI surface and local API scaffold
authority: human proceed instruction
```

#### Intent

Give Bud's ME-layer behaviors an actual learner-facing surface before LiveKit integration.

#### KRYSTALIZE Classification

- Tier 3 implementation dependency.
- WHY: the learner must be able to privately ask for help and receive agency-preserving support.
- HOW: dependency-free local web UI backed by the existing Bud runtime and tool validators.
- WHAT: static learner interface, local HTTP API, and API smoke test.

#### Locked Outcomes

- Added learner UI files under `bud-ai/apps/web/src/app/`.
- Added local HTTP API in `bud-ai/apps/server/src/index.js`.
- The UI shows current workshop prompt, private Bud thread, Help button, private message composer, adaptive scan control, and status fields.
- Help, I'm Stuck flows through the real context resolver and private tool path.
- Adaptive scan flows through `runtime.observeParticipation(...)`.
- Private messages are filtered to the learner's own thread.

#### Remaining Unresolved Issues

- LiveKit room/token and real participant identity mapping.
- Production scheduler for adaptive observation scans.
- Final visual system and richer fallback UX.
- Multi-learner browser session handling.

#### Verification

- `npm test` passed with local HTTP API smoke coverage.
- `npm run demo` passed.
- `curl -s http://127.0.0.1:3001/api/state` returned seeded workshop state.
- `curl -s http://127.0.0.1:3001/` returned the learner HTML.

#### Conversational Reflection Summary

Bud now has a visible place to meet the learner privately. It is still scaffold-simple, but the important loop is alive: ask, receive help, respond, and keep privacy boundaries intact.

### Session CJ-010

```yaml
session_id: CJ-010
date: 2026-07-25
trigger: Human requested a future-build note for cloud hosting.
scope: Deployment topology distinction between the teacher-hosted prototype and a possible cloud-hosted future build.
authority: human clarification
```

#### Intent

Preserve the possibility that a later Bud AI build is hosted in the cloud, while keeping the current prototype assumption explicit: the workshop owner/teacher launches the server and learner browser clients connect to it.

#### KRYSTALIZE Classification

- Tier 2 structural dependency.
- WHY: the future deployment should remain available without silently changing who owns or starts the prototype workshop.
- HOW: record local teacher hosting as a locked prototype truth and cloud hosting as accepted future uncertainty.
- WHAT: update the constitutional state and implementation planning docs with the deployment evolution note.

#### Locked Outcomes

- The prototype topology is teacher-hosted: the workshop owner/teacher launches the Bud AI server and learners connect through browser clients.
- Future builds may host the Bud AI server in the cloud so teachers and learners connect to a shared remote workshop instance.
- Cloud hosting is not currently claimed as implemented.
- Any future cloud deployment must preserve participant-scoped privacy and ME / US / THE ROOM behavior.

#### Warning

`[WARNING :: UNRESOLVED_DEPENDENCY]`

Future cloud hosting still depends on decisions about authentication, participant identity, workshop and room lifecycle, persistence and retention, network reachability, tenant isolation, and operational ownership. Those decisions must be clarified before cloud deployment work begins.

#### Conversational Reflection Summary

The architecture now has a clear evolution path: one teacher-owned server for the prototype, with cloud hosting held open as a later deployment option rather than an accidental present requirement.

### Session CJ-011

```yaml
session_id: CJ-011
date: 2026-07-25
trigger: Human requested a status check and explicit documentation of areas requiring KRYSTALIZE before further building.
scope: Clarification frontier for workshop lifecycle, learner identity, Bud activation, privacy, real-time integration, and deployment.
authority: human clarification
```

#### Intent

Make the boundary between PRD-defined product intent and under-specified system behavior explicit before the project continues into deeper implementation.

#### KRYSTALIZE Classification

- Tier 2 structural clarification frontier with Tier 3 implementation branches.
- WHY: Bud's purpose and core behavior are sufficiently clear, but the workshop lifecycle and authority model need shared meaning before the multi-client system is built.
- HOW: create a prioritized clarification register rather than filling gaps with engineering assumptions.
- WHAT: record fourteen clarification gates in the constitutional state and set learner lifecycle as the first active question.

#### Clarification Gates Recorded

- Workshop lifecycle and authority.
- Learner joining and identity.
- Private Bud activation lifecycle.
- Prototype network topology.
- LiveKit room and media lifecycle.
- Privacy, consent, and visibility.
- Teacher controls and intervention boundaries.
- Multi-learner isolation and concurrency.
- Adaptive Check-in policy.
- Help, I'm Stuck grounding.
- Data retention and session records.
- Failure and recovery behavior.
- Future cloud deployment boundary.
- Provider and model choices.

#### Warning

`[WARNING :: AMBIGUITY]`

The PRD is sufficient for product intent and feature direction, but not yet sufficient to define the complete workshop lifecycle, identity boundary, private Bud activation, or deployment behavior. Further implementation must not silently resolve these areas.

#### Current Clarification Frontier

The first question is: how should the learner lifecycle work from workshop join through private Bud activation and workshop exit? This question is intentionally ahead of LiveKit wiring and provider selection because it stabilizes the system's authority and privacy boundaries.

### Session CJ-012

```yaml
session_id: CJ-012
date: 2026-07-25
trigger: Human approved aiming to demonstrate Bud integration with an existing platform.
scope: Zoom as the first existing-platform integration target.
authority: human clarification
```

#### Intent

Show that Bud's intelligence layer can work with an existing meeting platform, not only with the standalone LiveKit workshop. Zoom is the first target for that demonstration.

#### KRYSTALIZE Classification

- Tier 2 structural dependency.
- WHY: platform integration demonstrates that Bud is reusable intelligence rather than a meeting-platform lock-in.
- HOW: connect Zoom through an adapter that maps permitted Zoom input into Bud's normalized event model.
- WHAT: define a Zoom integration proof target while leaving the exact live capture path unresolved.

#### Locked Outcomes

- Zoom is now an explicit integration target, while LiveKit remains the primary standalone prototype path.
- Zoom integration must preserve the platform-independent Bud AI Core and normalized event boundary.
- The project must not claim live Zoom AI assistance until the selected capture and authorization path is implemented and verified.

#### Warning

`[WARNING :: UNRESOLVED_DEPENDENCY]`

The Zoom goal still depends on choosing the proof mode, SDK/API path, authorization model, participant identity mapping, privacy/consent boundary, and live versus post-meeting evidence flow.

#### Current Clarification Frontier

The next Zoom-specific question is: what must the first demonstration prove: Zoom participant/event integration, live audio/text capture, embedded Zoom participation, or post-meeting transcript ingestion?

### Session CJ-013

```yaml
session_id: CJ-013
date: 2026-07-25
trigger: Human identified clarification ordering as an important lesson from prior KRYSTALIZE usage.
scope: Process rule requiring dependency-based prioritization before a substantial clarification pass.
authority: human clarification
```

#### Intent

Prevent avoidable rewrites across constitutional, contract, implementation, and integration documentation by ranking clarification topics before resolving them.

#### KRYSTALIZE Classification

- Tier 2 process dependency.
- WHY: clarification order determines whether later decisions are built on stable authority, lifecycle, identity, privacy, and context meaning.
- HOW: rank unresolved areas by dependency and severity before beginning the next clarification branch.
- WHAT: add `COR-001` as a standing clarification ordering rule.

#### Locked Process Outcome

- Before a substantial clarification pass, identify and rank the unresolved areas.
- Clarify higher-order authority and dependency decisions before provider, platform, UI, or feature-specific decisions.
- Re-rank the frontier when new implementation evidence exposes a more fundamental ambiguity.
- Treat cross-document rewrite risk as a reason to revisit ordering, not as a reason to silently rewrite earlier meaning.

#### Conversational Reflection Summary

The human recognized an important discipline: KRYSTALIZE should not only clarify meaning; it should clarify the order in which meaning is clarified. That ordering protects the project from solving downstream questions before upstream decisions are stable.

### Session CJ-014

```yaml
session_id: CJ-014
date: 2026-07-25
trigger: Human requested a complete fresh review and dependency-ordered list of all future KRYSTALIZE work.
scope: Reconcile the full clarification frontier across source docs, contracts, implementation plans, and current constitutional artifacts.
authority: human clarification
```

#### Intent

Produce one authoritative order for future clarification so upstream decisions are stabilized before dependent documentation, contracts, implementation, platform, or acceptance decisions are finalized.

#### KRYSTALIZE Classification

- Tier 2 structural clarification and process dependency.
- WHY: Bud's WorkshopModel, authority, privacy, and evidence meaning must remain coherent across ME, US, THE ROOM, and future integrations.
- HOW: inspect all current docs and contracts, identify missing clarification gates, remove duplicates, and rank by dependency impact.
- WHAT: extend the register from 15 to 24 gates and make CG-016 the active frontier.

#### Newly Formalized Gates

- WorkshopModel authoring and approval.
- WorkshopModel versioning and change semantics.
- Evidence and confidence semantics.
- Correction, disagreement, and revision workflow.
- Facilitator signal vocabulary and thresholds.
- Language configuration and change behavior.
- Group and breakout semantics.
- Intervention arbitration and escalation.
- Acceptance and demonstration proof.

#### Locked Process Outcome

The future KRYSTALIZE queue is dependency-ordered. The first clarification is the WorkshopModel authority/approval question, followed by WorkshopModel versioning, workshop/learner lifecycle, privacy/consent, activation, shared-state semantics, and only then platform/provider/cloud/integration details. This ranking is explicitly intended to reduce cross-document rewriting.

#### Warning

`[WARNING :: UNRESOLVED_DEPENDENCY]`

The existing contracts are useful drafts, but several contracts encode open semantics as if they were already operational: evidence/confidence, corrections, facilitator signals, groups, arbitration, and acceptance proof. Implementation may continue only as scaffold/evidence gathering until the relevant upstream gates are clarified.

#### Conversational Reflection Summary

The complete review confirms the user's process insight. The project does not merely need answers; it needs answers in the right order. The ranked queue is now the governing map for future KRYSTALIZE passes.

### Session CJ-015

```yaml
session_id: CJ-015
date: 2026-07-25
trigger: Human requested that the PRD visibly distinguish its AREN baseline, KRYSTALIZE work, and later stabilized form.
scope: Append-only PRD evolution record and judge/team-facing clarification rationale.
authority: human clarification
```

#### Locked Outcomes

- The original PRD Sections 1-31 remain preserved as the AREN-originated baseline.
- The PRD now includes a Part 2 explaining why each of the 24 areas requires KRYSTALIZE and why it could not be safely finalized in the first pass.
- The PRD now includes a Part 3 defining the human-approved stabilized PRD as a future controlled target, not as an already completed artifact.
- The distinction is methodological: AREN establishes product intent; KRYSTALIZE stabilizes ambiguity and dependencies; the human approves final meaning.

#### Warning

`[WARNING :: UNRESOLVED_DEPENDENCY]`

Part 3 must not be treated as implementation-final until the ranked clarification gates are resolved, deferred, or explicitly accepted by the human project owner.

#### Conversational Reflection Summary

The PRD now shows its reasoning history openly: the original vision, the clarification work required to make it safe to implement, and the structure of the final approved form.

### Session CJ-016

```yaml
session_id: CJ-016
date: 2026-07-25
trigger: Human clarified that the teacher may not want Bud present in every workshop.
scope: Item 1 - WorkshopModel authoring and teacher approval.
authority: human clarification
```

#### Locked Outcome

WorkshopModel approval includes a workshop-level Bud availability decision. The teacher may disable Bud for a workshop; when disabled, Bud does not activate for learners in that workshop. The separate question of how an individual learner activates Bud when it is enabled remains Item 6.

#### Clarification Rationale

This decision belongs in Item 1 because it is part of the workshop's operational setup. Keeping per-learner activation separate prevents a workshop-wide availability choice from being confused with individual consent or activation behavior.

#### Progress

Item 1 is clarified. The active frontier moves to Item 2: WorkshopModel versioning and change rules. Twenty-three items remain in the full queue.

### Session CJ-017

```yaml
session_id: CJ-017
date: 2026-07-25
trigger: Human confirmed the recommended WorkshopModel versioning and authority rule.
scope: Item 2 - WorkshopModel versioning and change rules.
authority: human clarification
```

#### Locked Outcome

The teacher/workshop owner owns WorkshopModel changes. Bud may identify a mismatch or recommend a revision, but must not change the model autonomously. A substantive approved change creates a new version; existing evidence remains linked to the previous version and new evidence is linked to the new version.

#### Clarification Rationale

This preserves teacher authority and prevents Bud from judging workshop progress against a silently moving objective. It also keeps the evidence history auditable when the workshop plan changes.

#### Progress

Item 2 is clarified. The active frontier moves to Item 3: Workshop lifecycle and authority. Twenty-two items remain after Item 3.

### Session CJ-018

```yaml
session_id: CJ-018
date: 2026-07-25
trigger: Human confirmed the recommended workshop lifecycle and authority rule.
scope: Item 3 - Workshop lifecycle and authority.
authority: human clarification
```

#### Locked Outcome

The teacher/workshop owner creates, approves, starts, pauses, resumes, and ends the workshop. The lifecycle is `SETUP -> READY -> ACTIVE <-> PAUSED -> ENDED`. Learners join only while the workshop accepts participants. Bud may recommend lifecycle actions but cannot execute them. Ended workshops are not silently restarted; a new session or explicit new lifecycle instance is required.

#### Clarification Rationale

Explicit lifecycle authority prevents clients or Bud from changing workshop state without teacher approval. It also creates clear boundaries for learner access, Bud processing, evidence collection, and shutdown behavior.

#### Progress

Item 3 is clarified. The active frontier moves to Item 4: Learner joining and identity. Twenty-one items remain after Item 3; twenty items remain after Item 4.

### Session CJ-019

```yaml
session_id: CJ-019
date: 2026-07-25
trigger: Human confirmed the recommended learner joining and identity rule.
scope: Item 4 - Learner joining and identity.
authority: human clarification
```

#### Locked Outcome

The teacher generates a workshop URL/code. Learners verify the workshop title and teacher, enter a display name and preferred language, and wait for teacher approval. The server assigns an internal participant ID and supports a short-lived reconnect token. Full account authentication is deferred beyond the prototype. Bud activation and consent remain separate decisions.

#### Clarification Rationale

This protects against wrong-workshop joins and gives the teacher admission control while keeping the teacher-hosted prototype practical. The internal participant ID keeps runtime privacy and state separate from a learner's display name.

#### Progress

Item 4 is clarified. The active frontier moves to Item 5: Privacy, consent, and visibility. Twenty items remain after Item 4; nineteen items remain after Item 5.

### Session CJ-020

```yaml
session_id: CJ-020
date: 2026-07-25
trigger: Human confirmed the recommended privacy, consent, and visibility rule and requested a consolidated AI behavior section.
scope: Item 5 - Privacy, consent, and visibility; living AI behavior consolidation.
authority: human clarification
```

#### Locked Outcome

Bud may observe permitted shared workshop input and use private learner-Bud content to support that learner. Private content remains private by default. Only minimum-necessary operational signals reach the teacher unless the learner explicitly permits raw disclosure. Bud must not infer confusion, disengagement, motivation, or personality from silence alone. Learners must know when Bud is active and what it may observe.

#### Documentation Outcome

The PRD now contains a living `AI Behavior Consolidation` section. It records only clarified behavior and identifies behavior still dependent on later KRYSTALIZE items.

#### Clarification Rationale

This behavior directly supports the video proof: a learner can receive private contextual help while the teacher receives useful operational awareness without surveillance-by-transcript. Consolidating it now improves readability without prematurely finalizing downstream behavior.

#### Progress

Item 5 is clarified. The active frontier moves to Item 6: Bud activation lifecycle. Nineteen items remain after Item 5; eighteen items remain after Item 6.

### Session CJ-021

```yaml
session_id: CJ-021
date: 2026-07-25
trigger: Human confirmed the recommended Bud activation and consent rule.
scope: Item 6 - Bud activation lifecycle.
authority: human clarification
```

#### Locked Outcome

When Bud is enabled for a workshop, each learner sees Bud initially inactive and explicitly chooses whether to activate it. Learners may pause, decline, or revoke Bud. The active/paused state is visible. A reconnect preserves the prior choice but remains paused until learner confirmation. Leaving the workshop ends the active Bud session. Bud cannot activate autonomously.

#### Clarification Rationale

This preserves learner agency while still making the feature demonstrable: the teacher enables Bud at workshop level, then the learner knowingly activates the private companion.

#### Progress

Item 6 is clarified. The active frontier moves to Item 7: Teacher controls and intervention boundaries. Eighteen items remain after Item 6; seventeen items remain after Item 7.

### Session CJ-022

```yaml
session_id: CJ-022
date: 2026-07-25
trigger: Human confirmed the recommended teacher controls and requested a PRD section explaining privacy protection.
scope: Item 7 - Teacher controls and intervention boundaries; privacy and agency documentation.
authority: human clarification
```

#### Locked Outcome

The teacher may manage workshop operations, public/group communication, WorkshopModel revisions, minimum-necessary signals, shared-context corrections, and workshop-wide Bud pause. The teacher may not read private learner-Bud conversations by default, force Bud activation or private check-ins, treat signals as facts, override a learner's stated meaning, or disclose private content without permission.

#### Documentation Outcome

The PRD now contains a living `Privacy and Agency Commitments` section showing how workshop-level controls, learner-level choices, information boundaries, and authority boundaries protect privacy.

#### Clarification Rationale

The privacy section makes the architecture legible to the team and judges: privacy is enforced through lifecycle state, activation consent, application-controlled permissions, minimum-necessary projections, and bounded teacher authority rather than through a general promise alone.

#### Progress

Item 7 is clarified. The active frontier moves to Item 8: Multi-learner isolation and concurrency. Seventeen items remain after Item 7; sixteen items remain after Item 8.

### Session CJ-023

```yaml
session_id: CJ-023
date: 2026-07-25
trigger: Human narrowed the MVP to voice and text and raised the risk of stale high-latency AI sensemaking.
scope: MVP media scope and low-latency AI behavior constraint.
authority: human clarification
```

#### Locked Outcomes

- Participant video is excluded from the MVP interface and Bud AI input path.
- The MVP focuses on voice and text input.
- Bud must not deliver stale sensemaking as current after workshop context has moved on.
- Local/open-source inference is the preferred provider direction, while exact model, hardware, quantization, and fallback remain unresolved until Item 21 benchmarking.

#### Clarification Rationale

Video is not the product's differentiator and would add bandwidth, consent, privacy, and implementation complexity. The core proof is stronger when latency is spent on timely voice/text understanding, translation, grounded support, and privacy-aware action. Local inference may help, but it must be measured rather than assumed to be faster.

#### Warning

`[WARNING :: INTENT_CHANGE_DETECTED]`

Earlier team material described video/voice/text. The active MVP direction is now voice/text only; the older video reference remains historical context and must not drive MVP requirements.

### Session CJ-024

```yaml
session_id: CJ-024
date: 2026-07-25
trigger: Human confirmed the recommended multi-learner isolation and concurrency rule.
scope: Item 8 - Multi-learner isolation and concurrency.
authority: human clarification
```

#### Locked Outcome

Every workshop has a separate server-side context. Every learner has a private Bud context keyed by workshop and participant. Shared events are room-scoped; group events are visible only to group members; private evidence is not included in another learner's context by default. The application server enforces scope, ordering, and duplicate protection rather than trusting the browser or model.

#### Clarification Rationale

Privacy rules are incomplete if concurrent event routing can still mix participants. Server-enforced scope makes the privacy commitment executable and testable.

#### Progress

Item 8 is clarified. The active frontier moves to Item 9: Evidence and confidence semantics. Sixteen items remain after Item 8; fifteen items remain after Item 9.

### Session CJ-025

```yaml
session_id: CJ-025
date: 2026-07-25
trigger: Human confirmed the recommended evidence and confidence rule.
scope: Item 9 - Evidence and confidence semantics.
authority: human clarification
```

#### Locked Outcome

Bud uses evidence-linked categorical confidence: `unknown`, `low`, `medium`, or `high`. `unknown` is the default when evidence is insufficient. Translation or silence alone cannot prove understanding. Conflicting or stale evidence lowers confidence. Explicit learner corrections take priority over Bud's inference about that learner's meaning. Confidence includes rationale, evidence references, freshness, and evidence status.

#### Clarification Rationale

This provides useful uncertainty behavior without inventing scientifically precise learner scores. It also makes decisions auditable and gives the system a clear reason to wait, ask, or seek human confirmation.

#### Progress

Item 9 is clarified. The active frontier moves to Item 10: Correction, disagreement, and revision workflow. Fifteen items remain after Item 9; fourteen items remain after Item 10.

### Session CJ-026

```yaml
session_id: CJ-026
date: 2026-07-25
trigger: Human confirmed the recommended correction, disagreement, and revision rule.
scope: Item 10 - Correction, disagreement, and revision workflow.
authority: human clarification
```

#### Locked Outcome

Corrections create new linked evidence; original evidence is not erased. The person who expressed the meaning has authority over intended meaning. Facilitators may correct shared instructions/context. Bud revises dependent inferences and signals. Productive disagreement is not automatically an error; Bud uses neutral clarification for possible meaning gaps and does not pressure agreement.

#### Clarification Rationale

This preserves human meaning and auditability while allowing Bud to recover from STT, translation, interpretation, and state errors. It also prevents the system from treating disagreement itself as a defect.

#### Progress

Item 10 is clarified. The active frontier moves to Item 11: Facilitator signal vocabulary and thresholds. Fourteen items remain after Item 10; thirteen items remain after Item 11.

### Session CJ-027

```yaml
session_id: CJ-027
date: 2026-07-25
trigger: Human confirmed the recommended facilitator signal vocabulary and threshold rule.
scope: Item 11 - Facilitator signal vocabulary and thresholds.
authority: human clarification
```

#### Locked Outcome

Facilitator signals use `meaning_gap`, `support_needed`, `participation_pattern`, `translation_risk`, and `system_error`. Each signal includes scope, summary, evidence references, confidence, persistence/consequence, suggested action, timestamps, and status. Signals are recommendations, not facts. A single silence event cannot create a participation signal; stale or invalidated signals are withdrawn or marked stale.

#### Clarification Rationale

The bounded vocabulary keeps THE ROOM useful and legible while preventing a teacher dashboard from becoming an unbounded surveillance or diagnosis surface.

#### Progress

Item 11 is clarified. The active frontier moves to Item 12: Group and breakout semantics. Thirteen items remain after Item 11; twelve items remain after Item 12.

### Session CJ-028

```yaml
session_id: CJ-028
date: 2026-07-25
trigger: Human confirmed the recommended group and breakout semantics.
scope: Item 12 - Group and breakout semantics.
authority: human clarification
```

#### Locked Outcome

The teacher creates and changes groups. Bud may recommend regrouping but cannot move learners. Group and breakout contexts are membership-scoped and change at clear boundaries. Private learner Bud context never transfers automatically between groups. Merges and splits create new shared contexts while preserving prior histories; leaving a group marks inactivity without erasing evidence.

#### Clarification Rationale

This lets Bud reason about US without allowing group movement to leak private context or silently rewrite the history of shared meaning.

#### Progress

Item 12 is clarified. The active frontier moves to Item 13: Prototype network topology. Twelve items remain after Item 12; eleven items remain after Item 13.

### Session CJ-029

```yaml
session_id: CJ-029
date: 2026-07-25
trigger: Human accepted the recommendation to retain trusted-LAN hosting and add secure public reachability as an optional demonstration mode.
scope: Item 13 - Prototype network topology.
authority: human clarification
```

#### Locked Outcome

Trusted-LAN hosting is the guaranteed prototype path. Secure public reachability is an optional demonstration path in which the teacher still launches Bud and a protected HTTPS tunnel or relay provides short-lived workshop access. Public reachability is not a claim of production cloud hosting.

#### Clarification Rationale

This makes a distributed demo possible without making public networking, cloud operations, or production security a prerequisite for the reliable prototype path.

#### Progress

Item 13 is clarified. The active frontier moves to Item 14: LiveKit room and media lifecycle. Eleven items remain after Item 13; ten items remain after Item 14.

### Session CJ-030

```yaml
session_id: CJ-030
date: 2026-07-25
trigger: Human confirmed the Zoom-first companion demonstration with standalone LiveKit fallback.
scope: Intent change and clarification-order update before Item 14.
authority: human clarification
```

#### Locked Outcome

The primary demonstration is Bud integrated with Zoom as an easy-to-use AI companion layer. If Zoom is unavailable, the teacher may deliberately move the workshop to the standalone Bud/LiveKit room. This is not seamless mid-session failover. The Bud Core remains platform-independent, and Zoom proof mode now precedes LiveKit fallback-room lifecycle clarification.

#### Clarification Rationale

This demonstrates adoption through an existing platform while preserving an independent continuation path. It also prevents the project from being judged as a meeting-platform reinvention. Zoom authorization and permitted live input remain unresolved and must be proven before integration claims.

#### Warning

`[WARNING :: INTENT_CHANGE_DETECTED]`

The earlier LiveKit-first primary-demo emphasis is superseded. LiveKit remains the fallback runtime; Zoom is the primary integration demonstration target.

#### Progress

The active frontier remains Item 14, but Item 14 is now Zoom integration proof mode. The LiveKit room and media lifecycle clarification moves to Item 22.

### Session CJ-031

```yaml
session_id: CJ-031
date: 2026-07-25
trigger: Human requested a versioned PRD rewrite and timeboxed focus on Zoom integration rather than building a full original platform.
scope: PRD versioning, active PRD replacement, and MVP scope reduction.
authority: human clarification
```

#### Locked Outcomes

- At that time, the prior PRD was preserved under a V1 archive filename; it is now restored as `PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`.
- The Zoom-first candidate is now retained as `docs/archive/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS_V2_ZOOM_FIRST_STALE.md`.
- V2 keeps the same numbered sections but is rewritten by KRYSTALIZE for the Zoom-first companion direction.
- The current timeboxed MVP does not build a full original meeting platform.
- Zoom integration proof is the primary build target.
- The existing Bud/LiveKit scaffold remains a minimal fallback and test harness.
- AREN's original work is preserved as history; KRYSTALIZE's rewrite is explicitly identified rather than presented as AREN's original output.

#### Clarification Rationale

This scope reduction concentrates limited time on the differentiating integration and AI behavior. It avoids spending the timebox recreating generic meeting infrastructure while preserving an independent fallback path and platform-independent Bud Core.

#### Warning

`[WARNING :: INTENT_CHANGE_DETECTED]`

At that time, the active PRD direction and build sequence changed from standalone LiveKit-first platform construction to Zoom-first integration proof. CJ-032 later restored the native-platform direction.

### Session CJ-032

```yaml
session_id: CJ-032
date: 2026-07-25
trigger: Human re-evaluated the Zoom-first candidate after examining RTMS and Zoom Marketplace authorization, entitlement, and distribution requirements.
scope: Restore the native LiveKit workshop direction and retire the unresolved Zoom-first candidate.
authority: human clarification
```

#### Locked Outcome

- `PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` is restored as the active PRD.
- `docs/archive/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS_V2_ZOOM_FIRST_STALE.md` preserves the Zoom-first candidate as stale history.
- The native LiveKit workshop is restored as the active MVP runtime.
- Zoom integration is deferred as a future optional direction rather than an MVP dependency or claim.
- The clarification frontier returns to CG-005, the LiveKit room and media lifecycle.

#### Clarification Rationale

The Zoom-first candidate had not produced a completed KRYSTALIZE decision for the integration path. RTMS requires a Zoom developer app, Marketplace configuration, authorization, account entitlement, and constrained private/beta distribution. Those external dependencies conflict with the project intent to demonstrate Bud as a deeply integrated workshop partner under the team's own privacy and data-flow control.

#### Warning

`[WARNING :: INTENT_CHANGE_DETECTED]`

The active direction is reverting from the unresolved Zoom-first candidate to the prior native-platform direction. The candidate is retained as stale history; it is not silently deleted or treated as a completed clarification decision.

#### Progress

The prior completed KRYSTALIZE decisions remain in force. The next active item is Item 14: LiveKit room and media lifecycle. Ten items remain after Item 14.

### Session CJ-033

```yaml
session_id: CJ-033
date: 2026-07-25
trigger: Human approved the proposed native LiveKit room-creation and participant-token model.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

The teacher-owned server creates the LiveKit room at `READY`. After teacher approval, each learner receives a short-lived token bound to the room and the learner's internal participant identity. `PAUSED` keeps the room connected while Bud remains inactive; `ENDED` prevents new tokens. Reconnection receives a fresh token for the same identity.

#### Clarification Rationale

Creating the room at `READY` allows approved learners to arrive before teaching begins without granting uncontrolled access. Short-lived tokens provide room admission and bounded media/data permissions without introducing passwords or a full account system. Bud activation remains a separate learner-controlled privacy decision.

#### Demo Identity Note

The human explicitly confirmed that the demo will not implement login/password accounts. This is a deliberate scope boundary: teacher-issued workshop access, approval, internal participant IDs, and short-lived room tokens are sufficient to prove Bud's behavior without claiming production identity verification.

#### Progress

Item 14 remains active. The voice/text admission gate is clarified: workshop input is accepted only after the teacher publishes `ACTIVE`. The next question concerns whether `PAUSED` keeps clients connected with media muted, revokes publishing, or applies another explicit track policy.

### Session CJ-034

```yaml
session_id: CJ-034
date: 2026-07-25
trigger: Human clarified that voice and text should become live workshop input only when the teacher publishes ACTIVE.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

Learners may connect to the teacher-created LiveKit room while it is `READY`, but their voice and text are not accepted as live workshop input and are not processed by Bud as workshop evidence. The server enables the live voice/text input path only when the teacher publishes `ACTIVE`.

#### Clarification Rationale

This preserves a clean separation between admission/setup and teaching. It prevents pre-start conversation from entering the workshop evidence stream or triggering Bud behavior, while still allowing approved learners to arrive before the session begins.

#### Preserved Uncertainty

The `PAUSED` state is now clarified: clients remain connected, but voice and text publishing is disabled until the teacher resumes `ACTIVE`. When `ENDED`, Bud disconnects and no further workshop input is accepted, but participants may continue ordinary voice/text interaction and use translation until all participants leave and the room closes.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns whether the prototype ties room availability to the teacher's live connection, while a future cloud version decouples room life from the teacher.

### Session CJ-035

```yaml
session_id: CJ-035
date: 2026-07-25
trigger: Human approved the proposed connected-but-publishing-disabled behavior for PAUSED.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

When the teacher changes the workshop to `PAUSED`, already-connected clients remain in the LiveKit room, but they cannot publish voice or text as workshop input. The publishing path becomes available again only when the teacher resumes `ACTIVE`.

#### Clarification Rationale

Keeping clients connected preserves workshop continuity and avoids unnecessary reconnect churn. Disabling publishing prevents paused activity from entering Bud's live evidence stream while preserving the teacher's authority over resumption.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns what happens when the teacher's connection is lost.

### Session CJ-036

```yaml
session_id: CJ-036
date: 2026-07-25
trigger: Human clarified that ENDED stops Bud and workshop-input capture but does not immediately close participant interaction.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

`ENDED` ends the Bud workshop session: Bud disconnects, no new workshop input is accepted, and AI features stop. Participants may remain in the room, continue ordinary voice/text interaction, and use translation. The room closes only after all participants have left.

#### Clarification Rationale

This separates the end of the facilitated AI workshop from the end of the communication room. Participants can finish a conversation or rely on translation without Bud continuing to collect evidence or intervene.

#### Preserved Uncertainty

The prototype may tie room availability to the teacher's live connection for implementation simplicity, but this must be explicitly confirmed. A future cloud-hosted version should allow the server and room to remain available independently of the teacher's browser connection.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question is the prototype teacher-connection authority rule.

### Session CJ-037

```yaml
session_id: CJ-037
date: 2026-07-25
trigger: Human approved tying prototype room availability to the teacher's live connection.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

For the prototype, the teacher's browser control client is the room-availability authority. If that control client disconnects, the workshop automatically enters `PAUSED`; students remain connected and workshop input is suspended. When the teacher reconnects, the same workshop state can resume.

#### Clarification Rationale

This reduces demo complexity by making the teacher's control client the explicit authority signal while preserving student continuity. It is a prototype constraint, not the desired production deployment model.

#### Future Deployment Boundary

A future cloud-hosted server should remain alive independently of the teacher's browser connection so participants can continue without being removed by a teacher-device disconnect.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns the grace period for preserving the automatically paused workshop state.

### Session CJ-039

```yaml
session_id: CJ-039
date: 2026-07-25
trigger: Human changed the prototype recovery behavior so students remain connected while the session pauses when the teacher control client disconnects.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Warning

`[WARNING :: INTENT_CHANGE_DETECTED]` The prior proposal required participants to be re-added after teacher-client reconnection. The clarified intent is to keep students connected and pause the whole session instead.

#### Locked Outcome

The teacher's browser control client is separate from the server process. If the control client disconnects, the server keeps the workshop state and automatically transitions the session to `PAUSED`. Students remain connected, but workshop input is suspended. When the teacher reconnects, the same workshop state can resume.

#### Clarification Rationale

This preserves student continuity and makes a teacher-device interruption a temporary workshop pause rather than a forced participant removal. It also keeps the prototype's authority model explicit without claiming that the teacher is the server.

#### Preserved Uncertainty

The teacher recovery grace period is now locked at two minutes. The same two-minute server-side grace period applies to each student client: a disconnected student's participant state remains available for reconnection during that window. Cleanup and re-admission after a student's timer expires remain unresolved.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns the recovery grace period and expiry behavior.

### Session CJ-040

```yaml
session_id: CJ-040
date: 2026-07-25
trigger: Human approved a two-minute recovery grace period for both teacher and student clients.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

The prototype uses server-side two-minute recovery windows. If the teacher control client disconnects, the workshop enters `PAUSED` and its state is preserved for two minutes. If a student client disconnects, that student's participant state is preserved for two minutes so the same participant can reconnect.

#### Clarification Rationale

Using the same bounded window keeps the prototype behavior predictable and demonstrates recovery without requiring production persistence or complex identity management.

#### Preserved Uncertainty

The behavior after a student's two-minute window expires is now clarified: the student is removed from the active workshop state and must receive teacher re-approval to return. Teacher-timeout behavior remains unresolved.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns student-state cleanup and re-admission after the grace period expires.

### Session CJ-041

```yaml
session_id: CJ-041
date: 2026-07-25
trigger: Human approved removal and teacher re-approval after a student's two-minute reconnect window expires.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

If a student does not reconnect within two minutes, the server removes that student from the active workshop state. The student cannot silently rejoin; the teacher must approve the return and the server must issue a new bounded room admission path.

#### Clarification Rationale

This prevents stale participant presence from remaining active indefinitely and keeps re-entry under teacher authority without introducing production login/password accounts.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns what happens when the teacher's two-minute recovery window expires.

### Session CJ-042

```yaml
session_id: CJ-042
date: 2026-07-25
trigger: Human clarified that the workshop closes when the teacher's two-minute recovery window expires.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

If the teacher control client does not reconnect within two minutes, the prototype closes the workshop.

#### Clarification Rationale

This gives the prototype a bounded and deterministic failure path. It prevents a teacherless paused workshop from remaining indefinitely active while preserving the separate `ENDED` behavior for a normally concluded workshop.

#### Progress

Item 14 is clarified. The active frontier advances to Item 15 of 24: failure and recovery behavior. Nine items remain after Item 15.

### Session CJ-043

```yaml
session_id: CJ-043
date: 2026-07-25
trigger: Human approved an append-only event log and replay-based Bud recovery architecture.
scope: Item 15 - Failure and recovery behavior.
authority: human clarification
```

#### Locked Outcome

The prototype server logs normalized workshop interactions to an append-only local event file, such as JSONL. Each event has a stable ID, timestamp, workshop/participant/group scope, privacy scope, and normalized payload. If Bud disconnects or restarts, it replays permitted events to rebuild its current context and resumes without duplicating events already processed.

#### Clarification Rationale

This makes a temporary Bud interruption recoverable without treating the AI's in-memory state as the only source of truth. A student leaving does not erase prior workshop evidence, and Bud can regain context when it returns.

#### Privacy Boundary

Raw audio is not stored by default. The event log records normalized interaction and decision events, while retention, deletion, encryption, and private-content rules remain subject to the later privacy and data-retention clarifications.

#### Progress

Item 15 remains active. Nine items remain after Item 15. The next active question concerns Bud's behavior while a dependency is unavailable or its recovered evidence is not yet sufficient.

### Session CJ-044

```yaml
session_id: CJ-044
date: 2026-07-25
trigger: Human approved degraded WAIT/NO_ACTION behavior while a required dependency is unavailable.
scope: Item 15 - Failure and recovery behavior.
authority: human clarification
```

#### Locked Outcome

When a required provider or runtime dependency is unavailable, Bud enters `WAIT` or `NO_ACTION` for the affected capability, shows a visible degraded/unavailable state, preserves permitted incoming events, and resumes processing from the recovered event log when the dependency returns.

#### Clarification Rationale

This keeps failure behavior honest. Bud does not guess, silently discard permitted evidence, or pretend that an unavailable capability is still operating.

#### Progress

Item 15 remains active. Nine items remain after Item 15. The next active question concerns suppressing delayed results that no longer match the current workshop context.

### Session CJ-045

```yaml
session_id: CJ-045
date: 2026-07-25
trigger: Human approved discarding delayed AI output when workshop context has moved on, with an explanatory notification.
scope: Item 15 - Failure and recovery behavior.
authority: human clarification
```

#### Locked Outcome

If a delayed AI result no longer matches the current workshop context, Bud discards it. Bud notifies the relevant user that the response was discarded because the context moved on.

#### Clarification Rationale

This prioritizes current-context usefulness over completing an old request. The notification makes the absence of a response legible without pretending that the stale result was still valid.

#### Progress

Item 15 remains active. Nine items remain after Item 15. The next active question concerns the freshness test and bounded retry behavior after stale output is discarded.

### Session CJ-046

```yaml
session_id: CJ-046
date: 2026-07-25
trigger: Human approved one bounded retry using the latest context after stale output is discarded.
scope: Item 15 - Failure and recovery behavior.
authority: human clarification
```

#### Locked Outcome

After discarding stale output, Bud may retry once using the latest permitted context when the request remains relevant and the provider is available. If the retry is slow or becomes stale, Bud stops and waits for a new interaction.

#### Clarification Rationale

One retry gives Bud a chance to recover from a transient timing failure without allowing repeated attempts to create latency, duplicate intervention, or disruption.

#### Progress

Item 15 remains active. Nine items remain after Item 15. The next active question concerns the latency budget that governs waiting, retrying, and abandoning a response.

### Session CJ-047

```yaml
session_id: CJ-047
date: 2026-07-25
trigger: Human approved the proposed prototype latency budget.
scope: Item 15 - Failure and recovery behavior.
authority: human clarification
```

#### Locked Outcome

For complete supported input, Bud acknowledges receipt within 300 ms, targets a response within 1.5 seconds, and enforces a three-second total deadline including one retry. After the deadline, Bud shows `WAIT` or a processing state and waits for a new interaction rather than delivering stale output.

#### Clarification Rationale

This protects workshop flow from the stale-response problem that motivated the low-latency design. The budget is a prototype responsiveness target, not a production service-level guarantee.

#### Progress

Item 15 remains active. Nine items remain after Item 15. The next active question concerns bounded event-log replay and checkpoint behavior after recovery.

### Session CJ-048

```yaml
session_id: CJ-048
date: 2026-07-25
trigger: Human approved periodic checkpoints plus bounded event-log replay for Bud recovery.
scope: Item 15 - Failure and recovery behavior.
authority: human clarification
```

#### Locked Outcome

Every normalized event is appended to the event log. The prototype creates compact checkpoints after major state changes and approximately every 30 seconds or 50 events. Recovery loads the latest checkpoint and replays only later events, with full-log replay as a fallback when no checkpoint exists. Replay applies privacy-scope filtering.

#### Clarification Rationale

This keeps recovery bounded enough for the latency-sensitive prototype while preserving the event history needed to reconstruct Bud's current context.

#### Progress

Item 15 is clarified. The active frontier advances to Item 16 of 24: data retention and session records. Eight items remain after Item 16.

### Session CJ-049

```yaml
session_id: CJ-049
date: 2026-07-25
trigger: Human approved session-only retention for prototype workshop records.
scope: Item 16 - Data retention and session records.
authority: human clarification
```

#### Locked Outcome

The prototype retains the event log while the workshop is active or paused and through the applicable two-minute recovery window. After the workshop closes and all participants leave, raw workshop events and private Bud content are deleted. Minimal non-private demo metrics may be preserved if needed.

#### Clarification Rationale

This supports recovery during the workshop without turning the prototype into an archival system or unnecessarily retaining private learner content. The teacher does not receive private Bud content by default.

#### Preserved Uncertainty

Production retention periods, encryption, audit access, durable storage, and compliance requirements remain future work.

#### Progress

Item 16 is clarified. The active frontier advances to Item 17 of 24: language configuration and change behavior. Seven items remain after Item 17.

### Session CJ-050

```yaml
session_id: CJ-050
date: 2026-07-25
trigger: Human approved the proposed language configuration and translation fallback policy.
scope: Item 17 - Language configuration and change behavior.
authority: human clarification
```

#### Locked Outcome

The teacher configures supported workshop languages. Each student chooses a preferred language on join and may change it during the workshop; the change applies to new input. Bud preserves original-language evidence alongside translations. If translation is unavailable, Bud shows the original and a visible unavailable state, may retry once, and does not invent a translation.

#### Clarification Rationale

This gives the teacher control over the workshop language environment while preserving participant preference and original evidence. Visible failure is safer than silently presenting an incorrect translation.

#### Progress

Item 17 is clarified. The active frontier advances to Item 18 of 24: Adaptive Check-in policy. Six items remain after Item 18.

### Session CJ-051

```yaml
session_id: CJ-051
date: 2026-07-25
trigger: Human approved locking Qwen3-8B as Bud's default local reasoning/text-translation model with a separate Whisper-family STT path.
scope: Cross-cutting provider direction; does not replace the active Item 18 clarification.
authority: human clarification
```

#### Locked Outcome

Bud's default local model is Qwen3-8B for reasoning and text translation. Voice input uses a separate Whisper-family speech-to-text provider. Qwen should run in non-thinking mode for the low-latency prototype path.

#### Selection Rationale

Qwen3-8B was selected because its published model card describes support for 100+ languages and dialects, local deployment through common runtimes, structured/tool-use capability, a non-thinking mode for efficiency, and an Apache 2.0 license. Its 8B scale is a practical starting point for local inference under the prototype's latency constraints. Speech recognition remains a separate component because an LLM is not itself a complete audio transcription system.

#### Preserved Uncertainty

The exact Whisper variant, quantization, target hardware, translation routing, and measured latency remain open implementation decisions. The selection is a default direction, not a claim that the three-second budget has already been verified.

#### Progress

Item 18 remains active. Six items remain after Item 18. This provider decision is recorded as a cross-cutting implementation constraint while Adaptive Check-in remains the active Krystalize question.

### Session CJ-052

```yaml
session_id: CJ-052
date: 2026-07-25
trigger: Human approved the proposed Adaptive Check-in observation and cooldown rules.
scope: Item 18 - Adaptive Check-in policy.
authority: human clarification
```

#### Locked Outcome

Adaptive Check-in uses a rolling three-minute observation window and requires at least three relevant low-interaction opportunities before sending one optional private prompt. It has a ten-minute cooldown. If dismissed, Bud does not send another invitation during the same workshop stage; a stage change resets the cooldown.

#### Clarification Rationale

These bounds make the feature observable and testable without turning a single quiet moment into a diagnosis. The prompt remains an invitation to ask, clarify, keep listening, or contribute, and is never evidence that the participant is confused or disengaged.

#### Progress

Item 18 is clarified. The active frontier advances to Item 19 of 24: Help, I'm Stuck grounding. Five items remain after Item 19.

### Session CJ-053

```yaml
session_id: CJ-053
date: 2026-07-25
trigger: Human approved the Help, I'm Stuck grounding hierarchy and five-minute freshness target.
scope: Item 19 - Help, I'm Stuck grounding.
authority: human clarification
```

#### Locked Outcome

Help, I'm Stuck grounds its private response in this order: the learner's private request; the current workshop stage, task, and approved objective; the latest facilitator instruction or transcript, preferably from the last five minutes; and recent relevant shared events from the current stage. Bud excludes unrelated older material and asks for clarification when context is missing, stale, or ambiguous.

#### Clarification Rationale

This keeps the response useful and aligned with what the facilitator is currently teaching. The freshness target prevents Bud from confidently explaining a superseded instruction, while the fallback clarification preserves honesty when evidence is insufficient.

#### Progress

Item 19 is clarified. The active frontier advances to Item 20 of 24: intervention arbitration and escalation. Four items remain after Item 20.

### Session CJ-054

```yaml
session_id: CJ-054
date: 2026-07-26
trigger: Human approved the proposed intervention arbitration order.
scope: Item 20 - Intervention arbitration and escalation.
authority: human clarification
```

#### Locked Outcome

Bud prioritizes privacy/permission and explicit user requests, then immediate private learner support, US shared meaning repair, THE ROOM facilitator signals for persistent or room-wide patterns, and optional Adaptive Check-in. Bud executes at most one conflicting action per participant/context, suppresses duplicates, and prefers `WAIT` when candidates are equally important. Escalation requires persistence, consequence, or explicit learner/facilitator request.

#### Clarification Rationale

This prevents simultaneous Bud actions from competing for attention or silently overriding learner agency. Private and explicitly requested support remains closer to the participant than room-level projection.

#### Progress

Item 20 is clarified. The active frontier advances to Item 21 of 24: provider and model choices. Three items remain after Item 21.

### Session CJ-055

```yaml
session_id: CJ-055
date: 2026-07-26
trigger: Human approved the no-raw-audio session-log boundary.
scope: Item 21 - Provider and model choices.
authority: human clarification
```

#### Locked Outcome

Microphone audio may be processed transiently for speech-to-text, but raw audio is not written to the prototype session log. The log stores transcript/events and metadata such as language, timestamp, participant scope, and provider confidence. Bud recovery replays permitted transcript/events rather than recordings.

#### Clarification Rationale

This keeps voice input available while reducing privacy, storage, and replay risk. A temporary STT processing path is distinct from retaining a recording.

#### Preserved Uncertainty

Any future raw-audio retention would require a separate explicit consent, access, and retention decision.

#### Progress

Item 21 remains active. Three items remain after Item 21. The benchmark and demo-readiness acceptance plan is still the active question.

### Session CJ-056

```yaml
session_id: CJ-056
date: 2026-07-26
trigger: Human approved the provider benchmark and demo-readiness acceptance gates.
scope: Item 21 - Provider and model choices.
authority: human clarification
```

#### Locked Outcome

Provider configurations are demo-ready only after testing at least 20 varied utterances per supported language across speakers, accents, speaking speeds, and mild noise; meeting the 300 ms acknowledgement target, 1.5 second typical response target, and 3 second maximum including one retry; suppressing stale output; preserving original/translation separation; handling provider failure visibly; and writing no raw audio to the session log.

#### Clarification Rationale

This turns the local-model direction into a testable demo claim rather than assuming that a downloaded model will meet the workshop's latency and multilingual needs. Tests must run on the actual demo hardware.

#### Preserved Uncertainty

These are prototype acceptance gates, not a production SLA or universal language-quality guarantee. The exact Whisper variant, quantization, translation routing, and measured configuration remain implementation results.

#### Progress

Item 21 is clarified. The active frontier advances to Item 22 of 24: future cloud deployment boundary. Two items remain after Item 22.

### Session CJ-057

```yaml
session_id: CJ-057
date: 2026-07-26
trigger: Human approved keeping cloud hosting outside the current demo.
scope: Item 22 - Future cloud deployment boundary.
authority: human clarification
```

#### Locked Outcome

Cloud hosting is future-only. The current demo remains teacher-hosted: the teacher launches the server and students connect to that workshop. Cloud authentication, durable persistence, tenancy, operations, and cost are outside demo scope. A secure tunnel may be used for remote reachability without changing the prototype ownership model.

#### Clarification Rationale

This keeps the demo focused on Bud's workshop behavior and prevents future production concerns from expanding the current build boundary. The cloud option remains documented rather than silently discarded.

#### Progress

Item 22 is clarified. The active frontier advances to Item 23 of 24: acceptance and demonstration proof. One item remains after Item 23.

### Session CJ-058

```yaml
session_id: CJ-058
date: 2026-07-26
trigger: Human approved the proposed demo acceptance criteria.
scope: Item 23 - Acceptance and demonstration proof.
authority: human clarification
```

#### Locked Outcome

The demo must provide observable evidence of six areas: the core multilingual Bud loop; grounded private Help, I'm Stuck support; Adaptive Check-in; comprehension rollup with privacy; teacher authority and learner privacy; and recovery behavior including pause/resume, student reconnect, event replay, stale-result rejection, and visible provider failure. Each scenario must work with varied supported input rather than one scripted sentence.

#### Clarification Rationale

These criteria connect the product claims to observable behavior and prevent the demo from relying on a polished but fixed script. They also make privacy, recovery, and human authority first-class proof obligations rather than background assumptions.

#### Progress

Item 23 is clarified. The active frontier advances to Item 24 of 24: future Zoom integration proof mode. No items remain after Item 24.

### Session CJ-059

```yaml
session_id: CJ-059
date: 2026-07-26
trigger: Human approved the future Zoom integration proof requirements.
scope: Item 24 - Future Zoom integration proof mode.
authority: human clarification
```

#### Locked Outcome

Any future Zoom integration must prove authorized input capture, participant mapping, privacy/consent, conversion into the same normalized events used by the native LiveKit runtime, and graceful failure behavior. It remains a separate future adapter and is not an MVP dependency or current capability claim.

#### Clarification Rationale

This preserves the interoperability goal without allowing an unverified external platform dependency to weaken the native Bud demo. Zoom work can begin only after the native workshop is stable and the authorization/distribution path is separately verified.

#### Completion

Item 24 is clarified. All 24 ranked Krystalize items are now clarified, deferred, or explicitly bounded. The active clarification frontier is closed; implementation may proceed against the stabilized native LiveKit MVP.

### Session CJ-060

```yaml
session_id: CJ-060
date: 2026-07-26
trigger: Human requested a final full-document clarification audit.
scope: Final audit of the active PRD, constitutional state/journal, contracts, implementation plans, and demo plan.
authority: human clarification
```

#### Audit Outcome

No new product, authority, privacy, lifecycle, AI-behavior, provider-direction,
or integration decision requires human clarification for the current native
LiveKit MVP. The remaining unknowns are implementation refinements, benchmark
measurements, UI polish, or explicitly deferred future work.

#### Documentation Correction

Some append-only state tables still described earlier frontier stages as
active. Those entries remain historical traceability, but the current state
and PRD now explicitly identify the frontier as closed and distinguish
implementation work from unresolved semantic decisions.

#### Completion

The final audit is complete. Krystalize is closed for the current MVP;
implementation may proceed without another clarification pass unless a new
product direction or scope change is introduced.

### Session CJ-061

```yaml
session_id: CJ-061
date: 2026-07-26
trigger: Human requested a save point after evaluating the project against the problem statement PDF.
scope: Problem-statement alignment and implementation readiness.
authority: human clarification
```

#### Locked Save Point

The product direction covers the problem statement conceptually and
architecturally. No new semantic clarification is required. The project is
now explicitly entering an implementation-gap phase.

#### Critical Gaps

The working prototype still requires LiveKit multi-user runtime, voice/STT,
genuine two-language translation, facilitator-facing functionality,
multiple learner clients and peer/group interaction, captions/translation
accessibility surfaces, provider benchmarking, and a realistic live
multilingual demonstration.

#### Boundary

The existing text-first scaffold must not be presented as satisfying the
problem statement's working-prototype requirement. The next implementation
work should close these gaps in priority order while preserving the locked
Bud AI product and privacy decisions.

### Session CJ-038

```yaml
session_id: CJ-038
date: 2026-07-25
trigger: Human clarified that teacher disconnection means the teacher browser/control client disconnecting, not necessarily the server process stopping.
scope: Item 14 - LiveKit room and media lifecycle.
authority: human clarification
```

#### Locked Outcome

For the prototype, the teacher's browser control client acts as the room-availability lease. The server process may continue running, but participant access is blocked when the teacher control client disconnects. After the teacher reconnects, participants must be re-added.

#### Clarification Rationale

This separates the teacher's operating interface from the backend process while preserving a simple, teacher-controlled demo boundary. It avoids implying that the teacher is literally the server.

#### Future Deployment Boundary

In a future cloud-hosted version, room availability should not depend on a teacher browser connection or device. The server and workshop room should have independent lifecycle ownership.

#### Progress

Item 14 remains active. Ten items remain after Item 14. The next active question concerns whether teacher reconnection restores the same workshop state or creates a new workshop instance.

### Session CJ-062

```yaml
session_id: CJ-062
date: 2026-07-26
trigger: Human requested that the AI Partner purpose and the newly implemented proactive behaviors be made explicit in the README, PRD, and constitutional state.
scope: Bud AI partner thesis, bounded agency, periodic learner summaries, and automatic facilitator room reports.
authority: human clarification
```

#### Locked Outcome

Bud AI is intentionally built as a partner rather than a passive tool. A tool
waits for an instruction and performs a defined operation. Bud exercises
bounded agency toward the shared goal of preserving workshop meaning and
continued collaboration: it may notice relevant signals, offer timely help,
ask for clarification, summarize, surface patterns, adapt to human responses,
or wait.

The agency is constrained by privacy, evidence, participant agency, and
facilitator authority. Bud cannot override a learner's intended meaning,
expose private conversations without permission, infer understanding from
silence, or make consequential workshop decisions for the facilitator.

The human friction Bud is intended to reduce includes residual translation
misunderstandings, embarrassment about admitting confusion, hesitation to ask
questions, cognitive load across languages and turns, quieter participants
becoming invisible, and facilitator blind spots about room-level patterns.

#### Implementation Alignment

The learner receives a private, context-grounded progress summary after joining
and at bounded intervals with a 90-second cooldown. The facilitator receives an
automatic aggregate room report when the facilitator view loads or reconnects.
These behaviors are documented in the active PRD and remain subject to the
existing green/yellow/red/unknown, privacy, and WAIT/NO_ACTION rules.

#### Boundary

This clarification strengthens the product thesis and records already-approved
implementation behavior. It does not grant Bud autonomous authority, turn
periodic summaries into diagnoses, or permit raw private learner content in
facilitator reports. No new clarification frontier is opened.

## Clarification Rationale Tracking

Use this section to preserve cognitive traversal lineage.

| ID | Session | Clarification Path | Severity Tier | Why Prioritized | Dependency Branch | Instability Trigger |
| --- | --- | --- | --- | --- | --- | --- |
| CRT-001 | CJ-001 | Naming -> artifact convention -> traceability preservation | Tier 4 | Human introduced product name before artifact generation. | Constitutional artifacts and downstream contracts. | Potential drift between Bud AI naming and AI Partner source docs. |
| CRT-002 | CJ-002 | Contract-first dependency -> state/event/decision/tool artifacts | Tier 3 | Missing contracts blocked implementation without semantic drift. | Implementation architecture and tests. | Handoff and consistency report required downstream contracts. |
| CRT-003 | CJ-003 | Contracts -> implementation plan -> repo/build/provider/test docs | Tier 3 | Build work needed a concrete documentation bridge before scaffolding. | Source scaffold and MVP sequencing. | Human requested continuing documentation. |
| CRT-004 | CJ-004 | Implementation docs -> dependency-free scaffold -> demo/tests | Tier 3 | Executable behavior was needed before dependency-heavy LiveKit/provider work. | TypeScript upgrade, frontend, LiveKit, providers. | Human requested source scaffolding. |
| CRT-005 | CJ-005 | Teammate recommendation -> ME feature classification -> contract/docs/scaffold update | Tier 3 | Feature strengthens private learner support but depends on grounded context retrieval. | Frontend, transcript retrieval, LLM provider. | Human approved adding feature. |
| CRT-006 | CJ-006 | Teammate recommendation -> ME invitation classification -> contract/docs/scaffold update | Tier 3 | Feature strengthens inclusion but depends on live participation observation generation. | LiveKit/frontend observation windows, cooldown tuning, UI dismissal. | Human approved adding adaptive check-in. |
| CRT-007 | CJ-007 | Open dependency -> context resolver -> guarded Help, I'm Stuck explanation | Tier 3 | Grounded explanation was the highest-risk unimplemented promise in the scaffold. | Live transcript ingestion, LLM simplification, UI evidence display. | Human approved implementing context retrieval. |
| CRT-008 | CJ-008 | Open dependency -> observer scaffold -> generated low-activity observation events | Tier 3 | Adaptive check-in needed application-side evidence generation before UI/LiveKit claims. | LiveKit/frontend scheduler, reaction/audio/activity adapters, UI dismissal. | Human approved implementing observation generation. |
| CRT-009 | CJ-009 | Core ME behaviors -> learner UI/API scaffold -> end-to-end private support loop | Tier 3 | Help and adaptive support needed a usable learner surface before LiveKit integration. | LiveKit identity, scheduler, frontend polish, multi-learner sessions. | Human instructed continuation. |
| CRT-010 | CJ-010 | Prototype teacher-hosted topology -> future cloud option -> deployment dependency register | Tier 2 | The human introduced a future hosting direction that must not overwrite the current prototype topology. | Authentication, identity, room lifecycle, persistence, reachability, tenant isolation, operations. | Human requested a future-build note. |
| CRT-011 | CJ-011 | PRD boundary check -> clarification gate register -> learner lifecycle frontier | Tier 2 | Further multi-client implementation would otherwise turn unspecified lifecycle and privacy assumptions into architecture. | Workshop lifecycle, identity, activation, privacy, room behavior, deployment, and provider decisions. | Human requested explicit KRYSTALIZE documentation before continuing. |
| CRT-012 | CJ-012 | Existing-platform integration aim -> Zoom adapter target -> proof-mode clarification | Tier 2 | The human wants Bud's interoperability demonstrated, but a platform goal alone does not define the capture or privacy behavior. | Zoom authorization, participant identity, live/post-meeting evidence, and normalized event mapping. | Human approved aiming for a Zoom integration demonstration. |
| CRT-013 | CJ-013 | Clarification-order insight -> dependency ranking rule -> cross-document rewrite prevention | Tier 2 | The human identified that resolving lower-order questions first can force rework across later documentation segments. | All future KRYSTALIZE branches and their downstream contracts. | Human requested this process lesson be preserved. |
| CRT-014 | CJ-014 | Full-doc review -> missing gate discovery -> 24-item dependency order | Tier 2 | The human requested a fresh review to ensure no clarification area was overlooked and to rank the order before proceeding. | WorkshopModel, lifecycle, identity, privacy, evidence, state, platform, provider, cloud, and acceptance decisions. | Additional gates were found in source specs/contracts and formally added to the frontier. |
| CRT-015 | CJ-015 | PRD baseline -> clarification rationale -> stabilized target structure | Tier 2 | The human requested visible separation so team members and judges can understand why the original PRD, KRYSTALIZE, and final approved PRD are distinct stages. | PRD authority, clarification register, implementation readiness, and human approval. | Append-only PRD evolution record added without rewriting the original baseline. |

## Warning Events

Warnings must use exact KRYSTALIZE syntax.

| Event ID | Date | Warning Syntax | Severity Tier | Trigger | Implications | Warning-Linked Rationale | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WE-001 | 2026-07-25 | [WARNING :: AMBIGUITY] | Tier 4 | Source docs use "AI Partner"; new constitutional artifacts use "Bud AI". | A silent full rename could obscure source lineage. | Human clarified name after canonical docs were written. | Preserved AI Partner as lineage; generated artifacts use Bud AI. |
| WE-002 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 3 | Implementation depends on contracts not yet generated. | Coding now risks schema drift and unsupported behavior claims. | Handoff requires contract generation before implementation. | Resolved by generating `/docs/03_CONTRACTS/` artifacts. |
| WE-003 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 3 | Help, I'm Stuck requires live transcript/current-activity provider wiring for production grounding. | The scaffold now resolves stored context, but must not claim production transcript alignment until LiveKit/provider context ingestion exists. | The feature is accepted and scaffold-grounded; production provider wiring remains incomplete. | Open; implement during provider/context work. |
| WE-004 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 3 | Adaptive check-in requires LiveKit/frontend scheduling and richer activity streams for production periodic behavior. | The scaffold can generate observations from stored shared evidence, but must not claim production LiveKit-driven periodic detection yet. | The feature is accepted and scaffold-observed; adapter-driven participation analytics remain incomplete. | Open; wire scheduler and provider events during LiveKit/frontend work. |
| WE-005 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | Future cloud hosting requires deployment, identity, lifecycle, persistence, and operational decisions. | The prototype must not be described as cloud-hosted or production multi-workshop infrastructure. | The human introduced cloud hosting as a future build direction while keeping the teacher-hosted prototype topology. | Open; revisit before cloud deployment work. |
| WE-006 | 2026-07-25 | [WARNING :: AMBIGUITY] | Tier 2 | The PRD does not fully specify the workshop lifecycle, learner identity, Bud activation, privacy visibility, or multi-client authority model. | Further implementation could silently create product and privacy behavior that the human has not chosen. | The human requested a formal status check and clarification register before proceeding. | Open; clarify the gates in CJ-011 before deeper multi-client implementation. |
| WE-007 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | The Zoom integration goal requires a selected and permitted capture path, authorization model, and privacy boundary. | The project must not claim live Zoom AI assistance until the selected path is implemented and verified. | The human wants Bud to demonstrate integration with an existing platform; the architecture alone does not prove capture capability. | Open; clarify CG-015 before building the Zoom adapter. |
| WE-008 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | The contracts contain draft structures for WorkshopModel, evidence/confidence, correction, signals, groups, arbitration, and acceptance, but their operational semantics are not yet clarified. | Semantically final multi-client, facilitator, provider, or demo claims could encode assumptions that later require cross-document rewrites. | Fresh full-document review identified nine additional gates beyond the original 15. | Open; clarify the ranked CG-016 through CG-024 branches at the appropriate point in the queue. |
| WE-009 | 2026-07-25 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | The stabilized PRD structure depends on future human-approved clarification outcomes. | Part 3 must not be treated as implementation-final while the ranked gates remain unresolved. | The human requested a visible separation between the AREN baseline, KRYSTALIZE rationale, and final approved PRD. | Open; update Part 3 incrementally as gates are clarified. |

## Reset Events

Use when KRYSTALIZE RESET is invoked.

| Reset ID | Date | Session ID | Current Artifacts | Unresolved Issues Summary | Human Selection | Warning Emitted | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RESET-001 |  |  |  |  |  |  |  |

## Intent Drift Events

Use when current direction appears to differ from previously stated intent, locked truths, or accepted philosophy.

| Event ID | Date | Prior Intent | New Direction | Drift Description | Human Rationale | Status |
| --- | --- | --- | --- | --- | --- | --- |
| IDE-001 |  |  |  |  |  |  |

## Resolution Rationale

Record why a clarification became locked, deferred, accepted as uncertainty, or escalated.

| ID | Item Resolved | Resolution Type | Rationale | Authority Source | Linked State Item |
| --- | --- | --- | --- | --- | --- |
| RR-001 | Project AI name | clarified | Human explicitly named the AI Bud AI and short form Bud. | human | LT-001, LT-002 |
| RR-002 | Constitutional artifact prefix | clarified | Human explicitly requested constitution docs being updated use `K_BUD_AI...`. | human | LT-001, DEP-005 |
| RR-003 | Legacy AI Partner terminology | accepted_uncertainty | Existing canonical docs remain source lineage; no full rename was requested. | KRYSTALIZE traceability judgment | AU-002, W-002 |
| RR-004 | Contract-first implementation dependency | clarified | Four downstream contracts were generated and linked to the constitutional state. | canonical docs / human proceed instruction | DEP-001, UI-001, UI-002, UI-003, UI-004 |
| RR-005 | Implementation documentation bridge | clarified | Five implementation docs were generated and linked to the constitutional state. | human proceed instruction / contracts | DEP-006 |
| RR-006 | Executable scaffold | clarified | Dependency-free Node scaffold was generated and verified with demo/tests. | human proceed instruction / implementation docs | DEP-007 |
| RR-007 | Help, I'm Stuck feature | clarified | Human approved teammate recommendation; feature aligns with ME support and Bud thesis. | human | LT-009, DEP-008 |
| RR-008 | Adaptive Check-in feature | clarified | Human approved teammate recommendation; feature aligns with inclusion, ME privacy, and participant agency when grounded in observable activity only. | human | LT-010, DEP-009 |
| RR-009 | Help, I'm Stuck context retrieval scaffold | partially_clarified | Stored context retrieval and missing-context fallback are implemented; live provider ingestion remains unresolved. | human proceed instruction / scaffold verification | UI-008, W-003 |
| RR-010 | Adaptive participation observation scaffold | partially_clarified | Runtime can now generate low-activity observations from stored shared evidence and route them through the private adaptive check-in path; LiveKit/frontend scheduler wiring remains unresolved. | human proceed instruction / scaffold verification | UI-009, W-004 |
| RR-011 | Learner UI scaffold | partially_clarified | Learner can now trigger Help, send private messages, view private Bud replies, dismiss latest message, and run adaptive observation scan through the local API; LiveKit identity and production UI remain unresolved. | human proceed instruction / scaffold verification | UI-006 |
| RR-012 | Prototype teacher-hosted topology and future cloud option | partially_clarified | The prototype hosting owner is clarified as the workshop owner/teacher; cloud hosting is preserved as a future option, with deployment dependencies still open. | human clarification / future-build note | LT-011, DEP-010, AU-003, W-005 |
| RR-013 | PRD-to-implementation clarification boundary | clarified | The human requested explicit documentation of under-specified areas before further building; fourteen clarification gates and a first learner-lifecycle question were recorded. | human clarification / KRYSTALIZE session CJ-011 | CG-001 through CG-014, WE-006 |
| RR-014 | Zoom existing-platform integration target | clarified | The human approved aiming to demonstrate Bud integration with Zoom; the core remains LiveKit-first and the exact Zoom proof path remains unresolved. | human clarification / KRYSTALIZE session CJ-012 | LT-012, DEP-011, UI-011, CG-015, W-007 |
| RR-015 | Clarification ordering rule | clarified | The human explicitly identified dependency-based ranking before clarification as necessary to prevent cross-document rewriting. | human clarification / KRYSTALIZE session CJ-013 | COR-001 |
| RR-016 | Complete clarification frontier and priority order | clarified | A fresh review found nine additional gates and ranked all 24 by upstream dependency and rewrite risk. | human clarification / KRYSTALIZE session CJ-014 | CG-001 through CG-024, COR-001 |
| RR-017 | PRD evolution record | clarified | The PRD now preserves its original baseline, explains the 24 clarification areas and first-pass limitation, and defines a future human-approved stabilized form. | human clarification / KRYSTALIZE session CJ-015 | PRD Evolution Record, CG-001 through CG-024 |
| RR-018 | AI Partner design thesis | clarified | The human explicitly distinguished bounded AI partner agency from passive tool behavior and named the human friction Bud is intended to reduce. | human clarification / KRYSTALIZE session CJ-062 | LT-052, DEP-022 |
| RR-019 | Proactive learner and facilitator behavior | clarified | Periodic learner summaries and automatic aggregate room reports were accepted as expressions of the partner thesis and documented with privacy and evidence limits. | human clarification / implementation refinement / CJ-062 | LT-053, LT-054, DEP-023 |

## Deferred Issues

Deferred issues are not resolved. They are preserved for later review.

| ID | Issue | Reason Deferred | Impact | Revisit Trigger | Linked Warning |
| --- | --- | --- | --- | --- | --- |
| DI-001 | Full rename of all source docs from AI Partner to Bud AI | Human requested constitutional docs only. | Existing docs retain older terminology. | Human requests full rename pass. | WE-001 |
| DI-002 | Provider/model selection | Contract-first step should precede implementation wiring. | Blocks runtime implementation choices. | Before source implementation begins. | WE-002 |
| DI-003 | Cloud-hosted Bud AI server | Future direction is recorded, but deployment and operational requirements are not specified. | Does not affect the teacher-hosted prototype; blocks cloud implementation claims. | Before cloud deployment or multi-workshop hosting work. | WE-005 |
| DI-004 | Exact Zoom integration proof mode | The target is accepted, but live capture, embedded participation, and post-meeting ingestion have different technical and privacy implications. | Blocks Zoom adapter implementation and live integration claims. | Before Zoom adapter implementation. | WE-007 |
| DI-005 | Evidence, confidence, correction, signal, group, arbitration, and acceptance semantics | These areas are visible in the contracts but not yet settled as operational behavior. | Blocks semantically final shared-state, teacher-signal, multi-group, and proof implementations. | Work through CG-018 through CG-024 in the ranked order. | CJ-014 warning |

## Reopened Topics

Use when the human or project context reopens a previously locked, deferred, or accepted topic.

| ID | Session ID | Topic | Previous Status | Reason Reopened | Current Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RT-001 |  |  |  |  |  |  |

## Governance Notes

Governance notes record authority-relevant context without creating new authority.

| ID | Note | Related Item | Authority Boundary | Follow-Up |
| --- | --- | --- | --- | --- |
| GN-001 | Bud AI naming is human-authorized and locked for generated constitutional artifacts. | LT-001, LT-002 | Naming authority belongs to the human project owner. | Use Bud AI / Bud in future generated docs. |
| GN-002 | KRYSTALIZE records unresolved dependencies but does not finalize provider, governance, or architecture optimization decisions. | UI-001 through UI-007 | KRYSTALIZE jurisdiction is clarification, not final governance. | Generate contracts without pretending unresolved choices are settled. |
| GN-003 | Adaptive check-in may invite participation but must never diagnose quietness. | LT-010, DEP-009 | Participant agency and privacy remain controlling authority. | Keep check-ins optional, private, and dismissible. |
| GN-004 | Clarification order must be ranked before a substantial KRYSTALIZE pass. | COR-001 | The human project owner controls clarification priority; KRYSTALIZE preserves the dependency reasoning. | Rank the frontier before opening the next clarification branch and re-rank when higher-order ambiguity appears. |
| GN-005 | The complete future clarification queue is dependency-ordered, with the WorkshopModel authority decision first. | CG-016 through CG-024, COR-001 | The human project owner controls priority; the ranking protects cross-document consistency without finalizing the underlying decisions. | Begin the next clarification pass with CG-016 and maintain one active question at a time. |
| GN-006 | The PRD must show its evolution from AREN baseline through KRYSTALIZE to human-approved stabilization. | PRD Evolution Record | The human project owner controls final PRD approval; historical baseline and unresolved meaning must remain traceable. | Do not replace the original baseline or label Part 3 final before the relevant gates are settled. |
| GN-007 | Bud's agency is bounded partnership, not autonomous authority. | LT-052 | Bud may proactively support a shared workshop goal, but privacy, evidence, participant agency, and facilitator authority remain controlling boundaries. | Preserve the distinction in product messaging, UI behavior, and demo claims. |

## Major Constitutional Shifts

Use for significant changes in project intent, philosophy, jurisdiction, accepted uncertainty, or locked truth.

| ID | Date | Shift | Previous State | New State | Rationale | Trace Links |
| --- | --- | --- | --- | --- | --- | --- |
| MCS-001 | 2026-07-25 | Product AI naming clarified. | Project referred to as AI Partner in source docs. | Current generated constitutional artifacts refer to Bud AI / Bud. | Human explicitly named the AI. | TR-001 |

## Traceability Index

Use this section to preserve machine/human-readable traceability.

| Trace ID | Journal Entry | Related State Item | Source | Notes |
| --- | --- | --- | --- | --- |
| TR-001 | CJ-001 | LT-001, LT-002 | Human clarification on 2026-07-25 | Bud AI / Bud naming locked. |
| TR-002 | CJ-001 | LT-003, AU-002 | Existing canonical docs | AI Partner retained as source lineage. |
| TR-003 | CJ-001 | W-001 | `CODEX_KRYSTALIZE_HANDOFF.md` | Contract generation dependency identified. |
| TR-004 | CJ-002 | DEP-001, UI-001 | `docs/03_CONTRACTS/STATE_MODEL_CONTRACT.md` | State model contract generated. |
| TR-005 | CJ-002 | DEP-001, UI-002 | `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md` | Normalized event contract generated. |
| TR-006 | CJ-002 | DEP-001, UI-003 | `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md` | AI decision contract generated. |
| TR-007 | CJ-002 | DEP-001, UI-004 | `docs/03_CONTRACTS/TOOL_CONTRACT.md` | Tool contract generated. |
| TR-008 | CJ-003 | DEP-006 | `docs/04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md` | Implementation plan generated. |
| TR-009 | CJ-003 | DEP-006 | `docs/04_IMPLEMENTATION/REPO_STRUCTURE.md` | Repository structure plan generated. |
| TR-010 | CJ-003 | DEP-006 | `docs/04_IMPLEMENTATION/MVP_BUILD_SEQUENCE.md` | MVP build sequence generated. |
| TR-011 | CJ-003 | DEP-006 | `docs/04_IMPLEMENTATION/PROVIDER_ABSTRACTION_PLAN.md` | Provider abstraction plan generated. |
| TR-012 | CJ-003 | DEP-006 | `docs/05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md` | Test and demo plan generated. |
| TR-013 | CJ-004 | DEP-007 | `bud-ai/README.md` | Scaffold README generated. |
| TR-014 | CJ-004 | DEP-007 | `bud-ai/apps/server/src/runtime.js` | Text-first runtime generated. |
| TR-015 | CJ-004 | DEP-007 | `bud-ai/apps/server/src/core/bud-core.js` | Bud Core deterministic scaffold generated. |
| TR-016 | CJ-004 | DEP-007 | `bud-ai/packages/docs/03_CONTRACTS/src/validators.js` | Runtime validators generated. |
| TR-017 | CJ-004 | DEP-007 | `bud-ai/tests/run-tests.js` | Scaffold tests generated and passed. |
| TR-018 | CJ-005 | LT-009, DEP-008 | `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md` | `ai_partner_request.request_type = help_stuck` added. |
| TR-019 | CJ-005 | LT-009, DEP-008 | `docs/03_CONTRACTS/TOOL_CONTRACT.md` | `send_help_stuck_explanation` added. |
| TR-020 | CJ-005 | LT-009, DEP-008 | `bud-ai/apps/server/src/core/bud-core.js` | Help, I'm Stuck decision path added. |
| TR-021 | CJ-005 | LT-009, DEP-008 | `bud-ai/tests/run-tests.js` | Help, I'm Stuck test added. |
| TR-022 | CJ-006 | LT-010, DEP-009 | `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md` | `participation_observation` event added. |
| TR-023 | CJ-006 | LT-010, DEP-009 | `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md` | Adaptive check-in HELP semantics added. |
| TR-024 | CJ-006 | LT-010, DEP-009 | `docs/03_CONTRACTS/TOOL_CONTRACT.md` | `send_private_checkin.checkin_type = adaptive_participation` added. |
| TR-025 | CJ-006 | LT-010, DEP-009 | `bud-ai/apps/server/src/core/bud-core.js` | Adaptive check-in decision path added. |
| TR-026 | CJ-006 | LT-010, DEP-009 | `bud-ai/tests/run-tests.js` | Adaptive check-in tests added. |
| TR-027 | CJ-007 | UI-008, W-003 | `bud-ai/apps/server/src/context/context-resolver.js` | Context resolver added. |
| TR-028 | CJ-007 | UI-008, W-003 | `bud-ai/apps/server/src/core/bud-core.js` | Help, I'm Stuck now uses resolved context or asks privately when missing. |
| TR-029 | CJ-007 | UI-008, W-003 | `bud-ai/apps/server/src/tools/tool-executor.js` | Missing source context refs are rejected. |
| TR-030 | CJ-007 | UI-008, W-003 | `bud-ai/tests/run-tests.js` | Grounded and missing-context tests added. |
| TR-031 | CJ-008 | UI-009, W-004 | `bud-ai/apps/server/src/observation/participation-observer.js` | Observer generates low-activity participation events from recent shared evidence. |
| TR-032 | CJ-008 | UI-009, W-004 | `bud-ai/apps/server/src/runtime.js` | Runtime exposes `observeParticipation(...)` for scheduler/adapter use. |
| TR-033 | CJ-008 | UI-009, W-004 | `bud-ai/tests/run-tests.js` | Observer tests cover quiet participant, active participant, cooldown, and empty-room behavior. |
| TR-034 | CJ-009 | UI-006 | `bud-ai/apps/web/src/app/index.html` | Learner UI scaffold added. |
| TR-035 | CJ-009 | UI-006 | `bud-ai/apps/web/src/app/styles.css` | Learner UI styling added. |
| TR-036 | CJ-009 | UI-006 | `bud-ai/apps/web/src/app/app.js` | Learner UI API wiring added. |
| TR-037 | CJ-009 | UI-006 | `bud-ai/apps/server/src/index.js` | Local HTTP server and learner API added. |
| TR-038 | CJ-009 | UI-006 | `bud-ai/tests/run-tests.js` | Learner server API smoke test added. |
| TR-039 | CJ-010 | LT-011, DEP-010, AU-003, W-005 | `docs/04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md`, `docs/04_IMPLEMENTATION/MVP_BUILD_SEQUENCE.md` | Prototype teacher-hosted topology and future cloud hosting option recorded. |
| TR-040 | CJ-012 | LT-012, DEP-011, UI-011, CG-015, W-007 | `docs/04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md` | Zoom recorded as the first existing-platform integration target; proof mode remains unresolved. |
| TR-041 | CJ-013 | COR-001 | `docs/02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_STATE.md` | Dependency-based clarification ranking recorded as a process rule to prevent cross-document rewrite. |
| TR-042 | CJ-014 | CG-016 through CG-024 | `docs/02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_STATE.md` | Full-doc review identified nine additional gates and recorded the authoritative priority order. |
| TR-043 | CJ-015, CJ-032 | Active native-platform PRD | `PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` | Restored as the active PRD after the unresolved Zoom-first candidate was retired. |
| TR-044 | CJ-031, CJ-032 | Zoom-first PRD candidate | `docs/archive/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS_V2_ZOOM_FIRST_STALE.md` | Retained as stale traceability history; it is not an active PRD or a completed KRYSTALIZE decision. |
