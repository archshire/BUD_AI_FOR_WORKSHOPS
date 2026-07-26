# SYSTEM BEHAVIOR SPECIFICATION

**Status:** Draft Baseline --- Ready for Adversarial Review\
**Scope:** Hackathon Prototype\
**Relationship to other artifacts:** This specification translates the
Product Constitution, Prototype Capability Contract, Demo Thesis, and
ADR-001 into behavioral rules. Exact schemas, tool signatures, provider
choices, UI specifications, and exhaustive acceptance tests remain
downstream contracts.

------------------------------------------------------------------------

## Contents

- [Purpose](#1-purpose)
- [Governing Behavioral Doctrine](#2-governing-behavioral-doctrine)
- [Epistemic Model](#3-epistemic-model)
- [Authority Model](#4-authority-model)
- [Workshop Lifecycle](#5-workshop-lifecycle)
- [State Models](#6-workshopdefinitionstate-and-workshopmodel)
- [ME, US, and THE ROOM](#7-participantstate--me)
- [Privacy and Information Projection](#10-privacy-and-information-projection)
- [Linguistic and Meaning Pipeline](#11-linguistic-and-meaning-pipeline)
- [Intervention Doctrine](#13-intervention-doctrine)
- [Failure and Uncertainty Behavior](#16-failure-and-uncertainty-behavior)
- [Prototype Boundaries](#18-prototype-behavioral-boundaries)
- [Open Decisions](#19-open-decisions)
- [Downstream Contracts](#20-downstream-contracts-required)

# 1. Purpose

This document defines how the AI Partner system should behave.

It exists to prevent a gap between product philosophy and
implementation: Codex or another implementation agent should not have to
invent the system's behavioral doctrine while writing code.

The central product thesis is:

> **The language barrier does not end when a sentence is translated. It
> ends when people have enough shared meaning to continue working
> together.**

The AI is therefore designed as a **partner**, not merely a
command-driven tool. Within bounded authority, it may listen, evaluate,
detect possible problems, surface observations, offer help, recommend
actions, and update its understanding as events unfold.

This does not grant the AI unrestricted autonomy.

> **AI initiative must not displace human agency.**

------------------------------------------------------------------------

# 2. Governing Behavioral Doctrine

The system follows these principles:

1.  **Observe before inferring.**
2.  **Treat inference as provisional, not fact.**
3.  **Link meaningful inferences to evidence.**
4.  **Revise inferences when new observations arrive.**
5.  **Preserve original evidence upstream; interpret downstream.**
6.  **Use the minimum sufficient intervention.**
7.  **Intervene at the smallest appropriate social scope.**
8.  **Escalate according to consequence, persistence, confidence, and
    authority.**
9.  **Derived operational meaning may cross a privacy boundary when
    necessary for facilitation; raw private content does not cross
    without permission.**
10. **The model reasons; the application owns authoritative state,
    permissions, and allowed actions.**
11. **Humans remain authoritative over their own intended meaning.**
12. **The facilitator remains authoritative over workshop direction and
    consequential facilitation decisions.**
13. **The video demonstrates the product; it must never be what makes
    the product appear to work.**

------------------------------------------------------------------------

# 3. Epistemic Model

The system builds understanding through an evidence-driven revision
loop:

``` text
OBSERVATION
    ↓
INTERPRETATION
    ↓
INFERENCE
    ↓
EVIDENCE + CONFIDENCE
    ↓
CURRENT STATE MODEL
    ↓
Is intervention warranted?
    ├── NO → observe more
    └── YES → bounded action
                    ↓
              NEW OBSERVATION
                    ↓
                RE-EVALUATE
                    ↺
```

## 3.1 Observation

An observation is permitted input or behavior captured by the system,
such as:

-   spoken utterance;
-   text input;
-   response to an AI check-in;
-   task submission;
-   participant interaction event;
-   facilitator instruction;
-   permission decision.

Observations should retain provenance where practical:
participant/source, channel, time, workshop/group context, original
language, and relevant event references.

## 3.2 Interpretation

Interpretation gives contextual meaning to an observation without
treating that meaning as certain.

Example:

``` text
Observation:
"So we're supposed to build the entire solution now?"

Possible interpretation:
Participant may currently believe the task is full solution design.
```

## 3.3 Inference

An inference is the system's current provisional assessment based on one
or more observations and workshop context.

Example:

``` text
task_alignment:
possibly_misaligned

evidence:
observation_17

confidence:
moderate
```

## 3.4 Revision

New evidence may strengthen, weaken, replace, or recontextualize an
earlier inference.

The original observation should remain stable; its interpretive
significance may change.

> **Observations are relatively immutable. Inferences are explicitly
> revisable.**

Example:

``` text
T1:
Participant asks whether they should build the whole solution.

Inference:
possible task misunderstanding

T2:
AI checks understanding.

Participant:
"No, I know we're only defining the problem. I was asking whether solution design comes later."

Updated inference:
apparently aligned

Earlier observation reinterpreted:
likely clarification question rather than misunderstanding
```

## 3.5 No false certainty

The system must not silently convert an inference into a definitive
statement about a person.

Avoid:

``` text
participant.is_confused = true
```

Prefer evidence-linked, revisable state such as:

``` text
task_alignment:
possibly_misaligned

confidence:
moderate
```

Exact confidence representation is an open downstream decision.

------------------------------------------------------------------------

# 4. Authority Model

The system separates reasoning authority from execution authority.

> **The model reasons, but the application owns state, permissions, and
> allowed actions.**

The AI may infer:

> "This learner may misunderstand the current task."

The application determines:

-   which state may be mutated;
-   what private information is accessible;
-   what tools/actions exist;
-   whether permission or approval is required;
-   what action is actually executed;
-   what is persisted.

The model must not serve as the sole database, permission system, or
source of truth.

## 4.1 Learner authority

The AI may propose an interpretation of what a participant means.

The participant remains authoritative over their intended meaning.

## 4.2 Facilitator/owner authority

The AI may:

-   elicit;
-   challenge;
-   propose;
-   recommend;
-   offer assistance.

The workshop owner/facilitator decides:

-   the approved workshop model;
-   consequential workshop direction;
-   whether to accept major recommendations;
-   whether to progress, pause, or alter workshop stages.

------------------------------------------------------------------------

# 5. Workshop Lifecycle

``` text
WORKSHOP DEFINITION
Owner/Teacher ↔ AI Partner dialogue
        ↓
WORKSHOP DEFINITION STATE
        ↓
AI elicits / challenges / proposes
Human refines
        ↓
HUMAN APPROVAL
        ↓
APPROVED WORKSHOP MODEL
        ↓
LIVE WORKSHOP
        ↓
OBSERVATIONS + EVOLVING STATES
        ↓
PARTICIPANT / GROUP / WORKSHOP REASONING
        ↓
INTERVENTION / RECOMMENDATION / ESCALATION
        ↓
NEW OBSERVATIONS
        ↺
```

The system must distinguish:

> **WorkshopModel = where the workshop intends to go and how
> progress/readiness is recognized.**

> **WorkshopState = where the workshop currently appears to be relative
> to that model.**

------------------------------------------------------------------------

# 6. WorkshopDefinitionState and WorkshopModel

## 6.1 Definition through dialogue

Success criteria should not be blindly extracted from uploaded material
or invented unilaterally by the AI.

They should emerge through dialogue between the workshop owner/teacher
and the AI Partner.

Conceptual flow:

``` text
Owner provides:
purpose + materials + intended activities
        ↓
AI studies context
        ↓
AI identifies clarity and ambiguity
        ↓
DIALOGUE
        ↓
AI elicits:
- What must participants understand?
- What must they explain, decide, produce, or demonstrate?
- What must be true before progressing?
- What would count as apparent completion but not genuine success?
        ↓
AI proposes operational model
        ↓
Owner challenges / edits / clarifies
        ↓
AI refines
        ↓
OWNER APPROVES
```

## 6.2 AI may challenge criteria

Partnership permits the AI to expose structural tensions.

If a teacher defines success as "everyone agrees with my solution," the
AI may ask whether agreement itself is the objective or whether
participants should understand and critically evaluate the proposal.

The AI does not overrule the owner; it makes assumptions visible.

## 6.3 WorkshopModel

The approved model should conceptually include:

-   workshop objective;
-   stages;
-   current/intended tasks;
-   expected outcomes;
-   success/readiness conditions;
-   provenance/approval of criteria where relevant.

A success criterion may conceptually include:

``` text
criterion
scope
source/provenance
evidence_indicators
approval_status
```

Exact schema remains open.

------------------------------------------------------------------------

# 7. ParticipantState --- ME

## 7.1 Definition

> **ParticipantState is an evolving, evidence-linked model of how the
> participant currently appears to be situated relative to the workshop
> objective.**

It is not a permanent psychological profile.

## 7.2 Legitimate inference dimensions

### Task alignment

Does the participant appear to understand what they are currently
expected to do?

Conceptual states may include:

``` text
unknown
apparently_aligned
possibly_misaligned
clarification_needed
```

### Contextual understanding

What does the participant appear to understand about a specific task,
concept, instruction, or expected output?

Understanding should be object-specific rather than reduced to a single
arbitrary score.

### Progress

Where does the participant appear to be relative to expected workshop
progression?

Conceptual states may include:

``` text
not_yet_observed
starting
progressing
blocked
completed_current_task
```

### Participation state

Describe observable participation patterns without diagnosing motivation
or personality.

Conceptual examples:

``` text
actively_contributing
listening_or_processing
low_observable_activity
interaction_interrupted
unknown
```

Silence alone must not be interpreted as disengagement.

### Support need

What support, if any, appears appropriate?

Conceptual categories:

``` text
none_observed
task_clarification
concept_clarification
language_support
context_recovery
peer_meaning_repair
facilitator_attention
unknown
```

### Trajectory

How has relevant state changed over time?

Example:

``` text
aligned
  ↓
uncertain
  ↓
AI check-in
  ↓
clarification
  ↓
aligned
  ↓
progressing
```

Trajectory is often more useful than a snapshot.

## 7.3 Supporting participant-state structures

ParticipantState should conceptually include:

-   identity/session context;
-   observation history;
-   current inferences;
-   open issues;
-   trajectory;
-   intervention history;
-   evidence/confidence;
-   privacy/permission context.

## 7.4 Prohibited participant profiling

The prototype should not maintain unsupported judgments such as:

-   intelligence;
-   general ability;
-   personality type;
-   attitude;
-   motivation;
-   work ethic;
-   cooperativeness;
-   emotional stability;
-   "difficult learner."

Model the issue, not the person's character.

> **Model the disagreement, not the person as disagreeable.**

## 7.5 No arbitrary overall learner score

Avoid mysterious scalar judgments such as:

``` text
learner_score = 72%
```

Fast facilitator signals may be derived from evidence-backed dimensions,
but they must not masquerade as scientific measurements of the person.

------------------------------------------------------------------------

# 8. GroupState --- US

## 8.1 Definition

> **GroupState is an evolving, evidence-linked model of how effectively
> a set of participants is developing sufficient shared meaning and
> coordinated progress toward the current workshop objective.**

GroupState is not a simple aggregation or average of ParticipantStates.

It models what happens **between people**.

## 8.2 Shared task alignment

Do group members appear to share an understanding of what they are
trying to accomplish?

Conceptual states:

``` text
unknown
apparently_shared
possibly_fragmented
clarification_needed
```

## 8.3 Shared meaning / mutual understanding

Does the group appear to understand one another sufficiently to continue
collaborating?

A successful technical translation does not automatically imply shared
meaning.

Potential meaning gaps should retain:

-   participants involved;
-   topic;
-   evidence;
-   confidence;
-   status;
-   clarification/intervention history.

## 8.4 Human authority over meaning

When asked "What did she mean?", the AI should not present uncertain
interpretation as telepathic certainty.

Prefer:

> "I think she may mean X rather than Y, based on the preceding context.
> Would you like me to help confirm that with her?"

> **The AI may propose meaning. Humans remain authoritative over what
> they intended.**

## 8.5 Disagreement

Disagreement is not automatically a group failure.

The system should distinguish, where evidence permits:

-   productive disagreement with apparent mutual understanding;
-   disagreement containing possible meaning breakdown;
-   off-task disagreement;
-   unresolved substantive disagreement.

Productive disagreement may require no intervention.

The relationship between disagreement, mutual understanding, and
workshop purpose determines behavior.

## 8.6 Collaborative progress

The system may distinguish between participants merely contributing
independently and contributions that appear to build, clarify,
challenge, or integrate toward a shared outcome.

It should avoid unsupported social/personality judgments.

## 8.7 Participation patterns

Permitted observable participation may inform facilitation.

Example observation:

> Participant A has contributed repeatedly while Participant B has not
> yet contributed verbally.

This does not justify:

> Participant A is domineering.

or:

> Participant B is disengaged.

A bounded response may simply create space:

> "Would anyone who hasn't had space yet like to add something?"

## 8.8 GroupState conceptual structure

``` text
GroupState

identity/context
shared_task_alignment
shared_meaning
open_meaning_gaps
disagreements
collaborative_progress
participation_patterns
open_issues
intervention_history
trajectory
evidence/confidence
```

------------------------------------------------------------------------

# 9. WorkshopState and FacilitatorViewState --- THE ROOM

## 9.1 WorkshopState

WorkshopState answers:

> **What are we trying to accomplish, where are we now, what should
> participants understand or produce at this point, and what evidence
> suggests whether the room is ready to move forward?**

Conceptually it includes:

``` text
PURPOSE
    workshop_objective

STRUCTURE
    stages
    current_stage
    current_task
    expected_outcomes
    success_conditions

PROGRESSION
    scheduled_progress
    observed_progress
    readiness_to_advance
    unresolved_blockers

ROOM STATE
    derived participant/group signals
    alignment/support distribution

PATTERNS
    common misunderstandings
    recurring questions
    shared blockers
    emerging disagreements
    evidence/confidence

INTERVENTIONS
    actions attempted
    initiator
    target
    observed response/outcome

TRAJECTORY
    significant room-state transitions
```

## 9.2 Scheduled progression vs cognitive progression

The agenda clock and workshop readiness are not the same.

If the scheduled stage is ending but multiple groups remain unresolved,
the AI may recommend delaying progression.

The facilitator decides.

## 9.3 Pattern reasoning

The facilitator AI should reason at three levels:

### Individual

> "Learner B may need clarification on the expected output. AI support
> is underway."

### Pattern

> "Several participants across multiple groups appear to share the same
> misunderstanding."

### Whole room

> "The workshop is scheduled to progress, but multiple groups remain
> unresolved on the current objective. Consider clarifying before moving
> on."

The system should distinguish localized issues from systemic patterns.

Three unrelated individual issues may require individual support.

The same issue appearing across groups may indicate an instruction-level
or workshop-level problem.

## 9.4 FacilitatorViewState

The facilitator must not receive unrestricted ParticipantState.

Instead:

``` text
ParticipantState
        ↓
PRIVACY-AWARE PROJECTION
        ↓
FacilitatorViewState
```

FacilitatorViewState may conceptually contain:

``` text
participant_status
operational_signals
support/intervention_status
trajectory
confidence
facilitator_attention_priority
pattern_membership
consented_context
```

## 9.5 Master of states

The facilitator AI synthesizes:

``` text
Participant States
        +
Group States
        +
Public Workshop Events
        +
Workshop Model
        +
Workshop State
        ↓
Privacy-aware synthesis
        ↓
Facilitator AI Partner
```

It should answer not only **what appears to be happening**, but where
useful:

-   why it matters;
-   what evidence supports the assessment;
-   what has already been attempted;
-   what it recommends;
-   whether it can help;
-   what decision remains with the facilitator.

------------------------------------------------------------------------

# 10. Privacy and Information Projection

## 10.1 Interaction spaces

The product recognizes conceptually:

-   public/shared workshop space;
-   group/shared collaboration space;
-   private participant--AI Partner space.

Participants should be informed before participation that the workshop
is a public learning environment and should calibrate public
interactions accordingly.

## 10.2 Automatically shareable operational signals

Operational signals may cross to the facilitator without exposing
private wording when necessary for facilitation.

Examples:

-   possible task misalignment;
-   progress/blockage;
-   support need;
-   trajectory;
-   unresolved issue category;
-   whether AI support has been attempted;
-   whether a pattern appears localized or systemic;
-   confidence of the inference.

## 10.3 Permission-gated information

Private content such as:

-   private AI chat history;
-   exact private wording;
-   private questions;
-   detailed confidential reasoning/concerns;

requires explicit permission before facilitator access where such access
is supported.

The permission mechanism must be application-enforced.

## 10.4 Derived meaning vs raw content

> **Derived operational meaning may cross the privacy boundary when
> necessary for facilitation; raw private content does not cross without
> permission.**

Example:

Private content:

> "I have no idea what this person is talking about and I'm embarrassed
> to ask."

Permitted operational signal:

> "Learner may benefit from clarification on the current task."

## 10.5 Private information may inform support

Private information may influence how the AI supports the participant
without becoming content the AI is entitled to redistribute.

> **Signal is not private content.**

## 10.6 Refusal of permission

If a participant refuses access, the system respects that refusal.

The AI must not override human agency merely because disclosure might
help facilitation.

------------------------------------------------------------------------

# 11. Linguistic and Meaning Pipeline

The governing principle is:

> **Listen continuously. Translate complete thoughts. Reason when
> meaning warrants it.**

## 11.1 Pipeline

``` text
Participant speaks
        ↓
Continuous multilingual STT
        ↓
Original-language transcript accumulates
        ↓
Meaningful utterance/turn completion
        ↓
Original utterance preserved
        ├──> contextual translation when required
        └──> semantic evaluation when warranted
```

## 11.2 Three linguistic artifacts

### Original

What was expressed in the source language.

### Translation

What another participant was shown.

### Contextual interpretation

What the AI provisionally infers the speaker may have meant in context.

These must not be collapsed into one source of truth.

> **Original language is source evidence. Translation is a
> representation. Interpretation is an inference.**

## 11.3 Dynamic equivalence

Translation should aim, where technically practical, for contextually
meaningful equivalence rather than premature word-by-word substitution.

Translation may use:

-   complete utterance;
-   source/target language;
-   limited recent conversational context;
-   relevant workshop terminology/context.

## 11.4 Three latency classes

**Transcription:** near-immediate evidence capture.

**Translation:** sufficient semantic completeness before translation.

**AI reasoning:** event-triggered deeper cognition.

The target is not simply time to first translated word.

It is:

> **Time until the receiving human has enough accurate shared meaning to
> continue collaborating.**

------------------------------------------------------------------------

# 12. Event Processing Model

"Continuous monitoring" means:

> **Continuous accumulation of permitted observations and ongoing
> revision of contextual inferences as new evidence becomes available.**

It does not mean a powerful LLM reasons continuously on every token or
millisecond.

Conceptual flow:

``` text
RAW EVENT
    ↓
NORMALIZED EVENT
    ↓
Relevant context/state retrieval
    ↓
Does this event require:
    - capture only?
    - translation?
    - lightweight state update?
    - deeper AI evaluation?
    ↓
Structured inference/decision
    ↓
Authority/permission check
    ↓
Bounded tool/action if warranted
    ↓
State update
    ↓
Visible consequence
    ↓
New observations
```

Meaningful triggers may include:

-   facilitator completes an instruction;
-   participant completes a substantive utterance;
-   participant submits a substantive response;
-   participant asks the AI a question;
-   peer exchange creates a meaningful conversational turn;
-   participant responds to an AI check-in;
-   facilitator requests workshop state;
-   privacy/permission changes.

Exact trigger policy remains a downstream contract.

------------------------------------------------------------------------

# 13. Intervention Doctrine

The AI should not intervene merely because it can.

A meaningful decision should consider:

``` text
What am I observing?
What might it mean?
How confident am I?
How consequential is it to the workshop objective?
Can I appropriately help within my authority?
What is the minimum sufficient intervention?
What decision belongs to the human?
```

Possible behavioral modes:

``` text
OBSERVE
CHECK / CALIBRATE
HELP
PROPOSE INTERPRETATION
RECOMMEND
OFFER ASSISTANCE
REQUEST PERMISSION
ESCALATE / SIGNAL
```

A friendly calibration check is preferred over premature diagnosis.

Example:

> "Quick check --- where are you at?"

Possible responses:

-   "I'm following."
-   "I'm still processing."
-   "I'm a bit lost --- catch me up."
-   "I disagree with the direction."

Human response becomes new evidence.

------------------------------------------------------------------------

# 14. ME → US → THE ROOM Escalation Logic

> **Intervene at the smallest appropriate social scope; escalate
> according to consequence, persistence, confidence, and authority.**

Conceptually:

``` text
Issue detected
      ↓
Can it appropriately be addressed privately at ME?
      ├── YES → private support/check-in
      └── NO
           ↓
Is it relational/group-level and appropriate for US?
      ├── YES → meaning repair/group support
      └── NO / unresolved / systemic / consequential
           ↓
THE ROOM
      ↓
Facilitator signal / recommendation / offer of help
```

This is not a rigid ladder.

A consequential issue may require direct facilitator attention.

Repeated failed AI support may increase escalation priority.

The AI should be able to express whether it can attempt resolution and
let the facilitator choose where authority requires.

------------------------------------------------------------------------

# 15. End-to-End Behavior Maps

These maps define generalized behavior, not hard-coded demo scripts.

## 15.A Facilitator instruction → possible learner misunderstanding

``` text
Facilitator gives instruction
        ↓
participant_utterance normalized event
        ↓
WorkshopModel + current task + participant context retrieved
        ↓
AI evaluates substantive response
        ↓
Possible task misalignment inferred
with evidence/confidence
        ↓
Is confidence/consequence sufficient for action?
        ↓
Private calibration check
        ↓
Participant responds
        ↓
New observation
        ↓
Inference revised
        ├── aligned → no escalation
        ├── still uncertain → support
        └── unresolved/outside authority → facilitator signal
```

## 15.B AI inference is wrong → participant corrects AI

The AI must not defend its prior inference.

``` text
AI:
"It sounds like you may be interpreting the task as X. Is that right?"

Participant:
"No. I understand Y; I was asking whether X comes later."

        ↓
New observation
        ↓
Prior inference weakened/replaced
        ↓
ParticipantState updated
        ↓
Earlier evidence recontextualized
        ↓
No unnecessary escalation
```

Behavioral rule:

> **When credible new evidence contradicts an inference, update rather
> than defend the inference.**

## 15.C Peer multilingual meaning gap

``` text
Participant A speaks in language A
        ↓
Original preserved
        ↓
Utterance completes
        ↓
Contextual translation shown to B
        ↓
B responds
        ↓
A/B behavior suggests possible meaning mismatch
or participant explicitly asks AI
        ↓
AI considers:
original + translation shown + recent context
        ↓
AI proposes contextual interpretation with uncertainty
        ↓
Where needed:
offer to confirm with original speaker
        ↓
Human clarification/confirmation
        ↓
Shared meaning state updated
```

The AI must not claim certainty about speaker intent without
confirmation where ambiguity remains.

## 15.D Productive disagreement

``` text
A presents position X
B presents position Y
        ↓
AI detects disagreement
        ↓
Evidence suggests mutual understanding is present
and disagreement is relevant to task
        ↓
Do not pathologize or automatically resolve
        ↓
Observe
or minimally structure discussion if useful
```

Disagreement may be evidence of productive engagement.

## 15.E Private disclosure → operational signal

``` text
Participant privately shares concern
        ↓
Private observation retained in permitted scope
        ↓
AI infers operational support need
        ↓
Facilitator projection generated
        ↓
Raw private content withheld
        ↓
Only minimum sufficient operational signal surfaces
```

If facilitator requests raw private content:

``` text
permission request
        ↓
participant grants or declines
        ↓
application enforces result
```

## 15.F Individual issue becomes room-level pattern

``` text
Participant A: issue X
Participant B: issue X
Participant C in another group: issue X
        ↓
Individual evidence remains distinct
        ↓
Pattern synthesis detects recurrence
        ↓
AI considers whether common cause may be
instruction/task-level rather than individual
        ↓
WorkshopState pattern created/updated
        ↓
Facilitator receives:
pattern + evidence summary + consequence + recommendation
        ↓
AI may offer:
"I can draft a concise clarification."
        ↓
Facilitator decides
```

## 15.G AI cannot resolve → facilitator escalation

``` text
Issue detected
        ↓
AI attempts bounded support where appropriate
        ↓
New evidence shows issue persists
        ↓
Intervention history consulted
        ↓
AI assesses:
persistence + consequence + confidence + authority
        ↓
Facilitator signal
        ↓
Explain:
- what appears to be happening
- why it matters
- what has been tried
- what AI can still do
- what decision/intervention may require facilitator
```

## 15.H Facilitator asks "How is everyone doing?"

The facilitator AI should not create an answer from an unstructured LLM
recollection alone.

``` text
Facilitator query
        ↓
WorkshopState
+ FacilitatorViewStates
+ GroupStates
+ WorkshopModel
+ recent permitted evidence
        ↓
Privacy-aware synthesis
        ↓
Response includes, where useful:
- overall trajectory
- individuals/groups needing attention
- recurring patterns
- confidence/uncertainty
- interventions already underway
- recommendations
- offer of AI assistance
```

Raw private content is excluded unless permission permits it.

## 15.I Workshop stage readiness/progression

``` text
Scheduled stage boundary approaches
        ↓
WorkshopModel success/readiness conditions retrieved
        ↓
Participant + Group + Workshop evidence evaluated
        ↓
Readiness inference formed
        ↓
If unresolved blockers remain:
AI recommends delay/clarification/support
        ↓
Facilitator decides whether to progress
        ↓
Decision becomes new workshop event/state
```

The AI must not autonomously redefine success criteria during the live
workshop.

------------------------------------------------------------------------

# 15A. Cross-Cutting Behavioral Safeguards

## 15A.1 Intervention arbitration and suppression

Multiple scopes may detect the same underlying issue. The system must
avoid intervention pile-up.

``` text
Candidate ME / US / ROOM interventions
        ↓
ARBITRATION
        ↓
Is a related intervention already active?
Has a broader intervention superseded a narrower one?
Has the human already responded?
Would another action duplicate, contradict, or overload?
        ↓
ONE COORDINATED ACTION
or
WAIT / NO_ACTION
```

A room-wide facilitator clarification may temporarily suppress redundant
private clarifications until new evidence arrives.

## 15A.2 Inference lifecycle and staleness

Meaningful inferences require lifecycle semantics:

``` text
CREATED → SUPPORTED/UPDATED → STALE → RESOLVED/SUPERSEDED
```

A facilitator-facing signal must not remain operationally urgent merely
because an old inference was never explicitly deleted.

Exact expiry rules belong in the State Model Contract.

## 15A.3 Unknown vs negative evidence

The system must distinguish:

``` text
NO EVIDENCE OF UNDERSTANDING
        ≠
EVIDENCE OF MISUNDERSTANDING
```

Silence, missing input, or insufficient observation should normally
produce `unknown` or `insufficient_evidence`, not a negative learner
judgment.

## 15A.4 Evidence provenance and intervention contamination

Evidence should preserve enough provenance to distinguish, where
relevant:

``` text
SPONTANEOUS
participant generated independently

ELICITED
response to a neutral calibration/check

SCAFFOLDED
response after AI support

AI-SUPPLIED
response may reproduce content supplied by AI
```

A learner repeating an explanation supplied by the AI is weaker evidence
of independent understanding than successful reconstruction or
application.

## 15A.5 WAIT / NO_ACTION as intelligence

Restraint is a first-class decision.

``` text
possible issue
confidence: moderate
consequence: low
new evidence likely soon
intervention cost: disruptive

DECISION:
WAIT_FOR_EVIDENCE
```

The AI should not intervene merely because it noticed something.

## 15A.6 Participant calibration of proactive support

Where supported by prototype scope, participants should be able to
calibrate proactive AI assistance, for example requesting fewer
check-ins or more help.

Such preferences operate within workshop-safe and facilitator-approved
boundaries.

The exact preference schema/UI remains open.

## 15A.7 Minimum-necessary privacy projection

Private information may support internal reasoning, but only the minimum
necessary operational consequence should cross the privacy boundary.

Example:

Private: "I have a personal reason that makes this slide difficult to
process."

Operational projection: "Learner may benefit from additional time or an
alternative presentation."

The system must not assume that paraphrasing sensitive private
information makes disclosure acceptable.

## 15A.8 Scoped permission

Permission is not merely binary. Where private access is requested, the
system should make clear, as applicable:

-   who is requesting;
-   what content/context is requested;
-   why it is requested;
-   scope of access;
-   duration;
-   allow/decline decision.

Exact permission mechanics remain downstream.

## 15A.9 State-scope independence

ParticipantState, GroupState, and WorkshopState represent different
scopes.

A participant may be individually aligned while their group is
collectively fragmented.

Higher-level synthesis must not silently overwrite lower-level state
merely to force consistency.

## 15A.10 Causal humility

Repeated correlation does not prove cause.

If several participants share the same misunderstanding, the AI may say:

> "This pattern may indicate an instruction-, translation-, or
> context-level issue."

It must not automatically conclude:

> "The facilitator explained it badly."

Root-cause attribution requires sufficient evidence.

## 15A.11 Human rejection of recommendation

When an authorized human rejects an AI recommendation:

1.  record the decision as context;
2.  respect the decision;
3.  adapt support within remaining authority;
4.  continue observing;
5.  re-escalate only when materially new evidence or increased
    consequence warrants it.

## 15A.12 Accessibility behavior

Core workshop meaning and AI support should not depend exclusively on
one modality where technically feasible.

The prototype should support voice and text pathways for core
interactions and make spoken meaning available through
text/caption/translation surfaces where implemented.

Accessibility claims must remain bounded to what is actually implemented
and tested.

## 15A.13 Translation dispute and correction propagation

If a participant disputes a translation:

``` text
translation disputed
        ↓
do not treat translation as unquestioned evidence
        ↓
preserve original
        ↓
retranslate with context and/or request clarification
        ↓
update translation status
        ↓
re-evaluate dependent inferences
```

Corrections to upstream evidence must propagate to downstream inferences
that materially depended on it.

## 15A.14 Provenance and dependency traceability

The system should preserve enough linkage to support:

> "Why do you think this?"

and:

> "What changed?"

Conceptually:

``` text
Observation
    ↓
Translation
    ↓
Interpretation
    ↓
Inference
    ↓
Group/Workshop Pattern
    ↓
Facilitator Signal
```

A graph database is not required for the prototype; sufficient
reference/provenance linkage is.

## 15A.15 System self-error hypothesis

Before attributing a discrepancy to a learner or group, the system
should consider whether its own transformation pipeline contributed:

-   STT error;
-   translation error;
-   lost context;
-   summarization distortion;
-   incorrect AI interpretation.

If multiple people who consumed the same transformed representation
exhibit the same mismatch, the transformation itself becomes a plausible
hypothesis requiring examination.

> **The AI must be capable of questioning itself.**

------------------------------------------------------------------------

# 16. Failure and Uncertainty Behavior

A serious partner system must specify what happens when its
interpretation or infrastructure is imperfect.

## 16.1 AI interpretation is uncertain

The system should:

-   represent uncertainty;
-   avoid definitive claims;
-   seek calibration when useful;
-   observe more when intervention is not warranted.

## 16.2 Participant rejects AI interpretation

The rejection is new evidence.

The AI should update its model rather than argue for its prior
classification.

## 16.3 Evidence conflicts

Do not force false resolution.

Maintain uncertainty, retain competing evidence where useful, and seek
clarification if consequential.

## 16.4 Translation is uncertain

Preserve the original.

Avoid presenting uncertain interpretation as exact meaning.

Where consequential, offer clarification or human confirmation.

## 16.5 STT is likely wrong

The system should avoid building high-confidence inference on obviously
unreliable transcription where detectable.

Fallback behavior and confidence propagation require downstream design.

## 16.6 Participant refuses permission

Respect refusal.

Do not expose private content.

Continue to provide support within permitted boundaries.

## 16.7 AI intervention fails

Record the intervention and observed outcome.

Do not repeat identical intervention indefinitely.

Reassess strategy and escalate when persistence/consequence/authority
warrants.

## 16.8 Facilitator rejects AI recommendation

The facilitator decision is authoritative.

Record the decision as part of workshop context and continue observing.

The AI may update future recommendations based on subsequent evidence;
it should not repeatedly insist without materially new evidence.

## 16.9 Workshop evidence conflicts with WorkshopModel

The AI may surface the mismatch.

It must not silently rewrite the approved model.

The owner/facilitator may revise the model through an authorized
process.

## 16.10 System/provider failure

Where STT, translation, model, or real-time services fail, the product
should degrade transparently rather than fabricate successful
intelligence.

Exact fallback UX is downstream.

------------------------------------------------------------------------

# 17. Prohibited Behaviors and Anti-Patterns

The system must not:

-   present provisional inference as objective truth;
-   create permanent psychological labels from workshop behavior;
-   infer motivation from silence alone;
-   equate disagreement with misunderstanding;
-   equate translation success with shared meaning;
-   claim certainty about another person's intended meaning without
    adequate basis;
-   expose raw private content as a facilitator "signal";
-   bypass permission because disclosure would be useful;
-   let the model directly become the permission/authority system;
-   let the AI silently redefine workshop success criteria;
-   automatically progress the workshop against facilitator authority;
-   invoke expensive deep reasoning on every token/audio fragment
    without purpose;
-   hard-code demo misunderstandings or interventions;
-   seed recommendations and present them as reasoned;
-   repeatedly intervene when observation is more appropriate;
-   use arbitrary learner scores as pseudo-scientific truth;
-   make unsupported personality/ability judgments;
-   confuse LiveKit/Zoom-specific objects with the core behavioral
    model.

------------------------------------------------------------------------

# 18. Prototype Behavioral Boundaries

The prototype may deliberately:

-   constrain participant count;
-   constrain guaranteed languages;
-   seed workshop setup;
-   simplify persistence;
-   use limited state dimensions;
-   simplify permission UX;
-   use managed infrastructure;
-   simulate disclosed visual scale.

The prototype must genuinely implement the intelligence it claims within
those boundaries.

> **Simulate scale. Seed setup. Simplify infrastructure. Never simulate
> claimed intelligence.**

Production requirements likely include stronger:

-   consent;
-   authentication/authorization;
-   retention controls;
-   auditability;
-   compliance;
-   concurrency;
-   durable state;
-   model evaluation;
-   privacy-aware routing;
-   multi-agent/workflow orchestration.

These are future directions, not hackathon claims unless implemented.

------------------------------------------------------------------------

# 18A. Prototype Depth Tiers

Architectural support and implementation depth are not the same claim.

## MUST PROVE DEEPLY

The hackathon prototype should genuinely demonstrate:

-   **ME:** facilitator-to-learner understanding/support based on
    dynamic input;
-   **US:** multilingual peer meaning repair beyond literal translation;
-   **THE ROOM:** evidence-backed facilitator state/pattern synthesis
    and recommendation;
-   **PRIVACY:** demonstrable private-content boundary with operational
    signals;
-   **LANGUAGE:** preserved original → utterance-level translation →
    contextual clarification/repair;
-   **VOICE + TEXT:** genuine supported input paths;
-   **NON-SCRIPTED INTELLIGENCE:** varied inputs produce
    context-dependent evaluation rather than hard-coded demo triggers.

## ARCHITECTURALLY SUPPORTED / MAY BE LIGHTER IN PROTOTYPE

The architecture should permit, but the hackathon need not implement at
production depth:

-   advanced longitudinal trajectory;
-   sophisticated multi-group pattern inference;
-   fine-grained permission scopes;
-   complex intervention arbitration;
-   extensive workshop co-definition workflows;
-   advanced accessibility/compliance coverage;
-   Zoom adapter;
-   durable multi-workshop memory;
-   multi-agent orchestration.

The PRD must label each capability accurately as implemented, limited,
future, or out of scope.

------------------------------------------------------------------------

# 19. Open Decisions

The following are intentionally not frozen by this document:

1.  Exact JSON/data schemas for:

    -   WorkshopDefinitionState;
    -   WorkshopModel;
    -   ParticipantState;
    -   GroupState;
    -   WorkshopState;
    -   FacilitatorViewState;
    -   normalized events.

2.  Exact confidence representation/calibration.

3.  Exact normalized event taxonomy and payload contracts.

4.  Exact AI structured decision schema.

5.  Exact bounded tool names, signatures, permissions, and side effects.

6.  Exact STT provider/model.

7.  Exact translation provider/model and prompting strategy.

8.  Exact LLM/provider and routing abstraction.

9.  Exact turn/utterance detection mechanism and thresholds.

10. Exact persistence/database architecture.

11. Authentication, participant identity, and session mechanics.

12. Exact UI/screens and fallback UX.

13. Exact state retention windows and summarization policy.

14. Exact evaluation methodology and thresholds for
    intervention/escalation.

These decisions must be made explicitly in downstream contracts rather
than invented ad hoc during implementation.

------------------------------------------------------------------------

# 20. Downstream Contracts Required

Before broad implementation delegation, produce:

## A. State Model Contract

Exact fields, provenance, lifecycle, persistence, privacy
classification, and update rules for each state object.

## B. Normalized Event Contract

Exact platform-independent events and payloads.

## C. AI Decision Contract

Structured model input/output, evidence references, confidence behavior,
and allowed decision categories.

## D. Tool Contract

Exact actions, authorization requirements, side effects,
idempotency/error behavior, and audit requirements.

## E. Voice/Language Pipeline Decision

Provider choices, streaming STT, utterance completion, translation
context, latency targets, confidence/fallback behavior.

## F. PRD

User journeys, UI states, functional requirements, non-functional
requirements, acceptance criteria, setup, limitations, and
implementation scope.

## G. Traceability and Coherence Matrix

Map:

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
Acceptance test
    ↓
Demo evidence
```

Every major claim should connect backward to a reason and forward to an
docs/04_IMPLEMENTATION/test.

------------------------------------------------------------------------

# 21. Behavioral Mental Model

``` text
THE WORKSHOP MODEL DEFINES THE HUMAN-APPROVED COMPASS.
                    ↓
THE ENVIRONMENT PRODUCES OBSERVATIONS.
                    ↓
THE EVENT LAYER DESCRIBES WHAT HAPPENED.
                    ↓
THE AI PARTNER INTERPRETS WHAT IT MAY MEAN.
                    ↓
EVIDENCE-LINKED STATE IS UPDATED PROVISIONALLY.
                    ↓
THE SYSTEM DECIDES WHETHER ACTION IS WARRANTED.
                    ↓
THE APPLICATION ENFORCES AUTHORITY AND PRIVACY.
                    ↓
BOUNDED TOOLS INTERACT WITH HUMANS OR STATE.
                    ↓
HUMAN RESPONSE CREATES NEW OBSERVATIONS.
                    ↓
THE SYSTEM REVISES ITS UNDERSTANDING.
                    ↺
```

For participants:

> **Do not profile who the person is. Model how they currently appear to
> be situated relative to the workshop objective.**

For groups:

> **Do not confuse agreement with understanding. Preserve productive
> disagreement while repairing meaning gaps.**

For facilitators:

> **Surface what matters, why it matters, what has been tried, what the
> AI recommends, what it can help with, and what decision remains
> human.**

For privacy:

> **Derived operational meaning may cross when necessary; raw private
> content does not cross without permission.**

For language:

> **Listen continuously. Translate complete thoughts. Reason when
> meaning warrants it.**

For agency:

> **AI initiative without displacement of human agency.**

For integrity:

> **The video demonstrates the product. It must never be what makes the
> product appear to work.**
