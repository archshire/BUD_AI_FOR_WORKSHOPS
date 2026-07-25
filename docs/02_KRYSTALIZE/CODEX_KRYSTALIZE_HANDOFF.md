# CODEX_KRYSTALIZE_HANDOFF.md

**Status:** Canonical Handoff Protocol\
**Purpose:** Govern how Codex uses `KRYSTALIZE.md` with the canonical
project documentation before technical crystallization and
implementation.

------------------------------------------------------------------------

# 1. Mission

You are receiving an already-developed product specification for a
bounded hackathon prototype.

Do **not** begin coding immediately.

Your first responsibility is to preserve semantic integrity: understand
what has been decided, what remains unresolved, what is
dependency-blocking, and what must not be silently changed during
implementation.

`KRYSTALIZE.md` is to be used as a **semantic clarification and
constitutional-state protocol**.

It is **not** permission to redesign the product, optimize away product
doctrine, expand MVP scope, or silently resolve ambiguity.

------------------------------------------------------------------------

# 2. Human Intent Statement

We are building a functional hackathon prototype that demonstrates **AI
as an active but bounded partner in multilingual workshop
facilitation**.

The prototype must prove that AI can help preserve and repair **shared
meaning**, not merely translate language, across three scopes:

-   **ME** --- the individual participant;
-   **US** --- interaction and shared meaning between
    participants/groups;
-   **THE ROOM** --- facilitator awareness of workshop-level state and
    patterns.

The product must preserve:

-   human agency;
-   privacy and trust;
-   evidence before inference;
-   revisable AI understanding;
-   human authority over intended meaning;
-   facilitator authority over consequential workshop decisions;
-   bounded AI initiative;
-   integrity between what the demo claims and what the repository
    actually implements.

The accepted product philosophy and accepted architecture are to be
preserved.

Use Krystalize to expose remaining ambiguity, contradictions, dependency
gaps, and intent drift before implementation.

Do not use Krystalize to reinterpret the product or expand scope.

------------------------------------------------------------------------

# 3. Authoritative Inputs

Read the canonical documentation before technical implementation.

Recommended reading order:

``` text
00_DOCUMENTATION_INDEX.md
        ↓
01_PRODUCT_CONSTITUTION.md
        ↓
03_PROTOTYPE_CAPABILITY_CONTRACT.md
        ↓
05_SYSTEM_BEHAVIOR_SPEC.md
        ↓
04_ADR-001.md
        ↓
06_PRD.md
        ↓
02_DEMO_THESIS.md
```

The Demo Thesis is evidence strategy, not the source of product truth.

The video must demonstrate implemented behavior; implementation must not
be reverse-engineered merely to reproduce the video.

`KRYSTALIZE.md` governs the semantic clarification process itself.

------------------------------------------------------------------------

# 4. Document Authority

Use the following authority model when interpreting the documentation.

## Product Constitution

Governs foundational product doctrine:

-   AI as partner;
-   human agency;
-   epistemic humility;
-   privacy/trust;
-   ME → US → THE ROOM;
-   prototype integrity.

Do not silently violate these principles for implementation convenience.

## Prototype Capability Contract

Governs what the hackathon prototype must genuinely prove versus what
may remain lighter, constrained, architectural, or future-facing.

Use it to prevent scope inflation.

## System Behavior Specification

Governs runtime behavioral doctrine:

-   Observation → Interpretation → Inference → Revision;
-   state scopes;
-   uncertainty;
-   privacy-aware projection;
-   intervention behavior;
-   escalation;
-   self-error hypothesis;
-   adversarial safeguards.

## ADR-001

Governs accepted architecture.

Accepted direction includes:

-   platform-independent AI Partner Core;
-   normalized event boundary;
-   LiveKit-first standalone prototype;
-   application-owned authoritative state, permissions, and allowed
    actions;
-   Zoom as secondary/future unless explicitly implemented;
-   Google Meet as future adapter unless explicitly implemented.

Changing an accepted architectural decision requires an explicit
new/superseding ADR. Do not silently rewrite ADR-001.

## PRD

Governs buildable product requirements, user journeys, scope, acceptance
criteria, non-functional requirements, and Definition of Done.

The PRD operationalizes upstream doctrine; it does not silently
supersede constitutional principles.

## Demo Thesis

Governs how implemented capabilities are demonstrated.

It must never be used to justify hard-coded intelligence.

------------------------------------------------------------------------

# 5. Phase 1 --- Ingest Before Acting

