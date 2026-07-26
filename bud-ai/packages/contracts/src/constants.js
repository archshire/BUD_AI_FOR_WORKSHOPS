const EVENT_TYPES = [
  "workshop_created",
  "workshop_started",
  "workshop_paused",
  "workshop_ended",
  "participant_joined",
  "participant_left",
  "participant_utterance",
  "participant_message",
  "facilitator_instruction",
  "peer_message",
  "utterance_completed",
  "translation_completed",
  "translation_disputed",
  "participant_correction",
  "participation_observation",
  "comprehension_check_response",
  "task_completed",
  "ai_partner_request",
  "permission_request",
  "permission_response",
  "workshop_state_request",
  "tool_result",
  "system_error"
];

const DECISION_TYPES = [
  "WAIT",
  "NO_ACTION",
  "ASK_CLARIFY",
  "HELP",
  "PROPOSE_MEANING",
  "REQUEST_PEER_CONFIRMATION",
  "CREATE_FACILITATOR_SIGNAL",
  "RECOMMEND",
  "ESCALATE",
  "REQUEST_PRIVATE_ACCESS"
];

const TOOL_NAMES = [
  "update_participant_state",
  "send_private_checkin",
  "send_help_stuck_explanation",
  "send_support_message",
  "propose_meaning_interpretation",
  "request_peer_confirmation",
  "create_facilitator_signal",
  "recommend_facilitator_action",
  "request_private_access",
  "mark_translation_disputed"
];

const PRIVACY_SCOPES = [
  "public_shared",
  "group_shared",
  "private_participant_ai",
  "facilitator_view"
];

module.exports = {
  EVENT_TYPES,
  DECISION_TYPES,
  TOOL_NAMES,
  PRIVACY_SCOPES
};
