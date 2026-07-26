# STATE_MODEL_CONTRACT

## Status

Draft contract for Bud AI MVP implementation.

## Contents

- [Authority Rule](#authority-rule)
- [State Objects](#state-objects)
- [WorkshopState](#workshopstate)
- [ParticipantState - ME](#participantstate---me)
- [GroupState - US](#groupstate---us)
- [FacilitatorViewState - THE ROOM](#facilitatorviewstate---the-room-projection)
- [Shared Types](#shared-types)
- [Update Rules](#update-rules)
- [MVP Persistence](#mvp-persistence)
- [Open Decisions](#open-decisions)

This contract defines the minimum authoritative state Bud needs to support ME, US, and THE ROOM without turning model output into automatic truth.

## Authority Rule

The application owns authoritative state. Bud AI may propose state updates, but application code must validate permissions, evidence references, lifecycle rules, and side effects before committing changes.

## State Objects

### WorkshopState

```ts
type WorkshopState = {
  workshop_id: string;
  title: string;
  phase: "setup" | "active" | "paused" | "closing" | "ended";
  supported_languages: LanguageCode[];
  default_language: LanguageCode;
  facilitator_ids: ParticipantId[];
  participant_ids: ParticipantId[];
  group_ids: GroupId[];
  current_activity?: {
    activity_id: string;
    prompt: string;
    goals: string[];
    started_at: ISODateTime;
  };
  room_patterns: RoomPattern[];
  facilitator_signals: FacilitatorSignal[];
  evidence_index: EvidenceRecord[];
  permissions: PermissionState[];
  updated_at: ISODateTime;
};
```

### ParticipantState - ME

```ts
type ParticipantState = {
  participant_id: ParticipantId;
  display_name: string;
  role: "learner" | "facilitator";
  preferred_language: LanguageCode;
  working_languages: LanguageCode[];
  participation: {
    status: "unknown" | "present" | "active" | "quiet" | "disconnected";
    evidence_refs: EvidenceRef[];
    confidence: Confidence;
  };
  understanding: {
    status: "unknown" | "appears_aligned" | "possible_gap" | "requested_help" | "corrected_ai";
    topic?: string;
    evidence_refs: EvidenceRef[];
    confidence: Confidence;
  };
  comprehension: {
    status: "unknown" | "green" | "yellow" | "red";
    checkin_id?: string;
    recap_point_id?: string;
    evidence_refs: EvidenceRef[];
    reported_at?: ISODateTime;
  };
  support_context: {
    last_private_checkin_at?: ISODateTime;
    active_private_thread_id?: string;
    last_help_stuck_at?: ISODateTime;
    last_adaptive_checkin_at?: ISODateTime;
    open_support_requests: SupportRequest[];
  };
  privacy_context: PrivacyContext;
  revision_history: StateRevision[];
  updated_at: ISODateTime;
};
```

ParticipantState must not contain psychological profiling, arbitrary learner scores, or unsupported stable claims about ability, motivation, or personality.

Periodic learner progress summaries are private messages in the
`private_participant_ai` scope. They may orient a learner to the current
workshop focus, but they do not change comprehension state and must not infer a
green, yellow, or red response. Facilitator room reports are aggregate
projections derived from explicit participant-reported comprehension evidence;
no response remains `unknown`.

### GroupState - US

```ts
type GroupState = {
  group_id: GroupId;
  participant_ids: ParticipantId[];
  activity_id?: string;
  shared_meaning: {
    status: "unknown" | "aligned" | "possible_gap" | "active_repair" | "productive_disagreement" | "resolved";
    topic?: string;
    evidence_refs: EvidenceRef[];
    confidence: Confidence;
  };
  meaning_gaps: MeaningGap[];
  pending_confirmations: PeerConfirmationRequest[];
  revision_history: StateRevision[];
  updated_at: ISODateTime;
};
```

A successful translation must not automatically set shared meaning to `aligned`.

### FacilitatorViewState - THE ROOM Projection

```ts
type FacilitatorViewState = {
  workshop_id: string;
  visible_to_facilitator_id: ParticipantId;
  generated_at: ISODateTime;
  room_summary: string;
  participant_signals: PrivacyAwareParticipantSignal[];
  group_signals: PrivacyAwareGroupSignal[];
  recommended_actions: FacilitatorRecommendation[];
  withheld_private_context_count: number;
  evidence_refs: EvidenceRef[];
};
```

FacilitatorViewState is a privacy-aware projection. It must not copy raw private learner-Bud content unless permission explicitly allows that disclosure.

## Shared Types

```ts
type LanguageCode = string;
type ParticipantId = string;
type GroupId = string;
type ISODateTime = string;

type Confidence = {
  level: "unknown" | "low" | "medium" | "high";
  rationale: string;
  evidence_refs: EvidenceRef[];
};

type EvidenceRef = {
  event_id: string;
  item_id?: string;
};

type EvidenceRecord = {
  evidence_id: string;
  event_id: string;
  participant_id?: ParticipantId;
  scope: PrivacyScope;
  kind: "original_text" | "instruction" | "transcript" | "translation" | "interpretation" | "correction" | "permission" | "decision";
  language?: LanguageCode;
  text?: string;
  status: "current" | "disputed" | "corrected" | "superseded";
  created_at: ISODateTime;
};

type PrivacyScope = "public_shared" | "group_shared" | "private_participant_ai";

type PrivacyContext = {
  default_scope: PrivacyScope;
  private_raw_share_allowed: boolean;
  operational_projection_allowed: boolean;
  permission_refs: EvidenceRef[];
};

type PermissionState = {
  permission_id: string;
  participant_id: ParticipantId;
  requester_id: ParticipantId | "bud_ai";
  scope: "share_private_raw" | "share_private_summary" | "contact_private" | "facilitator_view";
  decision: "pending" | "allowed" | "declined" | "expired" | "revoked";
  evidence_refs: EvidenceRef[];
  updated_at: ISODateTime;
};

type SupportRequest = {
  support_request_id: string;
  request_type: "help_stuck" | "adaptive_checkin" | "clarify_instruction" | "translation_help" | "other";
  status: "open" | "answered" | "needs_clarification" | "closed";
  source_event_id: string;
  simplified_explanation?: string;
  grounded_context_refs: EvidenceRef[];
  created_at: ISODateTime;
  updated_at: ISODateTime;
};
```

## Update Rules

- Every non-trivial state change must reference evidence.
- Higher-level synthesis must not overwrite lower-level state; ParticipantState, GroupState, and WorkshopState may coexist in tension.
- Corrected or disputed translation must downgrade or reopen dependent inferences.
- Unknown is valid and preferable to fabricated certainty.
- Private raw content stays private unless permission allows disclosure.
- Minimum-necessary operational projections may enter FacilitatorViewState when privacy rules allow it.
- `help_stuck` support requests must be grounded in facilitator lesson transcript, current activity, or permitted shared context.
- `adaptive_checkin` support requests must be grounded in observable participation patterns over a defined time window. Bud may invite the participant to ask a question, request clarification, keep listening, or contribute, but must not infer disengagement, confusion, motivation, or personality from quietness alone.
- `comprehension.status` is participant-reported calibration evidence. `unknown` is the required default and remains so when no response is received.
- Facilitator comprehension rollups use aggregate counts and a response denominator. They exclude raw private follow-up content and do not infer why a participant chose yellow or red.
- `help_stuck` explanations must not introduce unrelated material or invent lesson content.

## MVP Persistence

For the hackathon MVP, in-memory or lightweight database persistence is acceptable if:

- state survives the core user flow being demonstrated;
- evidence references remain inspectable;
- privacy decisions are enforced by application logic;
- README states the retention limitation honestly.

## Open Decisions

- Exact database technology.
- Retention windows and summarization policy.
- Numeric confidence calibration, if any.
- Longitudinal memory beyond the active workshop.