Before writing implementation code:

1.  Read all authoritative documents.
2.  Identify canonical terminology.
3.  Identify explicit decisions.
4.  Identify unresolved decisions.
5.  Identify dependencies between unresolved decisions and
    implementation.
6.  Identify any apparent contradictions or intent drift.
7.  Do not infer that every unspecified technical detail is implicitly
    decided.

Preserve the distinction between:

``` text
LOCKED
UNRESOLVED
DEPENDENCY_BLOCKED
ACCEPTED_UNCERTAINTY
```

Do not collapse these states into false certainty.

------------------------------------------------------------------------

# 6. Phase 2 --- Apply KRYSTALIZE

Use `KRYSTALIZE.md` according to its actual jurisdiction.

Krystalize may be used to:

-   clarify ambiguity;
-   surface assumptions;
-   trace dependencies;
-   detect contradictions;
-   detect intent drift;
-   preserve unresolved semantic terrain;
-   generate constitutional-state artifacts.

Krystalize must **not** be used as permission to:

-   finalize product governance decisions without human authority;
-   silently choose between materially different product
    interpretations;
-   optimize or replace accepted architecture;
-   perform adversarial viability evaluation outside its jurisdiction;
-   expand MVP scope;
-   convert uncertainty into implementation assumptions merely because
    coding requires a value.

Generate and maintain:

``` text
K_[PROJECT]_CONSTITUTIONAL_STATE.md
K_[PROJECT]_CONSTITUTIONAL_JOURNAL.md
```

The Constitutional State should make the current semantic terrain
explicit.

The Constitutional Journal should record meaningful changes in
understanding/decisions from this canonical baseline onward.

Do not attempt to reconstruct the entire historical chat as the journal.

------------------------------------------------------------------------

# 7. Non-Collapse Rule

When documentation leaves a meaningful choice unresolved, preserve it.

Example:

If confidence representation is unresolved between:

``` text
categorical
numerical
hybrid
```

do not silently implement:

``` text
confidence: float 0.0–1.0
```

and allow that convenience to become architecture.

Instead classify the uncertainty and determine whether it blocks
implementation.

If it is dependency-blocking, surface it for decision.

If it can safely remain implementation-local without altering product
meaning, document the assumption explicitly.

------------------------------------------------------------------------

# 8. Stop Conditions

Do not silently proceed when Krystalize identifies material conditions
such as:

``` text
[WARNING :: CONTRADICTION]
```

or:

``` text
[WARNING :: INTENT_CHANGE_DETECTED]
```

or unresolved Tier 1 / Tier 2 ambiguity that materially changes:

-   product behavior;
-   privacy;
-   human authority;
-   AI authority;
-   MVP claims;
-   architecture;
-   acceptance criteria;
-   data exposure;
-   demo integrity.

Where the Krystalize protocol indicates:

``` text
[ESCALATION :: FURTHER_REASONING_REQUIRED]
```

stop semantic crystallization at that boundary and surface the issue for
the appropriate next reasoning/decision process.

Do not manufacture consensus.

------------------------------------------------------------------------

# 9. Protected Product Invariants

Unless explicitly changed by an authorized human decision and documented
appropriately, preserve these invariants.

## AI partnership

> AI initiative without displacement of human agency.

## Epistemic model

``` text
Observation
    ↓
Interpretation
    ↓
Inference
    ↓
Evidence / Confidence
    ↓
Action or WAIT
    ↓
New Observation
    ↓
Revision
```

Inference is not fact.

Unknown is legitimate.

## Human meaning authority

The AI may propose meaning.

Humans remain authoritative over what they intended.

## ME → US → THE ROOM

Do not collapse participant, group, and workshop state into one generic
AI summary.

Higher-level state does not automatically overwrite lower-level state.

## Privacy

Raw private content does not automatically cross to facilitators.

Derived information must use **minimum-necessary operational
projection**.

Permission must be application-enforced where required.

## Intervention

The AI does not act merely because it noticed something.

`WAIT / NO_ACTION` is valid intelligent behavior.

Use the minimum sufficient intervention and smallest appropriate social
scope.

## System self-error hypothesis

Before attributing misunderstanding to a human, consider whether:

-   STT;
-   translation;
-   lost context;
-   summarization;
-   AI interpretation

may have introduced the discrepancy.

## Prototype integrity

> Simulate scale. Seed setup. Simplify infrastructure. Never simulate
> claimed intelligence.

