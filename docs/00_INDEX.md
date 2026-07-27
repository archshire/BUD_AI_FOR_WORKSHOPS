# Bud AI Documentation Index

**Status:** Canonical reconstructed edition  
**Basis:** Preserved conversation decisions, official hackathon brief/team ideation, ADR content preserved in conversation, and the red-team-revised System Behavior Specification.

## Start Here

- Source problem statement: `00_SOURCE/Problem Statement (Final).pdf`
- Active PRD: `01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`
- Current constitutional state: `02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_STATE.md`
- Implementation/demo status: `05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md`
- Formal architecture: `04_IMPLEMENTATION/ARCHITECTURE.md`
- Runnable application: `../bud-ai/README.md`

## Complete Contents

This page is the navigation page for the documentation set. Each link points
to the document's primary purpose or the most relevant section.

### Source

- [Problem Statement (Final)](<00_SOURCE/Problem Statement (Final).pdf>) - source
  requirements and judging context.

### Product And Direction

- [Product Constitution](01_PRODUCT/01_PRODUCT_CONSTITUTION_CANONICAL.md#1-ai-as-partner-not-merely-tool) - governing product principles, agency, privacy, and authority.
- [Demo Thesis / Video Specification](01_PRODUCT/02_DEMO_THESIS_VIDEO_SPEC_CANONICAL.md#demo-thesis) - what the demonstration must prove.
- [Prototype Capability Contract](01_PRODUCT/03_PROTOTYPE_CAPABILITY_CONTRACT_CANONICAL.md#core-claim) - must-prove capabilities, constraints, and prohibited shortcuts.
- [ADR-001 Realtime Workshop Architecture](01_PRODUCT/04_ADR_001_REALTIME_WORKSHOP_AND_INTEGRATION_ARCHITECTURE_CANONICAL.md#decision) - accepted LiveKit-first architecture decision.
- [System Behavior Specification](01_PRODUCT/05_SYSTEM_BEHAVIOR_SPEC_v1.0_CANDIDATE.md#1-purpose) - runtime behavior, intervention, privacy, and uncertainty rules.
- [Consistency And Traceability Report](01_PRODUCT/06_CONSISTENCY_AND_TRACEABILITY_REPORT.md#cross-document-consistency-audit) - cross-document consistency audit.
- [AI Partner Team Overview](01_PRODUCT/AI_PARTNER_TEAM_OVERVIEW.md#1-what-are-we-building-in-one-sentence) - concise explanation of the AI Partner concept.
- [Quick Project Brief](01_PRODUCT/QUICK_PROJECT_BRIEF_AI_PARTNER.md#what-are-we-building) - short project overview and rationale.
- [Active PRD](01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md#3-product-thesis) - complete current product requirements and AI Partner design thesis.

### Krystalize State And Decisions

- [Constitutional State](02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_STATE.md#project-intent) - locked truths, dependencies, accepted uncertainty, and traceability.
- [Constitutional Journal](02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_JOURNAL.md#clarification-sessions) - chronological clarification sessions and rationale.
- [Codex Krystalize Handoff](02_KRYSTALIZE/CODEX_KRYSTALIZE_HANDOFF.md#purpose) - handoff protocol and implementation boundary.

### Contracts

- [State Model Contract](03_CONTRACTS/STATE_MODEL_CONTRACT.md#workshopstate) - workshop, participant, facilitator projection, and privacy state.
- [Normalized Event Contract](03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md#event-envelope) - platform-independent event boundary.
- [AI Decision Contract](03_CONTRACTS/AI_DECISION_CONTRACT.md#decision-envelope) - structured Bud decisions, confidence, authority, and validation.
- [Tool Contract](03_CONTRACTS/TOOL_CONTRACT.md#tool-execution-rule) - bounded tools, permissions, and side effects.

### Architecture And Implementation

- [Formal Architecture](04_IMPLEMENTATION/ARCHITECTURE.md#logical-architecture) - logical architecture, Docker topology, technology choices, rationale, and privacy boundaries.
- [Implementation Plan](04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md#architecture) - implementation objective, runtime responsibilities, and deployment evolution.
- [MVP Build Sequence](04_IMPLEMENTATION/MVP_BUILD_SEQUENCE.md#sequence) - ordered implementation stages and proof gates.
- [Provider Abstraction Plan](04_IMPLEMENTATION/PROVIDER_ABSTRACTION_PLAN.md#locked-prototype-default) - Qwen, Whisper, NLLB, provider interfaces, and replacement criteria.
- [Repository Structure](04_IMPLEMENTATION/REPO_STRUCTURE.md#current-documentation-and-source-layout) - source ownership boundaries and repository conventions.

### Demo And Testing

- [Test And Demo Plan](05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md#problem-statement-traceability) - problem-statement coverage, demo scenes, tests, and acceptance gates.
- [Quality Testing Guide](05_DEMO_AND_TESTING/QUALITY_TESTING_GUIDE.md#the-three-tests) - how to measure transcription and translation accuracy against recorded audio.

### Historical Archive

- [Stale Zoom-First PRD](archive/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS_V2_ZOOM_FIRST_STALE.md#1-product-definition) - preserved history only; not the active build direction.

### Runnable Application Documentation

- [Application README](../bud-ai/README.md#quick-start) - local and Docker startup, browser routes, capabilities, and known limitations.
- [Root README](../README.md#why-bud-ai-exists) - project thesis, repository map, and teammate Docker handoff.
- [License](../LICENSE) - license for original project code and documentation.
- [Third-Party Notices](../THIRD_PARTY_NOTICES.md) - dependency, model, and asset licensing notes.

## Authority order

These documents are complementary, not duplicates:

1. **Product Constitution** — governing product principles and decision doctrine.
2. **Demo Thesis / Video Demo Specification** — what evidence the demonstration should show.
3. **Prototype Capability Contract** — what the downloadable prototype must genuinely do and what it must not claim.
4. **ADR-001** — architecture and integration decisions.
5. **System Behavior Specification v1.0 Candidate** — behavioral rules, state scopes, privacy projection, intervention doctrine, failure/uncertainty behavior, and red-team safeguards.
6. **Consistency and Traceability Report** — cross-document audit and precedence notes.

The active PRD is `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`. The prior Zoom-first candidate is retained as `docs/archive/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS_V2_ZOOM_FIRST_STALE.md` for traceability only; it is not an active build direction. The restoration preserves the earlier KRYSTALIZE decisions rather than silently erasing the abandoned candidate.

If documents appear to conflict, later implementation-specific documents refine earlier principles but must not silently overturn the Product Constitution. Explicit accepted architecture decisions in ADR-001 govern architecture. The System Behavior Specification governs runtime behavior.

## Canonical terminology

- **AI Partner**: proactive but bounded AI operating toward a shared workshop objective without displacing human agency.
- **ME / US / THE ROOM**: participant-level, group-level, and workshop/facilitator-level reasoning scopes.
- **WorkshopModel**: human-approved operational compass defining objective, stages, tasks, expected outcomes, and success/readiness conditions.
- **WorkshopState**: evolving evidence-based view of where the live workshop appears to be relative to the WorkshopModel.
- **Observation → Interpretation → Inference → Revision**: epistemic loop.
- **Derived operational meaning**: minimum necessary facilitator-facing signal; not permission to expose raw private content.
- **Platform-independent AI Partner Core**: intelligence layer independent of LiveKit/Zoom/Meet.
