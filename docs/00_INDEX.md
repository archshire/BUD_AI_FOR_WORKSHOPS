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
