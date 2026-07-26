# AI_DECISION_CONTRACT

## Status

Draft contract for Bud AI MVP implementation.

## Contents

- [Decision Envelope](#decision-envelope)
- [Decision Types](#decision-types)
- [Required Semantics](#required-semantics)
- [Shared Types](#shared-types)
- [Validation Rules](#validation-rules)
- [Prompting Contract](#prompting-contract)
- [Open Decisions](#open-decisions)

This contract defines structured decisions proposed by Bud AI Core. Decisions are proposals, not authority. The application validates them against state, privacy, permissions, and allowed tools.

## Decision Envelope

```ts
type AiDecision = {
  decision_id: string;
  workshop_id: string;
  created_at: ISODateTime;
  surface: "me" | "us" | "the_room";
  decision_type: AiDecisionType;
  trigger_event_ids: string[];
  observation: string;
  interpretation: string;
  inference: {
    statement: string;
    status: "unknown" | "provisional" | "supported" | "disputed" | "revised";
  };
  evidence_refs: EvidenceRef[];
  confidence: Confidence;
  privacy_assessment: PrivacyAssessment;
  human_authority: HumanAuthority;
  proposed_tool_calls: ProposedToolCall[];
  state_update_proposal?: StateUpdateProposal;
  rationale: string;
};
```

## Decision Types

```ts
type AiDecisionType =
  | "WAIT"
  | "NO_ACTION"
  | "ASK_CLARIFY"
  | "HELP"
  | "PROPOSE_MEANING"
  | "REQUEST_PEER_CONFIRMATION"
  | "CREATE_FACILITATOR_SIGNAL"
  | "RECOMMEND"
  | "ESCALATE"
  | "REQUEST_PRIVATE_ACCESS";
```

## Required Semantics

- `WAIT` and `NO_ACTION` are valid intelligent decisions.
- `ASK_CLARIFY` is preferred when confidence is low and consequence is non-trivial.
- `HELP` should remain at ME when the issue can appropriately stay private.
- `HELP` may power a private "Help, I'm Stuck" flow when grounded in facilitator transcript, current activity, or permitted shared context.
- `HELP` may also power adaptive private check-ins for quieter participants when based on observable low interaction over time. The decision must be framed as an optional invitation, not a diagnosis of confusion, motivation, or disengagement.
- When multiple candidate actions are available, privacy/permission and explicit user requests take priority, followed by private learner support, US meaning repair, THE ROOM signals, and optional Adaptive Check-in. Conflicting duplicate actions should be suppressed; `WAIT` is valid when candidates are equally important.
- Green, yellow, and red comprehension responses are participant-reported evidence. Yellow may prompt a private clarification question; red may offer bounded private help and a learner-controlled facilitator-escalation option. No response remains unknown.
- `PROPOSE_MEANING` and `REQUEST_PEER_CONFIRMATION` belong to US when translation alone may not preserve shared meaning.
- `CREATE_FACILITATOR_SIGNAL`, `RECOMMEND`, and `ESCALATE` belong to THE ROOM when the issue is systemic, persistent, consequential, or facilitator-owned.
- `REQUEST_PRIVATE_ACCESS` must never imply access before permission is granted.

## Shared Types

```ts
type ISODateTime = string;

type EvidenceRef = {
  event_id: string;
  item_id?: string;
};

type Confidence = {
  level: "unknown" | "low" | "medium" | "high";
  rationale: string;
  evidence_refs: EvidenceRef[];
};

type PrivacyAssessment = {
  source_scope: "public_shared" | "group_shared" | "private_participant_ai";
  proposed_destination_scope: "public_shared" | "group_shared" | "private_participant_ai" | "facilitator_view";
  raw_private_content_included: boolean;
  permission_required: boolean;
  permission_refs: EvidenceRef[];
  minimum_necessary_projection: boolean;
};

type HumanAuthority = {
  decision_owner: "participant" | "peer_group" | "facilitator" | "application";
  reason: string;
  consequence_level: "low" | "medium" | "high";
};

type ProposedToolCall = {
  tool_call_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  requires_permission: boolean;
  permission_refs: EvidenceRef[];
};

type StateUpdateProposal = {
  target_state:
    | "ParticipantState"
    | "GroupState"
    | "WorkshopState"
    | "FacilitatorViewState"
    | "PermissionState";
  operation: "create" | "update" | "append_revision" | "mark_disputed" | "mark_resolved";
  patch: Record<string, unknown>;
  evidence_refs: EvidenceRef[];
};
```

## Validation Rules

Before execution, the application must reject a decision when:

- proposed tool name is not allowed;
- required arguments are missing or malformed;
- evidence references do not exist;
- privacy assessment conflicts with current permissions;
- raw private content would cross a boundary without permission;
- a high-consequence action lacks facilitator or participant authority;
- confidence is overstated relative to evidence;
- state update attempts to create a learner score or psychological profile.

## Prompting Contract

Any model prompt used to produce an `AiDecision` must instruct Bud to:

- preserve original, translation, and interpretation distinctions;
- use unknown when evidence is insufficient;
- cite evidence references;
- keep "Help, I'm Stuck" explanations grounded in permitted workshop context;
- keep adaptive check-ins optional, private, and based only on observable participation patterns;
- avoid introducing unrelated lesson material;
- consider STT, translation, and AI transformation error;
- prefer minimum sufficient intervention;
- identify the human decision owner;
- output valid structured JSON matching this contract.

## Open Decisions

- Whether confidence remains categorical only or adds calibrated numeric scores.
- Exact JSON Schema/Zod representation.
- Model/provider routing and fallback behavior.
- Deterministic arbitration when multiple candidate decisions compete.
