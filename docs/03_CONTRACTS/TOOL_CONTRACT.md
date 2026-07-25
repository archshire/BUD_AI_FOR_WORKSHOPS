# TOOL_CONTRACT

## Status

Draft contract for Bud AI MVP implementation.

This contract defines bounded tools Bud AI Core may request. Tools are executed by the application only after validation.

## Tool Execution Rule

Bud proposes. The application validates and executes. Tool calls must produce auditable `tool_result` events and any state mutations must reference evidence.

## Tool Registry

### update_participant_state

```ts
type UpdateParticipantStateArgs = {
  participant_id: string;
  patch: Record<string, unknown>;
  evidence_refs: EvidenceRef[];
  confidence: Confidence;
};
```

Permission: application-owned state validation.

Side effect: updates ParticipantState or appends a revision.

Reject when: patch includes profiling, arbitrary scoring, unsupported certainty, or missing evidence.

### send_private_checkin

```ts
type SendPrivateCheckinArgs = {
  participant_id: string;
  message: string;
  reason: string;
  evidence_refs: EvidenceRef[];
  checkin_type?: "confusion_support" | "adaptive_participation" | "comprehension_followup" | "general";
};
```

Permission: allowed when Bud may contact the participant privately in the current workshop context.

Side effect: sends private message to participant and records event.

Reject when: message reveals another participant's private content, bypasses permission, diagnoses motivation/personality, or treats silence alone as proof of misunderstanding or disengagement.

Adaptive participation check-ins must be optional invitations. Acceptable prompt content includes asking whether the participant wants to ask a question, request clarification, keep listening, or contribute. The participant's response or dismissal becomes new evidence.

Comprehension follow-ups must treat green, yellow, and red as participant-reported signals rather than verified understanding. They may never infer a response from silence.

### send_support_message

```ts
type SendSupportMessageArgs = {
  target_scope: "private_participant_ai" | "group_shared" | "public_shared";
  target_id: string;
  message: string;
  evidence_refs: EvidenceRef[];
};
```

Permission: depends on target scope and current privacy state.

Side effect: sends support message to participant, group, or room.

Reject when: target scope leaks raw private content without permission.

### send_help_stuck_explanation

```ts
type SendHelpStuckExplanationArgs = {
  participant_id: string;
  simplified_explanation: string;
  source_context_refs: EvidenceRef[];
  uncertainty_note?: string;
  followup_prompt: string;
};
```

Permission: private participant-Bud scope by default.

Side effect: sends a simplified private explanation and records an open or answered `help_stuck` support request. The explanation must use the locked grounding hierarchy: learner request, current workshop stage/task/objective, recent facilitator context with a five-minute freshness target, and relevant current-stage events.

Reject when: explanation lacks source context, invents unrelated lesson material, exposes another participant's private content, or sends raw private content to the facilitator.

### propose_meaning_interpretation

```ts
type ProposeMeaningInterpretationArgs = {
  group_id: string;
  utterance_event_id: string;
  original_text: string;
  translated_text?: string;
  proposed_interpretation: string;
  confidence: Confidence;
  evidence_refs: EvidenceRef[];
};
```

Permission: group/shared context only, unless private permission allows broader projection.

Side effect: creates a US-level meaning repair proposal.

Reject when: original, translation, and interpretation are collapsed into one undifferentiated claim.

### request_peer_confirmation

```ts
type RequestPeerConfirmationArgs = {
  group_id: string;
  participant_ids: string[];
  prompt: string;
  meaning_gap_id?: string;
  evidence_refs: EvidenceRef[];
};
```

Permission: group/shared context.

Side effect: asks peers to confirm or repair meaning.

Reject when: prompt pressures agreement or treats disagreement as failure.

### create_facilitator_signal

```ts
type CreateFacilitatorSignalArgs = {
  facilitator_id: string;
  signal_type: "meaning_gap" | "participation_pattern" | "translation_risk" | "support_needed" | "system_error";
  summary: string;
  severity: "low" | "medium" | "high";
  evidence_refs: EvidenceRef[];
  privacy_projection: {
    raw_private_content_included: false;
    minimum_necessary: true;
  };
};
```

Permission: facilitator view allowed; raw private content must not be included.

Side effect: appends a facilitator-visible operational signal.

Reject when: raw private content is included or evidence is missing.

### recommend_facilitator_action

```ts
type RecommendFacilitatorActionArgs = {
  facilitator_id: string;
  recommendation: string;
  rationale: string;
  consequence_level: "low" | "medium" | "high";
  evidence_refs: EvidenceRef[];
  human_decision_required: true;
};
```

Permission: facilitator authority required.

Side effect: displays recommendation; does not automatically perform facilitator decision.

Reject when: tool attempts to make a consequential decision directly.

### request_private_access

```ts
type RequestPrivateAccessArgs = {
  participant_id: string;
  requester_id: string | "bud_ai";
  requested_scope: "share_private_raw" | "share_private_summary";
  reason: string;
  expires_at?: string;
  evidence_refs: EvidenceRef[];
};
```

Permission: participant must approve before access.

Side effect: creates permission request.

Reject when: tool assumes access before approval.

### mark_translation_disputed

```ts
type MarkTranslationDisputedArgs = {
  translation_event_id: string;
  disputed_by_participant_id: string;
  explanation?: string;
  evidence_refs: EvidenceRef[];
};
```

Permission: participant correction allowed.

Side effect: marks translation disputed and reopens dependent inference.

Reject when: dependent state remains high-confidence without reconsideration.

## Shared Types

```ts
type EvidenceRef = {
  event_id: string;
  item_id?: string;
};

type Confidence = {
  level: "unknown" | "low" | "medium" | "high";
  rationale: string;
  evidence_refs: EvidenceRef[];
};
```

## Global Rejection Conditions

The application must reject any tool call that:

- is not in the registry;
- lacks required evidence;
- violates privacy scope;
- exceeds current participant/facilitator authority;
- fabricates permission;
- claims unimplemented integration behavior;
- mutates state without an audit trail;
- treats model output as authoritative fact.

## Open Decisions

- Exact runtime validation library.
- Whether tool calls are executed synchronously or queued.
- UI copy and notification behavior for each tool.
- Audit log storage and retention.
