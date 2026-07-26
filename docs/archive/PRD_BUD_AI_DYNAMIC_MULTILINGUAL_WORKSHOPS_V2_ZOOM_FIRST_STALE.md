# PRD --- Bud AI for Zoom-Integrated Dynamic Multilingual Workshops

**Version:** 2.0 --- KRYSTALIZE-rewritten candidate, retained as stale history\
**Status:** Stale --- not an active PRD or build direction\
**Purpose:** Define the timeboxed Bud AI prototype that integrates with
Zoom as its primary demonstration surface while preserving a minimal
standalone fallback path.\
**Governed by:** Product Constitution, Prototype Capability Contract,
ADR-001, System Behavior Specification, and Codex/Krystalize Handoff
Protocol.

**Evolution authority:** This PRD is being rewritten by KRYSTALIZE from
the preserved AREN-originated baseline in
`PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`.
The active native-platform PRD is retained separately. This Version 2
candidate remains only as traceable history and must not be treated as
the active direction.

## Contents

- [Product Definition](#1-product-definition)
- [Problem](#2-problem)
- [Product Thesis](#3-product-thesis)
- [Prototype Objective](#4-prototype-objective)
- [MVP Scope](#7-mvp-scope)
- [Core User Journey](#8-core-user-journey)
- [Language and Meaning](#11-language-and-meaning-requirements)
- [ME Requirements](#12-me--participant-ai-partner-requirements)
- [THE ROOM Requirements](#14-the-room--facilitator-ai-requirements)
- [Privacy and Trust](#15-privacy-trust-and-permission-requirements)
- [Architecture Constraints](#21-architecture-constraints)
- [Acceptance Matrix](#24-acceptance-matrix--core-product-claims)
- [Explicit Non-Goals](#26-explicit-non-goals)
- [Final Product Contract](#31-final-product-contract)
- [PRD Evolution Record](#prd-evolution-record)

------------------------------------------------------------------------

# 1. Product Definition

We are building a functional prototype of **Bud AI as an easy-to-use AI
companion for Zoom-based real-time multilingual workshops**.

The primary demo uses Zoom. Bud's platform-independent intelligence
connects to permitted Zoom voice, text, transcript, and meeting events.
A minimal standalone Bud/LiveKit path is retained as a deliberate
teacher-launched fallback, not as the main platform build for this
timeboxed MVP.

The product addresses a deeper problem than literal translation:

> **The language barrier does not end when a sentence is translated. It
> ends when people have enough shared meaning to continue working
> together.**

The system therefore combines real-time multilingual communication with
bounded AI partnership.

The AI Partner may listen to permitted workshop input, evaluate relevant
evidence, detect possible misunderstanding or support needs, check its
interpretation, assist participants, identify group meaning gaps,
synthesize workshop-level patterns, recommend actions, and revise its
understanding as new evidence arrives.

The governing doctrine is:

> **AI initiative without displacement of human agency.**

The prototype must genuinely perform this intelligence on varied
supported inputs. The recorded demo is evidence of the product; it is
not a substitute for working behavior.

------------------------------------------------------------------------

# 2. Problem

In multilingual workshops, translation alone does not guarantee
effective participation or shared understanding.

A learner may:

-   receive technically correct words but misunderstand the intended
    task;
-   hesitate to reveal confusion publicly;
-   misunderstand another participant despite translation;
-   struggle to express or recover intended meaning;
-   become misaligned with the workshop objective without the
    facilitator noticing.

A facilitator may:

-   lack visibility into who understands the current task;
-   struggle to distinguish individual difficulty from a recurring
    room-level pattern;
-   be unable to monitor several simultaneous participant/group
    interactions;
-   receive too much raw information and too little actionable
    interpretation.

The prototype must demonstrate a credible approach to supporting both
learners and facilitators in real-time multilingual learning while
considering speed, accuracy, accessibility, privacy, and trust.

------------------------------------------------------------------------

# 3. Product Thesis

The product is not primarily a meeting platform and not merely a
translation layer.

> **The product is the AI Partner intelligence layer that helps humans
> establish, preserve, and repair shared meaning during a workshop.**

Its reasoning operates across three scopes:

``` text
ME
individual participant understanding/support

US
shared meaning and collaboration between participants

THE ROOM
facilitator awareness of workshop-level state and patterns
```

The same behavioral doctrine applies at every scope:

``` text
OBSERVE
    ↓
INTERPRET PROVISIONALLY
    ↓
LINK TO EVIDENCE
    ↓
ASSESS CONFIDENCE / CONSEQUENCE
    ↓
ACT, ASK, HELP, RECOMMEND, ESCALATE,
OR WAIT
    ↓
OBSERVE HUMAN RESPONSE
    ↓
REVISE
```

------------------------------------------------------------------------

# 4. Prototype Objective

The hackathon prototype must prove that a bounded AI Partner can:

1.  support real-time multilingual voice and text interaction;
2.  preserve original meaning evidence while providing translation;
3.  reason about participant input relative to an approved workshop
    objective/task;
4.  detect and calibrate possible misunderstanding rather than merely
    translating;
5.  support peer-to-peer meaning repair when translation alone is
    insufficient;
6.  maintain useful participant/group/workshop state from permitted
    observations;
7.  give facilitators privacy-aware operational awareness and
    recommendations;
8.  preserve human authority and permission boundaries;
9.  revise its own inference when humans or new evidence contradict it;
10. work on varied supported inputs rather than only a scripted demo
    path.

------------------------------------------------------------------------

# 5. Success Definition

The prototype is successful when a judge can run a supported workshop
scenario, vary participant wording within the documented domain, and
observe the system:

``` text
capture real input
        ↓
preserve/translate relevant meaning
        ↓
reason from current workshop context
        ↓
form provisional evidence-linked state
        ↓
choose a bounded response or WAIT
        ↓
interact with the appropriate human/scope
        ↓
update from subsequent input
        ↓
surface useful privacy-aware facilitator insight
```

without relying on hard-coded demo misunderstandings, seeded AI
conclusions, or fake permission behavior.

------------------------------------------------------------------------

# 6. Users and Roles

## 6.1 Workshop Owner / Teacher

Defines the workshop's purpose, stages, tasks, expected outcomes, and
success/readiness conditions.

The fuller product vision supports owner ↔ AI dialogue to refine these
criteria.

For the hackathon, workshop setup may be seeded or simplified, provided
the resulting `WorkshopModel` is explicit and human-approved.

## 6.2 Facilitator

Runs the live workshop.

Needs to:

-   communicate with participants;
-   understand workshop-level progress;
-   see useful participant/group operational signals;
-   receive pattern detection and recommendations;
-   retain authority over consequential workshop actions;
-   request private context only through permitted flows.

## 6.3 Participant

Needs to:

-   join the workshop;
-   communicate by supported voice/text;
-   receive multilingual communication;
-   interact privately with their AI Partner;
-   receive contextual clarification/support;
-   ask about peer meaning;
-   preserve control over private information;
-   correct or reject AI interpretations.

## 6.4 AI Partner

A bounded reasoning layer serving the approved workshop objective.

It may:

-   observe permitted events;
-   form provisional inference;
-   check/calibrate;
-   support;
-   propose meaning;
-   recommend;
-   offer assistance;
-   create privacy-aware signals;
-   request permission;
-   wait;
-   escalate within defined authority.

It must not become the sole database, permission system, or source of
truth.

------------------------------------------------------------------------

# 7. MVP Scope

## 7.1 MUST BUILD / PROVE DEEPLY

### A. Zoom-integrated real-time workshop runtime

The primary tested runtime is an existing Zoom workshop with Bud
connected through an approved integration path. The Bud adapter must
translate permitted Zoom voice, text, transcript, and participant events
into normalized events without coupling Bud Core to Zoom objects.

The prototype must not claim live Zoom AI assistance until the selected
capture and authorization path is implemented and verified.

### B. Voice and text

Core participant interaction must support voice and text.

### C. At least two languages

The tested prototype must support at least two documented languages.

### D. Utterance-level translation

Speech should be transcribed continuously enough for real-time use,
while translation is triggered at meaningful utterance/turn completion
rather than every fragment.

### E. ME --- Participant AI Partner

The AI can evaluate substantive participant input relative to the
current workshop task/context and provide evidence-linked, revisable
support.

### F. US --- Peer meaning repair

The AI can help a participant interpret/clarify another participant's
intended meaning when translation alone appears insufficient.

### G. THE ROOM --- Facilitator AI Partner

The facilitator can request or receive a privacy-aware synthesis of
participant/group/workshop state, patterns, and recommendations.

### H. Privacy boundary

Private participant--AI content is not automatically visible to the
facilitator.

Operational signals may cross using minimum-necessary projection.

### I. Permission behavior

Where facilitator access to private content is supported, permission
must be explicitly requested and application-enforced.

### J. Dynamic intelligence

The system must respond meaningfully to varied supported input rather
than exact scripted phrases.

------------------------------------------------------------------------

## 7.2 SHOULD BUILD IF CORE IS STABLE

-   richer workshop setup dialogue;
-   stronger intervention arbitration;
-   richer longitudinal trajectory visualization;
-   additional language coverage;
-   richer accessibility controls;
-   Zoom companion UI polish after the integration path works;
-   enhanced facilitator dashboard polish.

------------------------------------------------------------------------

## 7.3 FUTURE / NOT REQUIRED FOR HACKATHON PROOF

-   production-scale multi-agent orchestration;
-   Google Meet adapter;
-   production compliance/security certification;
-   durable cross-workshop learner profiling;
-   sophisticated long-term memory;
-   advanced fine-grained consent administration;
-   validated psychological/learning analytics;
-   production-grade multi-tenant architecture;
-   guaranteed local/open-source model inference.
-   full standalone meeting-platform replacement;
-   seamless automatic Zoom-to-Bud failover;
-   video input or video analysis;

These must not be claimed as implemented unless actually built and
tested.

------------------------------------------------------------------------

# 8. Core User Journey

``` text
Workshop owner/facilitator establishes approved WorkshopModel
        ↓
Facilitator starts or opens Zoom workshop
        ↓
Bud connects through the approved Zoom integration path
        ↓
Participants join
        ↓
Participants are informed of public/private interaction boundaries
        ↓
Voice/text communication begins
        ↓
Original utterances/messages become normalized observations
        ↓
Translation occurs where required
        ↓
AI Partner Core evaluates meaningful events
        ↓
ParticipantState / GroupState / WorkshopState evolve
        ↓
AI may:
WAIT
CHECK
HELP
PROPOSE MEANING
SIGNAL
RECOMMEND
REQUEST PERMISSION
        ↓
Humans respond/decide
        ↓
New observations revise state
        ↺

If Zoom is unavailable before or during the workshop, the teacher may
deliberately launch the minimal standalone Bud/LiveKit fallback and
participants join that room using the preserved WorkshopModel and
permitted current state. This is a deliberate move, not seamless
mid-session migration.
```

------------------------------------------------------------------------

# 9. Workshop Setup Requirements

## FR-SETUP-001 --- WorkshopModel availability

**Requirement:** Before live reasoning, the system must have an explicit
WorkshopModel containing enough information to evaluate the current
workshop objective/task.

Minimum MVP content:

-   workshop objective;
-   stages or current stage;
-   current task/instruction;
-   expected outcome;
-   success/readiness condition(s) sufficient for the demo domain.

**Acceptance:** The AI can explain which current objective/task it is
using when evaluating participant input.

------------------------------------------------------------------------

## FR-SETUP-002 --- Human authority over model

**Requirement:** WorkshopModel content used as authoritative workshop
intent must be human-provided or human-approved.

**Acceptance:** The AI cannot silently redefine success criteria during
the live session.

------------------------------------------------------------------------

## FR-SETUP-003 --- Seeded setup allowed

**Requirement:** Hackathon setup may use a seeded workshop template.

**Acceptance:** Seeded setup is disclosed and does not hard-code
participant misunderstandings, state conclusions, or AI recommendations.

------------------------------------------------------------------------

# 10. Real-Time Communication Requirements

## FR-RTC-001 --- Multi-user session

Participants and facilitator must be able to join the same bounded
real-time workshop session.

**Acceptance:** At least the documented supported number of users can
connect and exchange supported communication.

------------------------------------------------------------------------

## FR-RTC-002 --- Voice input

Supported participants must be able to speak and produce attributable
transcription events.

**Acceptance:** A spoken substantive utterance can enter the AI pipeline
with participant/session attribution.

------------------------------------------------------------------------

## FR-RTC-003 --- Text input

Participants must be able to submit text as a first-class workshop/AI
interaction.

**Acceptance:** Text input enters the same normalized reasoning
architecture without requiring a fake voice path.

------------------------------------------------------------------------

## FR-RTC-004 --- Platform-independent core

LiveKit-specific objects must not define the AI Partner Core's domain
model.

**Acceptance:** Communication input is normalized before core reasoning.

------------------------------------------------------------------------

# 11. Language and Meaning Requirements

## FR-LANG-001 --- Preserve original

The original-language utterance/transcript must be retained as source
evidence where technically available.

**Acceptance:** The system can distinguish the original from translated
output.

------------------------------------------------------------------------

## FR-LANG-002 --- Utterance-level translation

Translation should occur after sufficient semantic completion rather
than indiscriminately translating every partial fragment.

**Acceptance:** A complete substantive utterance can be translated as a
coherent unit.

Exact endpointing thresholds belong to technical contracts.

------------------------------------------------------------------------

## FR-LANG-003 --- Contextual translation

Translation may use bounded recent context and workshop terminology to
improve meaning.

**Acceptance:** Translation pipeline can receive relevant context
without overwriting the preserved original.

------------------------------------------------------------------------

## FR-LANG-004 --- Original ≠ Translation ≠ Interpretation

The system must preserve the conceptual distinction:

``` text
ORIGINAL
what was expressed

TRANSLATION
what another human was shown

INTERPRETATION
what the AI provisionally believes may have been meant
```

**Acceptance:** UI/state/logging does not silently treat AI
interpretation as the original statement.

------------------------------------------------------------------------

## FR-LANG-005 --- Translation dispute

A participant must be able to challenge or clarify a
translation/interpretation in the supported flow.

**Acceptance:** A disputed upstream representation can trigger
re-evaluation rather than remaining unquestioned evidence.

------------------------------------------------------------------------

## FR-LANG-006 --- System self-error hypothesis

When apparent misunderstanding could plausibly arise from
STT/translation/AI transformation, the system must consider that
possibility before confidently attributing the problem to the learner.

**Acceptance:** A test involving a disputed/bad translation does not
automatically produce a definitive negative learner judgment.

------------------------------------------------------------------------

# 12. ME --- Participant AI Partner Requirements

## FR-ME-001 --- Evidence-linked evaluation

When a participant produces substantive input relevant to the current
task, the AI may evaluate it using:

-   current WorkshopModel/task;
-   permitted participant context;
-   relevant recent observations;
-   intervention history where applicable.

**Acceptance:** An inference can identify supporting evidence/context
rather than being an unexplained label.

------------------------------------------------------------------------

## FR-ME-002 --- Provisional inference

AI assessment must remain provisional.

**Acceptance:** State supports `unknown`/insufficient evidence and does
not require a forced positive/negative judgment.

------------------------------------------------------------------------

## FR-ME-003 --- Friendly calibration

When possible misunderstanding is plausible but not sufficiently
established, the AI should prefer a check-in/calibration over
declarative diagnosis.

Example:

> "Quick check --- where are you at?"

**Acceptance:** At least one supported flow allows the participant to
clarify their state before escalation.

------------------------------------------------------------------------

## FR-ME-004 --- Participant correction

A participant may reject or correct the AI's interpretation.

**Acceptance:** New participant evidence can revise/supersede the prior
inference; the AI does not defend the old inference as fact.

------------------------------------------------------------------------

## FR-ME-005 --- Contextual support

The AI may provide task/concept/language/context support within bounded
authority.

**Acceptance:** Support is generated from current context rather than a
fixed demo response.

------------------------------------------------------------------------

## FR-ME-006 --- WAIT / NO_ACTION

The AI must be capable of deciding not to intervene.

**Acceptance:** Not every detected possibility creates a message or
escalation.

------------------------------------------------------------------------

## FR-ME-007 --- No psychological profiling

The system must not create unsupported permanent labels for
intelligence, motivation, personality, attitude, work ethic, or
cooperativeness.

**Acceptance:** MVP state schema contains no such canonical profiling
fields.

------------------------------------------------------------------------

## FR-ME-008 --- No arbitrary learner score

The prototype must not present a mysterious overall learner score as
validated truth.

**Acceptance:** Facilitator status derives from interpretable
operational dimensions/signals.

------------------------------------------------------------------------

# 13. US --- Group and Peer Meaning Requirements

## FR-US-001 --- GroupState is distinct

GroupState must model shared/group interaction and must not be a simple
average of ParticipantStates.

**Acceptance:** Group-level meaning/task alignment can differ from an
individual member's state.

------------------------------------------------------------------------

## FR-US-002 --- Meaning gap detection/support

The system may identify a possible peer meaning gap from permitted
evidence or explicit participant request.

**Acceptance:** A peer misunderstanding scenario can invoke contextual
meaning support.

------------------------------------------------------------------------

## FR-US-003 --- AI proposes meaning, human owns meaning

When asked what another participant meant, the AI must communicate
uncertainty appropriately where intent is not confirmed.

Preferred pattern:

> "I think they may mean X rather than Y based on the preceding context.
> Would you like me to help confirm?"

**Acceptance:** The system does not present uncertain inferred intent as
certainty.

------------------------------------------------------------------------

## FR-US-004 --- Productive disagreement

Disagreement must not automatically be classified as misunderstanding or
failure.

**Acceptance:** A test with clearly understood but opposing views can
remain a productive disagreement state without forced repair.

------------------------------------------------------------------------

## FR-US-005 --- Peer confirmation

Where supported and appropriate, the AI may offer a bounded route to
confirm intended meaning with the original speaker.

**Acceptance:** Human clarification can update the meaning-gap state.

------------------------------------------------------------------------

# 14. THE ROOM --- Facilitator AI Requirements

## FR-ROOM-001 --- Workshop-level synthesis

The facilitator AI must synthesize permitted information from:

-   WorkshopModel;
-   WorkshopState;
-   privacy-aware participant signals;
-   GroupStates;
-   public workshop events;
-   relevant intervention history.

**Acceptance:** A facilitator query such as "How is everyone doing?"
returns structured operational insight rather than merely replaying raw
transcript.

------------------------------------------------------------------------

## FR-ROOM-002 --- Pattern detection

The system may identify recurring patterns across participants/groups.

**Acceptance:** Multiple related issues can produce a room-level pattern
signal.

------------------------------------------------------------------------

## FR-ROOM-003 --- Causal humility

Pattern correlation must not automatically become causal blame.

**Acceptance:** System language uses qualified hypotheses when cause is
not established.

------------------------------------------------------------------------

## FR-ROOM-004 --- Actionable recommendation

Where warranted, facilitator output should be able to include:

-   what appears to be happening;
-   why it matters;
-   evidence/confidence;
-   what has been attempted;
-   recommendation;
-   what the AI can help do;
-   what decision remains human.

**Acceptance:** At least one end-to-end scenario produces an actionable
recommendation with human choice preserved.

------------------------------------------------------------------------

## FR-ROOM-005 --- Facilitator authority

The facilitator decides consequential workshop progression/intervention.

**Acceptance:** AI recommendations do not automatically change workshop
stage or broadcast consequential actions without authorized flow.

------------------------------------------------------------------------

## FR-ROOM-006 --- Rejected recommendation

If the facilitator rejects a recommendation, the AI respects the
decision and continues observing/supporting within remaining authority.

**Acceptance:** The AI does not repeatedly nag without materially new
evidence or increased consequence.

------------------------------------------------------------------------

# 15. Privacy, Trust, and Permission Requirements

## FR-PRIV-001 --- Interaction scopes

The product must conceptually distinguish:

-   public/shared workshop space;
-   group/shared collaboration space where implemented;
-   private participant--AI Partner space.

**Acceptance:** Private AI interaction is not rendered as
public/facilitator-visible by default.

------------------------------------------------------------------------

## FR-PRIV-002 --- Participant priming

Participants should be informed that they are entering a public
learning/workshop environment and that public interactions may be
visible/used for facilitation according to the prototype's disclosed
behavior.

**Acceptance:** Join/onboarding flow provides a clear notice/consent
acknowledgement appropriate to prototype scope.

------------------------------------------------------------------------

## FR-PRIV-003 --- Minimum-necessary operational projection

Private information may inform AI support, but facilitator-facing
signals must disclose only the operational consequence necessary for
facilitation.

**Acceptance:** A private sensitive statement can produce a useful
generic support signal without exposing unnecessary sensitive cause or
exact wording.

------------------------------------------------------------------------

## FR-PRIV-004 --- Raw private content

Raw private chat/content must not automatically be exposed to the
facilitator.

**Acceptance:** Facilitator dashboard/query cannot retrieve private
transcript by default.

------------------------------------------------------------------------

## FR-PRIV-005 --- Permission request

If the prototype supports facilitator request for private content, the
participant must receive an explicit permission request.

**Acceptance:** Access is blocked until permission is granted.

------------------------------------------------------------------------

## FR-PRIV-006 --- Permission refusal

Participant refusal must be respected.

**Acceptance:** Declining permission prevents access and does not cause
the AI to reveal the same content through a detailed paraphrase.

------------------------------------------------------------------------

## FR-PRIV-007 --- Application-enforced authority

Permission/visibility must be enforced by application logic, not merely
by prompting the LLM to "be private."

**Acceptance:** Unauthorized retrieval path is blocked independent of
model prose.

------------------------------------------------------------------------

# 16. State Requirements

Exact schemas are downstream contracts. The MVP must nevertheless
implement sufficient state to support observable behavior.

## 16.1 WorkshopModel

Minimum concept:

``` text
workshop identity
objective
current stage/task
expected outcome
success/readiness conditions
approval/source context
```

## 16.2 ParticipantState

MVP-relevant dimensions:

``` text
task alignment
contextual understanding where relevant
progress
participation state where observable
support need
open issues
intervention history
trajectory
evidence/provenance
confidence/uncertainty
privacy context
```

Only implement dimensions required by supported flows.

## 16.3 GroupState

MVP-relevant dimensions:

``` text
shared task alignment
shared meaning / meaning gaps
disagreement state
collaborative progress
open issues
intervention history
evidence/provenance
confidence/uncertainty
```

## 16.4 WorkshopState

MVP-relevant dimensions:

``` text
current workshop position
derived participant/group signals
patterns
blockers
readiness/progression signal where implemented
intervention history
trajectory
```

## 16.5 FacilitatorViewState

Privacy-aware projection containing only facilitator-permitted
operational information.

## 16.6 State-scope independence

Higher-level state must not silently overwrite lower-level state.

**Acceptance:** Participant, Group, and Workshop state may legitimately
differ.

------------------------------------------------------------------------

# 17. AI Decision Requirements

Exact structured schema is downstream.

Every consequential AI decision should conceptually answer:

``` text
What did I observe?
What might it mean?
What evidence supports that?
How uncertain am I?
How consequential is it?
Could the system itself have caused the discrepancy?
Is action warranted?
What is the minimum sufficient action?
At what social scope?
What authority/permission is required?
```

Allowed conceptual decisions include:

``` text
WAIT / NO_ACTION
CHECK / CALIBRATE
HELP
PROPOSE_MEANING
REQUEST_CONFIRMATION
CREATE_OPERATIONAL_SIGNAL
RECOMMEND
OFFER_ASSISTANCE
REQUEST_PERMISSION
ESCALATE
```

The model proposes structured decisions.

The application validates authority and executes bounded tools.

------------------------------------------------------------------------

# 18. Intervention and Escalation Requirements

## FR-INT-001 --- Smallest appropriate scope

Prefer ME intervention when the issue can appropriately remain private.

Use US when meaning repair is relational/group-level.

Use THE ROOM/facilitator when systemic, consequential, persistent, or
outside AI authority.

------------------------------------------------------------------------

## FR-INT-002 --- Intervention arbitration

Related ME/US/ROOM interventions should not pile up unnecessarily.

**Acceptance:** If a facilitator has just issued a room-wide
clarification, redundant immediate AI clarifications for the same issue
can be suppressed/wait for new evidence.

------------------------------------------------------------------------

## FR-INT-003 --- Intervention history

The system should retain enough intervention history to avoid blindly
repeating failed actions.

**Acceptance:** A repeated unresolved issue can trigger
reassessment/escalation rather than infinite identical prompts.

------------------------------------------------------------------------

# 19. Inference Lifecycle Requirements

## FR-INF-001 --- Unknown is legitimate

Missing evidence must not be treated as evidence of failure.

------------------------------------------------------------------------

## FR-INF-002 --- Staleness

Operational inference must support resolution, supersession, or
staleness.

**Acceptance:** An old unresolved flag cannot remain indefinitely urgent
without current supporting evidence.

------------------------------------------------------------------------

## FR-INF-003 --- Evidence provenance

Where relevant, distinguish evidence influenced by AI intervention.

Conceptually:

``` text
SPONTANEOUS
ELICITED
SCAFFOLDED
AI-SUPPLIED
```

**Acceptance:** Repeating AI-supplied wording alone is not treated as
conclusive independent understanding.

------------------------------------------------------------------------

## FR-INF-004 --- Dependency revision

If upstream evidence such as translation is corrected/disputed,
materially dependent downstream inference should be reconsidered.

------------------------------------------------------------------------

# 20. UX / Required Surfaces

Exact visual design is implementation-local, but the prototype requires
enough UI to prove behavior.

## 20.1 Join / onboarding

Must provide:

-   participant/facilitator entry;
-   identity/display name sufficient for prototype;
-   language preference where required;
-   workshop public/private notice;
-   consent/acknowledgement appropriate to prototype.

## 20.2 Workshop room

Must provide enough of:

-   participant presence;
-   voice session;
-   text communication;
-   transcript/caption/translation surface;
-   clear distinction where necessary between original and translated
    meaning.

## 20.3 Participant AI Partner surface

Must support:

-   private text interaction;
-   AI check-ins/support;
-   contextual clarification;
-   peer-meaning question flow;
-   permission prompts where relevant.

Voice interaction with AI may be supported if stable, but text is
sufficient for private AI responses if voice complexity threatens core
reliability.

## 20.4 Facilitator surface

Must support:

-   current workshop context;
-   participant/group operational state sufficient for MVP;
-   attention signals;
-   pattern synthesis;
-   AI recommendations;
-   indication of intervention/support status;
-   privacy-respecting state requests.

Avoid cluttering the prototype with unsupported pseudo-analytics.

## 20.5 Permission UI

Where private-access request is implemented:

-   requester/purpose/content scope should be sufficiently clear;
-   allow/decline;
-   decision enforced.

------------------------------------------------------------------------

# 21. Architecture Constraints

The implementation must follow ADR-001 unless explicitly superseded.

``` text
Communication Environment
(Zoom first; LiveKit fallback)
        ↓
Normalized Events
        ↓
AI Partner Core
        ↓
State + Decision Layer
        ↓
Authority / Permission Validation
        ↓
Bounded Tools / UI Actions
```

## 21.1 Platform-independent AI Partner Core

Core reasoning must not depend directly on LiveKit/Zoom-specific object
semantics.

## 21.2 Zoom first

Zoom is the primary demonstration surface. The integration must use a
permitted and verifiable path for voice, text, transcript, or participant
events. The exact path remains subject to the active KRYSTALIZE item.

## 21.3 LiveKit fallback

LiveKit is retained as the minimal standalone fallback and development
test harness. The timeboxed MVP does not build a full independent
meeting-platform replacement before proving the Zoom integration.

## 21.4 Google Meet

## 21.5 Provider abstraction

STT, translation, and LLM provider choices remain implementation
decisions unless separately locked.

Avoid unnecessary provider coupling where a lightweight abstraction is
feasible.

## 21.6 Model authority

LLM output is not automatically authoritative state mutation or
permission.

Application code validates structured output and allowed actions.

------------------------------------------------------------------------

# 22. Non-Functional Requirements

## NFR-001 --- Responsiveness

Real-time interaction must feel usable in a workshop.

Optimize separately for:

-   transcription responsiveness;
-   utterance-level translation delay;
-   deeper AI reasoning latency.

Do not sacrifice semantic quality merely for first-token translation
speed.

Exact latency targets should be documented after provider selection and
measured in the final build.

------------------------------------------------------------------------

## NFR-002 --- Accuracy and uncertainty

The product must avoid presenting uncertain AI interpretation as certain
human intent.

Original evidence should remain available where feasible.

------------------------------------------------------------------------

## NFR-003 --- Accessibility

Core meaning/support should not depend exclusively on one modality where
feasible.

At minimum, core spoken workshop content should have
text/caption/translation representation in supported flows, and core AI
interaction should have a text path.

Do not claim production-grade accessibility compliance unless tested.

------------------------------------------------------------------------

## NFR-004 --- Privacy

Private content visibility must be enforced by application architecture.

Logs/debugging must not casually expose private content in
participant/facilitator UI.

Production-grade compliance is out of scope unless explicitly
implemented.

------------------------------------------------------------------------

## NFR-005 --- Graceful degradation

Provider/system failure must not be represented as successful AI
intelligence.

Where feasible:

-   show transcription/translation failure;
-   preserve usable text interaction;
-   allow retry;
-   avoid fabricated state updates from missing evidence.

------------------------------------------------------------------------

## NFR-006 --- Observability

The prototype should retain enough structured logs/debug visibility for
developers to trace:

``` text
event
→ relevant context
→ AI decision
→ evidence references
→ tool/action
→ state update
```

Do not expose private debug information to unauthorized users.

------------------------------------------------------------------------

## NFR-007 --- Reproducibility

Repository setup instructions must enable judges/team members to run the
supported prototype with documented prerequisites, credentials, and
limitations.

------------------------------------------------------------------------

# 23. Failure and Adversarial Requirements

The final build must be tested against at least these scenarios:

## AT-001 --- Wrong AI inference

AI thinks participant misunderstood; participant corrects AI.

**Expected:** inference updates; AI does not defend old judgment.

## AT-002 --- Silence

Participant provides insufficient evidence.

**Expected:** unknown/low observable activity, not "disengaged."

## AT-003 --- AI-contaminated evidence

Learner repeats wording supplied by AI.

**Expected:** not automatically treated as independent proof of
understanding.

## AT-004 --- Duplicate intervention

ME and ROOM detect related issue.

**Expected:** interventions coordinate/suppress rather than pile up.

## AT-005 --- Stale state

Old issue no longer has current evidence.

**Expected:** signal resolves/supersedes/stales rather than remaining
permanently urgent.

## AT-006 --- Disputed translation

Participant says translation is wrong.

**Expected:** original preserved; translation marked/reconsidered;
dependent inference revisited where material.

## AT-007 --- System-caused misunderstanding

Multiple learners receive the same flawed transformed representation.

**Expected:** system considers translation/STT/transformation as a
possible common cause before blaming learners.

## AT-008 --- Sensitive private disclosure

Private statement contains sensitive cause.

**Expected:** facilitator receives only minimum necessary operational
support signal.

## AT-009 --- Permission denied

Participant denies facilitator access.

**Expected:** private content remains inaccessible.

## AT-010 --- Recommendation rejected

Facilitator rejects AI recommendation.

**Expected:** decision respected; AI continues observing; no repetitive
nagging absent new evidence.

## AT-011 --- Productive disagreement

Two participants understand each other but disagree.

**Expected:** disagreement is not automatically classified as
misunderstanding.

## AT-012 --- State-scope difference

Participant aligned; group fragmented.

**Expected:** states coexist without forced overwrite.

------------------------------------------------------------------------

# 24. Acceptance Matrix --- Core Product Claims

  -----------------------------------------------------------------------
  Claim                               Required proof
  ----------------------------------- -----------------------------------
  Supports learners                   ME flow works on varied input

  Supports facilitators               THE ROOM synthesis/recommendation
                                      works

  Supports multilingual communication At least two documented languages
                                      work

  Goes beyond translation             US meaning-repair scenario works

  AI is a partner                     Proactive but bounded
                                      check/help/recommend behavior
                                      exists

  Preserves agency                    Human correction, refusal, and
                                      facilitator decisions change
                                      behavior

  Protects privacy                    Private content is not
                                      automatically exposed

  Tracks state                        Evidence-linked state changes after
                                      new observations

  Handles uncertainty                 Unknown/WAIT/revision behavior
                                      exists

  Is not demo-scripted                Varied supported inputs produce
                                      dynamic behavior

  Real-time feasible                  Voice/text session and language
                                      pipeline operate at usable
                                      prototype latency
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 25. Demo Traceability

## Demo Scene 0 --- Zoom integration and fallback

Maps to:

``` text
FR-RTC-004
CG-015
DEP-011
```

Proves: Bud can operate as an AI companion inside an existing platform,
and the teacher has a deliberate standalone continuation path if Zoom is
unavailable.

## Demo Scene 1 --- Facilitator → Learner misunderstanding

Maps to:

``` text
FR-SETUP-001
FR-RTC-002
FR-LANG-001/002
FR-ME-001/002/003/004/005
FR-INF-001
```

Proves: context-aware learner support beyond translation.

## Demo Scene 2 --- Peer multilingual meaning repair

Maps to:

``` text
FR-LANG-004/005
FR-US-001/002/003/005
```

Proves: shared meaning repair and human authority over intended meaning.

## Demo Scene 3 --- Privacy

Maps to:

``` text
FR-PRIV-001–007
```

Proves: useful AI partnership without unrestricted transcript
surveillance.

## Demo Scene 4 --- Facilitator master of states

Maps to:

``` text
FR-ROOM-001–006
FR-INT-001–003
```

Proves: ME → US → THE ROOM synthesis and bounded recommendation.

The demo may select the strongest subset of scenes required by time, but
the repository capability claims must match actual implementation.

------------------------------------------------------------------------

# 26. Explicit Non-Goals

The hackathon prototype is not intended to prove:

-   validated educational diagnosis;
-   psychological profiling;
-   autonomous workshop control;
-   perfect translation;
-   perfect intent recognition;
-   production-scale conferencing;
-   building a full independent Zoom replacement in this timeboxed MVP;
-   production compliance/security certification;
-   permanent learner dossiers;
-   universal language coverage;
-   full Zoom/Meet parity;
-   fully autonomous multi-agent facilitation.

------------------------------------------------------------------------

# 27. Technical Contracts Required Before/Alongside Implementation

After semantic verification through the Codex/Krystalize handoff
process, derive:

``` text
STATE_MODEL_CONTRACT.md
NORMALIZED_EVENT_CONTRACT.md
AI_DECISION_CONTRACT.md
TOOL_CONTRACT.md
```

These contracts must make exact technical choices required for
implementation without silently changing this PRD or upstream doctrine.

If a product-significant ambiguity is discovered, escalate it rather
than silently resolving it.

------------------------------------------------------------------------

# 28. Repository Deliverables

Expected submission-quality repository should include:

``` text
README.md

/docs/
canonical product documentation
PRD.md

/skills/
KRYSTALIZE.md

CODEX_KRYSTALIZE_HANDOFF.md

/docs/02_KRYSTALIZE/
constitutional state/journal

/docs/03_CONTRACTS/
state/event/decision/tool contracts

/docs/04_IMPLEMENTATION/
implementation plan
acceptance test matrix

application source
tests
environment example/config instructions
```

Exact folder layout may vary, but documentation authority and setup must
remain clear.

------------------------------------------------------------------------

# 29. Definition of Done

The prototype is submission-ready only when all applicable conditions
below are true.

## Product

-   [ ] Facilitator and participant roles function.
-   [ ] At least two documented languages function in tested flow.
-   [ ] Voice input works in supported environment.
-   [ ] Text input works.
-   [ ] Original/translation/interpretation distinction is preserved
    sufficiently for supported flows.
-   [ ] ME participant-support flow works dynamically.
-   [ ] US peer meaning-repair flow works dynamically.
-   [ ] THE ROOM facilitator synthesis/recommendation works.
-   [ ] Private content is not automatically exposed.
-   [ ] Permission behavior works where claimed.
-   [ ] Human correction revises AI understanding.
-   [ ] AI can WAIT rather than always intervene.
-   [ ] No arbitrary psychological learner scoring is presented as
    truth.

## Architecture

-   [ ] AI Partner Core receives normalized events rather than being
    tightly coupled to LiveKit objects.
-   [ ] Application owns authoritative permissions/state/tool execution.
-   [ ] Model output is validated before consequential action.
-   [ ] Provider credentials are not committed.
-   [ ] Future integrations are not falsely represented as complete.

## Integrity

-   [ ] No hard-coded demo misunderstandings.
-   [ ] No seeded recommendations presented as dynamic AI reasoning.
-   [ ] Demo behavior can be reproduced from the repository.
-   [ ] Varied supported inputs produce meaningful context-dependent
    behavior.
-   [ ] Limitations are documented.
-   [ ] Future architecture is clearly distinguished from implemented
    MVP.

## Verification

-   [ ] Core acceptance matrix passes.
-   [ ] Applicable adversarial tests AT-001--AT-012 pass or documented
    limitations are explicitly disclosed.
-   [ ] README setup is reproducible by another team member.
-   [ ] Demo claims map to implemented capabilities.
-   [ ] No major claim exists only in the video.

------------------------------------------------------------------------

# 30. Open Technical Decisions

These are intentionally not silently resolved by this PRD:

-   exact state JSON schemas;
-   exact confidence representation/calibration;
-   exact normalized event payloads;
-   exact AI structured decision schema;
-   exact bounded tool signatures;
-   STT provider/model;
-   translation provider/model;
-   LLM/provider;
-   turn/utterance detection thresholds;
-   persistence/database choice;
-   authentication/session mechanics;
-   exact retention policy;
-   exact latency targets after provider benchmarking;
-   exact UI visual system;
-   exact Zoom capture/authorization path and RTMS/SDK choice;
-   minimal standalone fallback scope after Zoom proof;

These should be resolved through Krystalize-aware semantic checking
followed by technical contract derivation.

------------------------------------------------------------------------

# 31. Final Product Contract

Build the smallest credible system that proves this loop:

``` text
A HUMAN EXPRESSES SOMETHING
        ↓
THE SYSTEM PRESERVES THE EVIDENCE
        ↓
LANGUAGE IS TRANSLATED WHEN NEEDED
        ↓
THE AI REASONS ABOUT MEANING IN WORKSHOP CONTEXT
        ↓
IT FORMS A PROVISIONAL, EVIDENCE-LINKED UNDERSTANDING
        ↓
IT CHOOSES THE MINIMUM SUFFICIENT BOUNDED RESPONSE
OR WAITS
        ↓
HUMAN AGENCY IS PRESERVED
        ↓
NEW HUMAN RESPONSE CHANGES THE SYSTEM'S UNDERSTANDING
        ↓
USEFUL PRIVACY-AWARE STATE REACHES THE RIGHT SOCIAL SCOPE
        ↓
THE WORKSHOP MOVES TOWARD SHARED MEANING
```

The prototype does not need to prove the entire future platform.

It must prove that this intelligence is **real, coherent, reusable,
privacy-aware, and technically credible**.

> **Constrain the domain, not the intelligence.**

> **The video demonstrates the product. It must never be what makes the
> product appear to work.**

------------------------------------------------------------------------

# PRD Evolution Record

This record is appended to the original PRD to preserve its evolution.
The original Sections 1-31 remain the AREN-originated baseline and are
not silently rewritten by this section.

## Part 1 - AREN-Originated PRD Baseline

The original PRD establishes the product intent, philosophy, user roles,
prototype objective, bounded AI behavior, privacy principles, core
architecture direction, and initial open technical decisions.

It answers primarily:

- What Bud should help humans achieve.
- Why translation alone is insufficient.
- Which reasoning scopes exist: ME, US, and THE ROOM.
- What the prototype must prove.
- Which principles must not be violated.

It does not, by itself, safely finalize every workshop lifecycle,
identity, consent, state, integration, deployment, or acceptance detail.

## Part 2 - KRYSTALIZE Clarification Register and Rationale

### Why this section exists

The first PRD pass is intentionally product-level. It can define the
meaning and direction of Bud without prematurely choosing every runtime
behavior. KRYSTALIZE is required when an unresolved detail affects
authority, privacy, lifecycle, evidence, dependency order, or the
ability of later documentation to remain consistent.

The areas below cannot be safely finalized in the first pass because
their answers depend on human authority, implementation evidence, or
other upstream decisions that the initial PRD does not define. This does
not mean AREN failed to identify the product. It means the original PRD
and KRYSTALIZE perform different jobs: AREN establishes intent;
KRYSTALIZE stabilizes ambiguous meaning before implementation-final
claims are made.

| Priority | Area requiring KRYSTALIZE | Why clarification is needed | Why it cannot be safely finalized in the first pass |
| --- | --- | --- | --- |
| 1 | WorkshopModel authoring and teacher approval | The WorkshopModel controls objectives, stages, tasks, outcomes, success conditions, supported languages, participant/group structure, and whether Bud is available. | The PRD says it is human-approved but does not define who drafts it, what Bud may propose, what approval means, or how workshop-level Bud availability is chosen. |
| 2 | WorkshopModel versioning and change rules | State, evidence, and success criteria must remain tied to the correct workshop intent; the teacher/workshop owner must remain authoritative. | The first pass did not define change ownership, version boundaries, effective timing, or how Bud recommendations differ from approved changes. |
| 3 | Workshop lifecycle and authority | Server, room, pause, resume, close, and restart behavior depend on clear teacher ownership. | The initial PRD describes a workshop but not the complete authority lifecycle or the rule that Bud may recommend but not execute lifecycle actions. |
| 4 | Learner joining and identity | Bud must attach private state and permissions to the correct learner and workshop. | The first pass did not define the teacher-generated join path, workshop verification, admission approval, internal participant identity, or reconnect behavior. |
| 5 | Privacy, consent, and visibility | ME, US, and THE ROOM depend on exact boundaries for observation and disclosure. | The first pass establishes privacy principles but does not define the exact observe/use/disclose behavior, private escalation boundary, or learner awareness requirements. |
| 6 | Bud activation lifecycle | Each learner needs a clear point at which private Bud support becomes active, paused, declined, revoked, or ended. | The first pass does not define explicit learner activation, visible state, reconnect behavior, or the rule that Bud cannot activate autonomously. |
| 7 | Teacher controls and intervention boundaries | Facilitator authority must be useful without overriding learner privacy or agency. | The first pass does not define the exact teacher view, operational controls, signal actions, correction powers, or limits on private Bud access. |
| 8 | Multi-learner isolation and concurrency | Multiple private Bud contexts and shared events must not cross-contaminate. | The first pass does not define server-enforced scope, participant-context keys, group visibility, event ordering, or duplicate protection. |
| 9 | Evidence and confidence semantics | Bud needs consistent rules for evidence, unknown, confidence, and human confirmation. | The first pass defines the epistemic doctrine but not the operational confidence categories, freshness rules, evidence status, or action thresholds. |
| 10 | Correction, disagreement, and revision | Human corrections must update dependent interpretations and preserve productive disagreement. | The first pass does not define correction authority, evidence history, propagation, invalidated signals, or neutral disagreement handling. |
| 11 | Facilitator signal vocabulary and thresholds | Teacher-facing signals must be actionable, minimal, and evidence-backed. | The first pass does not define a bounded signal vocabulary, trigger persistence, signal status, expiry, or invalidated-evidence behavior. |
| 12 | Group and breakout semantics | US reasoning depends on stable group membership and shared-context boundaries. | The first pass does not define teacher ownership, change boundaries, breakout scope, movement, merge, split, or departure behavior. |
| 13 | Prototype network topology | Learners need a predictable and appropriately secured path to the teacher-hosted server. | The first pass does not distinguish the guaranteed trusted-LAN path from the optional secure public demonstration path or define their security claims. |
| 14 | Zoom integration proof mode | Bud's primary demonstration must prove useful Zoom integration through a permitted voice/text/event path. | Zoom authorization, capture, participant mapping, and privacy conditions require clarification before adapter claims. |
| 15 | Failure and recovery behavior | Bud must remain honest and useful when servers, rooms, providers, or models fail. | Failure states depend on actual runtime boundaries and cannot be safely invented from product prose. |
| 16 | Data retention and session records | Storage, deletion, access, and audit behavior are part of privacy and future deployment. | Retention depends on lifecycle, evidence, consent, persistence, and cloud decisions. |
| 17 | Language configuration and language changes | Participant preferences, Bud replies, translation, and fallback behavior must stay coherent. | The first pass requires multilingual support but does not define live preference changes or unsupported-language behavior. |
| 18 | Adaptive Check-in policy | Optional check-ins need acceptable observation windows, cooldowns, dismissal, and re-invitation rules. | The feature was added after the first PRD and its production thresholds require user and runtime evidence. |
| 19 | Help, I'm Stuck grounding | Private explanations must use current, permitted workshop context and avoid invention. | Exact transcript/current-activity sources and freshness rules depend on the real input pipeline. |
| 20 | Intervention arbitration and escalation | Competing Bud actions need deterministic ordering, suppression, deduplication, and escalation. | The doctrine defines bounded intervention but not concurrent candidate resolution. |
| 21 | Provider and model choices | STT, translation, LLM, and turn detection affect latency, quality, privacy, and cost. | Provider choices require benchmarking and deployment constraints that are not known in the first product pass. |
| 22 | LiveKit room and media lifecycle | The fallback workshop needs voice, text, participant attribution, token issuance, and reconnect behavior. | LiveKit remains the standalone fallback runtime; exact room and media behavior requires clarification. |
| 23 | Future cloud deployment boundary | Cloud hosting changes identity, tenancy, persistence, operations, reachability, and cost. | The prototype is teacher-hosted; cloud hosting is a future direction and must not be silently treated as current scope. |
| 24 | Acceptance and demonstration proof | The final claim must be tied to observable proof of intelligence, privacy, agency, grounding, and integration. | Acceptance criteria should reflect the clarified system meaning rather than be guessed before upstream decisions stabilize. |

### Clarification ordering principle

The list is dependency-ordered. Upstream authority, WorkshopModel,
lifecycle, identity, privacy, evidence, and state decisions must be
clarified before provider, platform, cloud, UI, or final acceptance
decisions. This order is intentional: clarifying a downstream item first
can force rewrites across the constitution, PRD, contracts,
implementation plan, and demo evidence.

### Current KRYSTALIZE boundary

Priority 1 is now clarified: the teacher approves the WorkshopModel's
operational content and whether Bud is available for that workshop. If
Bud is disabled at workshop level, no learner-level Bud activation occurs.
Learner-level activation remains a separate later decision.

Priority 2 is also clarified: the teacher/workshop owner owns
WorkshopModel changes. Bud may recommend a change but cannot apply one
autonomously. Substantive changes create a new approved version, with
existing evidence linked to the prior version and new evidence linked to
the new version.

Priority 3 is also clarified: the teacher/workshop owner controls the
workshop lifecycle through `SETUP -> READY -> ACTIVE <-> PAUSED -> ENDED`.
Bud may recommend pausing, resuming, ending, or creating a new session,
but cannot perform those actions. Ended workshops are not silently
restarted.

Priority 4 is also clarified: learners use a teacher-generated URL/code,
verify the workshop identity, provide a display name and preferred
language, and await teacher approval. The server assigns an internal
participant ID and supports a short-lived reconnect token. Prototype
identity is display-based rather than full account authentication.

Priority 5 is also clarified: Bud may observe permitted shared workshop
input and use private learner-Bud content to support that learner, but
private content remains private by default. Only minimum-necessary
operational signals reach the teacher unless the learner explicitly
permits raw disclosure. Bud must not treat silence alone as proof of
confusion, disengagement, motivation, or personality. Learners must know
when Bud is active and what it may observe.

Priority 6 is also clarified: when Bud is workshop-enabled, each learner
must explicitly activate it. Learners may pause, decline, or revoke Bud;
Bud shows active/paused state and cannot activate autonomously. A
reconnect preserves the prior choice but remains paused until the learner
confirms continuation. Leaving the workshop ends the active Bud session.

The MVP input scope is voice and text only. Participant video is not part
of the MVP interface or Bud's AI input path. This is an intentional scope
and latency decision, not a claim that future workshop builds could never
support video.

Bud must prioritize context-current responses. A slow or stale sensemaking
result must not be delivered after the workshop has moved on as though it
still applies. Local/open-source inference is the preferred provider
direction for reducing API and network dependence, but the exact model,
hardware, quantization, cancellation, freshness checks, and fallback
behavior remain Item 21 decisions and require benchmarking.

Priority 7 is also clarified: the teacher may see workshop state,
approved participants, presence, shared/group activity, minimum-necessary
facilitator signals, and system errors. The teacher may send public or
group messages, manage lifecycle, revise the WorkshopModel, dismiss
signals, correct shared context, and pause Bud workshop-wide. The teacher
may not read private learner-Bud conversations by default, force Bud
activation or private check-ins, treat signals as facts, override a
learner's stated meaning, or disclose private content without permission.

The current active clarification is Priority 8: **how are multiple Bud
contexts isolated, how are shared events scoped, and how does the server
prevent cross-learner leakage?** Only one clarification question should
be active at a time. Unresolved items remain explicitly unresolved,
deferred, or accepted as uncertainty; they must not be silently
converted into requirements.

Priority 8 is also clarified: every workshop has a separate server-side
context; every learner has a private Bud context keyed by workshop and
participant; shared events are room-scoped; group events are visible only
to group members; and private evidence is never included in another
learner's context by default. The application server enforces these
scopes, including event ordering and duplicate protection.

The current active clarification is Priority 9: **what counts as
evidence for each claim, how is confidence represented, and when must Bud
use unknown, ask for clarification, or request human confirmation?** Only
one clarification question should be active at a time. Unresolved items
remain explicitly unresolved, deferred, or accepted as uncertainty; they
must not be silently converted into requirements.

Priority 9 is also clarified: Bud uses evidence-linked categorical
confidence (`unknown`, `low`, `medium`, `high`). `unknown` is the default
when evidence is insufficient. Translation or silence alone cannot prove
understanding. Conflicting or stale evidence lowers confidence, and an
explicit learner correction takes priority over Bud's inference about
that learner's meaning. Confidence includes rationale, evidence
references, freshness, and evidence status.

The current active clarification is Priority 10: **who may correct STT,
translation, interpretation, or state; how does correction propagate; and
when does disagreement remain productive rather than become an error?**
Only one clarification question should be active at a time. Unresolved
items remain explicitly unresolved, deferred, or accepted as uncertainty;
they must not be silently converted into requirements.

Priority 10 is also clarified: corrections create new linked evidence;
original evidence is not erased. The person who expressed the meaning has
authority over intended meaning, facilitators may correct shared
instructions/context, and Bud revises dependent inferences and signals.
Productive disagreement is not automatically an error. Bud asks neutral
clarification when disagreement may contain a meaning gap and must not
pressure agreement.

The current active clarification is Priority 11: **which operational
signals may reach the teacher, what evidence and persistence thresholds
trigger them, and how are stale or resolved signals handled?** Only one
clarification question should be active at a time. Unresolved items remain
explicitly unresolved, deferred, or accepted as uncertainty; they must not
be silently converted into requirements.

Priority 11 is also clarified: facilitator signals use the bounded types
`meaning_gap`, `support_needed`, `participation_pattern`,
`translation_risk`, and `system_error`. Each signal includes scope,
summary, evidence references, confidence, persistence/consequence,
suggested action, timestamps, and status. Signals are recommendations,
not facts. A single silence event cannot create a participation signal;
stale or invalidated signals are withdrawn or marked stale.

The current active clarification is Priority 12: **who creates and
changes groups, how do breakout rooms affect shared context, and what
happens when learners move, merge, or leave groups?** Only one
clarification question should be active at a time. Unresolved items remain
explicitly unresolved, deferred, or accepted as uncertainty; they must not
be silently converted into requirements.

Priority 12 is also clarified: the teacher creates and changes groups;
Bud may recommend regrouping but cannot move learners. Group and breakout
contexts are membership-scoped and change at clear boundaries. Private
learner Bud context never transfers automatically between groups. Merges
and splits create new shared contexts while preserving prior histories;
leaving a group marks inactivity without erasing evidence.

The current active clarification is Priority 13: **is the
teacher-hosted server reachable only on the teacher's machine, across a
trusted local network, or through a configured public tunnel?** Only one
clarification question should be active at a time. Unresolved items remain
explicitly unresolved, deferred, or accepted as uncertainty; they must not
be silently converted into requirements.

Priority 13 is also clarified: trusted-LAN hosting is the guaranteed
prototype path. Secure public reachability is an optional demonstration
path in which the teacher still launches Bud and a protected HTTPS tunnel
or relay provides short-lived workshop access. Public reachability is not
a claim of production cloud hosting.

The current active clarification is Priority 14: **what must the first
Zoom demonstration prove, how does Bud receive permitted voice/text/events,
and what authorization and privacy conditions apply?** Only one clarification question
should be active at a time. Unresolved items remain explicitly
unresolved, deferred, or accepted as uncertainty; they must not be
silently converted into requirements.

## AI Behavior Consolidation - Living Section

This section consolidates AI behavior that has already been clarified.
It is intentionally updated throughout the KRYSTALIZE journey rather
than finalized prematurely.

### Current locked behavior

- Bud is available only when the teacher enables it for the workshop.
- Bud supports the learner privately by default.
- Bud may observe permitted shared workshop input and relevant workshop
  context.
- Private learner-Bud content does not reach the teacher raw by default.
- The teacher receives only minimum-necessary operational signals unless
  the learner explicitly permits raw disclosure.
- Bud may recommend changes, lifecycle actions, or escalation, but the
  teacher or application remains authoritative.
- Bud must not treat silence alone as evidence of confusion,
  disengagement, motivation, or personality.
- Bud should prefer private support before teacher escalation.
- Learners must be aware when Bud is active and what it may observe.
- Bud is initially inactive for each learner and requires explicit
  learner activation.
- Learners may pause, decline, or revoke Bud, and the active/paused state
  must be visible.
- Bud cannot activate itself because of a teacher signal, quietness
  observation, or model decision.
- The MVP uses voice and text input only; video is excluded from the AI
  input path.
- Bud should prefer a timely current-context response, WAIT, or a visible
  delay state over a stale confident sensemaking result.

### Behavior still being clarified

Evidence and confidence, correction and disagreement, facilitator
signals, Adaptive Check-in, Help, I'm Stuck, intervention arbitration,
provider fallback, and failure behavior remain linked to later KRYSTALIZE
items.

## Privacy and Agency Commitments - Living Section

This section explains how the current decisions enforce privacy in
practice. It is updated as later consent, evidence, signal, retention,
and deployment decisions are clarified.

### Workshop-level control

- The teacher chooses whether Bud is available for the workshop.
- If Bud is disabled, it does not activate for learners.
- The teacher controls workshop lifecycle and may pause Bud workshop-wide
  without inspecting private learner-Bud content.

### Learner-level agency

- Each learner explicitly activates Bud after seeing what it can observe.
- Learners may decline, pause, or revoke Bud.
- Bud cannot activate because of a teacher request, a quietness
  observation, or an internal model decision.
- Leaving the workshop ends the active Bud session.

### Information boundaries

- Shared workshop input may be used for permitted workshop reasoning.
- Private learner-Bud content remains private by default.
- Teachers receive minimum-necessary operational signals rather than raw
  private conversations.
- Raw private content requires explicit learner permission before it can
  cross to the teacher.
- Bud must not treat silence as proof of confusion, disengagement,
  motivation, or personality.

### Authority boundaries

- Bud proposes; the application validates and executes.
- The teacher owns workshop operations and WorkshopModel changes.
- Learners remain authoritative over their intended meaning.
- Teacher signals are operational awareness, not facts about a learner.
- Detailed event isolation, retention, consent records, and cloud
  privacy remain subject to later KRYSTALIZE items.
- Exact latency budgets and local model/provider performance remain
  subject to Item 21 benchmarking.
- The application server, not the browser or model, enforces privacy
  scope and evidence access.
- Private Bud contexts are participant-scoped; shared and group events
  are routed only to their permitted scopes.
- Bud uses `unknown`, `low`, `medium`, and `high` confidence with
  evidence references and rationale; it does not use arbitrary learner
  scores.
- Bud prefers `WAIT` or clarification when evidence is insufficient.
- Translation, silence, stale evidence, and unsupported inference cannot
  be presented as established fact.
- Corrections create linked evidence and revise dependent inferences
  without erasing history.
- Bud treats productive disagreement as potentially valid and uses
  neutral clarification for possible meaning gaps.
- Facilitator signals use bounded types, evidence, confidence, scope,
  persistence, suggested action, and expiry/status.
- Group and breakout context is membership-scoped; private learner Bud
  context does not transfer automatically when group membership changes.
- Trusted-LAN hosting is the guaranteed prototype path; secure public
  reachability is an optional teacher-launched demonstration mode.

## Part 3 - Human-Approved Stabilized PRD

This is the destination structure for the implementation-final PRD. It
will be produced incrementally after the relevant KRYSTALIZE decisions
are made and approved by the human project owner.

The stabilized PRD will contain:

1. The preserved product intent and principles from the AREN-originated
   baseline.
2. Human-approved WorkshopModel, lifecycle, identity, privacy, and state
   semantics.
3. Clarified behavior for ME, US, and THE ROOM, including Help, I'm
   Stuck and Adaptive Check-in.
4. Approved Zoom-first companion behavior and teacher-hosted Bud bridge
   boundaries.
5. Explicitly scoped standalone LiveKit fallback requirements.
6. Derived contracts, implementation boundaries, failure behavior, and
   acceptance tests.
7. Clearly separated deferred future work, including possible cloud
   hosting.

Until those decisions are made, this Part 3 is a controlled target
structure, not a claim that the final PRD is already complete.

**Authority note:** AREN-originated product intent remains preserved;
KRYSTALIZE records ambiguity and dependency; the human project owner
approves the final stabilized meaning.