No hard-coded demo misunderstandings, fake reasoning, fake permission
enforcement, or seeded recommendations presented as dynamic AI
conclusions.

------------------------------------------------------------------------

# 10. Scope Discipline

The hackathon prototype must prove deeply:

``` text
ME
dynamic participant understanding/support

US
multilingual peer meaning repair

THE ROOM
facilitator state/pattern synthesis + recommendation

PRIVACY
private-content boundary + operational signals

LANGUAGE
original → utterance-level translation → contextual repair

INPUT
voice + text

INTELLIGENCE
context-dependent, non-scripted evaluation
```

The following may be architecturally supported but lighter or
future-facing unless the PRD explicitly promotes them:

-   advanced longitudinal modeling;
-   sophisticated multi-group inference;
-   fine-grained consent systems;
-   complex intervention arbitration;
-   extensive workshop-definition workflows;
-   production-grade accessibility/compliance;
-   Zoom adapter;
-   Google Meet adapter;
-   durable multi-workshop memory;
-   multi-agent orchestration;
-   local/open-source inference.

Do not convert future architecture into MVP requirements without
explicit authorization.

------------------------------------------------------------------------

# 11. Phase 3 --- Produce Semantic Integrity Output

Before technical crystallization, produce a concise readiness report
containing:

``` text
LOCKED DECISIONS

UNRESOLVED DECISIONS

DEPENDENCY-BLOCKING DECISIONS

ACCEPTED UNCERTAINTIES

CONTRADICTIONS, IF ANY

INTENT-DRIFT WARNINGS, IF ANY

IMPLEMENTATION READINESS:
READY / READY WITH DOCUMENTED ASSUMPTIONS / BLOCKED
```

For each blocker, state:

-   affected requirement/contract;
-   source documents;
-   why implementation depends on it;
-   available options without silently choosing.

If no blocker exists, proceed.

------------------------------------------------------------------------

# 12. Phase 4 --- Technical Crystallization

Once semantic terrain is sufficiently stable, derive the implementation
contracts.

Create:

``` text
/docs/03_CONTRACTS/
    STATE_MODEL_CONTRACT.md
    NORMALIZED_EVENT_CONTRACT.md
    AI_DECISION_CONTRACT.md
    TOOL_CONTRACT.md
```

These contracts must **derive from** the canonical documentation.

They must not redefine product doctrine.

## State Model Contract

Define exact MVP fields, types, provenance, lifecycle, staleness,
privacy classification, update rules, and relationships for implemented
state objects.

At minimum address the MVP-relevant portions of:

-   WorkshopModel;
-   ParticipantState;
-   GroupState;
-   WorkshopState;
-   FacilitatorViewState.

## Normalized Event Contract

Define exact platform-independent events and payloads needed by the MVP.

Separate communication-platform details from core semantic events.

## AI Decision Contract

Define:

-   model context/input;
-   structured output;
-   evidence references;
-   uncertainty/confidence behavior;
-   allowed decision categories;
-   `WAIT / NO_ACTION`;
-   intervention arbitration expectations;
-   self-error hypothesis;
-   invalid/unsafe output handling.

## Tool Contract

Define exact bounded actions:

-   parameters;
-   authorization;
-   permission requirements;
-   side effects;
-   idempotency where relevant;
-   failure behavior;
-   audit/logging expectations.

The model proposes/selects bounded actions.

The application validates and executes them.

------------------------------------------------------------------------

# 13. Technical Decisions

When an exact technical choice remains open:

1.  Determine whether it changes product meaning.
2.  Determine whether it violates an accepted ADR.
3.  Determine whether it is reversible and implementation-local.

If product-significant or architecture-significant:

> Surface it. Do not silently decide.

If safely implementation-local:

> Choose deliberately, document the assumption/rationale, and preserve
> abstraction boundaries where required.

Examples include provider/model choices that are explicitly left open by
the canonical documents.

------------------------------------------------------------------------

# 14. Phase 5 --- Implementation Plan

After contracts are stable, create an implementation plan ordered by
dependency.

The expected high-level priority is:

``` text
1. Core domain/state + normalized event boundary
2. AI decision/tool contracts
3. LiveKit standalone real-time workshop
4. Voice/text capture
5. Multilingual STT + utterance completion + translation
6. ME behavior
7. US meaning repair
8. THE ROOM facilitator synthesis
9. Privacy/permission enforcement
10. Failure/adversarial behavior
11. Acceptance tests
12. Demo polish
13. Zoom adapter only if core is stable and scope permits
```

Adjust exact ordering only with documented technical justification.

Do not sacrifice MUST-PROVE-DEEPLY capabilities to implement secondary
integrations.

------------------------------------------------------------------------

# 15. Phase 6 --- Build Rules

During implementation:

-   do not invent product behavior silently;
-   do not use LLM memory as authoritative application state;
-   do not let model output bypass authorization/permission;
-   do not expose private content through summaries that reveal
    unnecessary sensitive causes;
-   do not treat translation as authoritative original meaning;
-   do not treat AI confidence as calibrated truth unless actually
    calibrated;
-   do not let stale inference remain permanently urgent;
-   do not infer disengagement from silence alone;
-   do not equate disagreement with misunderstanding;
-   do not mark understanding solely because a learner repeated
    AI-supplied wording;
-   do not trigger expensive reasoning on every token without behavioral
    need;
-   do not couple core intelligence directly to LiveKit/Zoom-specific
    objects;
-   do not build demo-only logic.

When ambiguity appears during coding, classify it rather than
improvising product policy.

------------------------------------------------------------------------

# 16. Phase 7 --- Verification

Map every major claim through:

``` text
Problem requirement
        ↓
Product principle
        ↓
Prototype capability
        ↓
System behavior
        ↓
Architecture mechanism
        ↓
PRD requirement
        ↓
Implementation
        ↓
Acceptance test
        ↓
Demo evidence
```

A claim is not complete merely because code exists.

It must be observable and testable.

Required adversarial cases include:

1.  AI inference is wrong and participant corrects it.
2.  Silence/insufficient evidence does not become a negative judgment.
3.  AI-supplied wording is not automatically treated as independent
    understanding.
4.  Duplicate ME/US/ROOM interventions are suppressed/coordinated.
5.  Stale inference does not remain indefinitely urgent.
6.  Participant disputes translation and dependent inference is
    reconsidered.
7.  Shared bad translation is considered as a possible system-caused
    pattern.
8.  Sensitive private cause is reduced to minimum-necessary operational
    signal.
9.  Permission denial prevents private-content access.
10. Facilitator rejects recommendation and AI respects the decision.
11. Productive disagreement is not automatically classified as
    misunderstanding.
12. Participant, group, and workshop states may legitimately differ.

------------------------------------------------------------------------

# 17. Demo Integrity Gate

Before submission, verify:

``` text
Can a judge vary the input
within the documented supported domain?
        ↓
Does the system still:
capture evidence
reason from current context
produce bounded behavior
update from new evidence
preserve privacy/authority
and explain meaningful state?
```

If the answer depends on the exact scripted demo wording, the capability
is not complete.

> **The video demonstrates the product. It must never be what makes the
> product appear to work.**

------------------------------------------------------------------------

# 18. Expected Repository Artifacts

Target structure:

``` text
/README.md

/docs/
    00_DOCUMENTATION_INDEX.md
    01_PRODUCT_CONSTITUTION.md
    02_DEMO_THESIS.md
    03_PROTOTYPE_CAPABILITY_CONTRACT.md
    04_ADR-001.md
    05_SYSTEM_BEHAVIOR_SPEC.md
    06_PRD.md

/skills/
    KRYSTALIZE.md

/CODEX_KRYSTALIZE_HANDOFF.md

/docs/02_KRYSTALIZE/
    K_[PROJECT]_CONSTITUTIONAL_STATE.md
    K_[PROJECT]_CONSTITUTIONAL_JOURNAL.md

/docs/03_CONTRACTS/
    STATE_MODEL_CONTRACT.md
    NORMALIZED_EVENT_CONTRACT.md
    AI_DECISION_CONTRACT.md
    TOOL_CONTRACT.md

/docs/04_IMPLEMENTATION/
    IMPLEMENTATION_PLAN.md
    ACCEPTANCE_TEST_MATRIX.md
```

Exact repository organization may be adjusted if technically necessary,
but document authority and traceability must remain clear.

------------------------------------------------------------------------

# 19. Final Instruction to Codex

Do not mistake completeness of prose for completeness of implementation.

Do not mistake ambiguity for permission to invent.

Do not mistake future architecture for MVP scope.

Do not mistake AI inference for truth.

Do not mistake translation for shared meaning.

Do not mistake a successful demo for a successful product.

Use Krystalize to preserve the semantic terrain.

Use the technical contracts to make that terrain executable.

Use the PRD and acceptance tests to determine whether the build is
complete.

Then build the smallest system that **genuinely proves the thesis**.
