const { EVENT_TYPES, DECISION_TYPES, TOOL_NAMES, PRIVACY_SCOPES } = require("./constants");

function validateNormalizedEvent(event) {
  requireObject(event, "event");
  requireString(event.event_id, "event.event_id");
  requireString(event.workshop_id, "event.workshop_id");
  requireString(event.source, "event.source");
  requireOneOf(event.type, EVENT_TYPES, "event.type");
  requireString(event.occurred_at, "event.occurred_at");
  requireString(event.received_at, "event.received_at");
  requireOneOf(event.privacy_scope, PRIVACY_SCOPES, "event.privacy_scope");
  requireObject(event.payload, "event.payload");

  if (event.actor) {
    requireObject(event.actor, "event.actor");
    requireOneOf(event.actor.actor_type, ["participant", "facilitator", "bud_ai", "system"], "event.actor.actor_type");
  }

  if (event.type === "participant_message" || event.type === "peer_message") {
    requireString(event.payload.message_id, "event.payload.message_id");
    requireString(event.payload.text, "event.payload.text");
  }

  if (event.type === "workshop_state_request") {
    requireString(event.payload.request_id, "event.payload.request_id");
    requireString(event.payload.requester_id, "event.payload.requester_id");
  }

  if (event.type === "participation_observation") {
    requireString(event.payload.participant_id, "event.payload.participant_id");
    requireOneOf(event.payload.observation_type, [
      "low_observable_activity",
      "interaction_interrupted",
      "returned_after_gap",
      "active_contribution"
    ], "event.payload.observation_type");
    if (typeof event.payload.window_seconds !== "number" || event.payload.window_seconds < 0) {
      throw new Error("event.payload.window_seconds must be a non-negative number");
    }
  }

  if (event.type === "comprehension_check_response") {
    requireString(event.payload.checkin_id, "event.payload.checkin_id");
    requireString(event.payload.recap_point_id, "event.payload.recap_point_id");
    requireOneOf(event.payload.response, ["green", "yellow", "red"], "event.payload.response");
  }

  if (event.type === "task_completed") {
    requireString(event.payload.task_id, "event.payload.task_id");
    requireString(event.payload.page_id, "event.payload.page_id");
  }

  return true;
}

function validateAiDecision(decision) {
  requireObject(decision, "decision");
  requireString(decision.decision_id, "decision.decision_id");
  requireString(decision.workshop_id, "decision.workshop_id");
  requireOneOf(decision.surface, ["me", "us", "the_room"], "decision.surface");
  requireOneOf(decision.decision_type, DECISION_TYPES, "decision.decision_type");
  requireArray(decision.trigger_event_ids, "decision.trigger_event_ids");
  requireObject(decision.inference, "decision.inference");
  requireString(decision.inference.statement, "decision.inference.statement");
  requireOneOf(decision.inference.status, ["unknown", "provisional", "supported", "disputed", "revised"], "decision.inference.status");
  validateEvidenceRefs(decision.evidence_refs, "decision.evidence_refs");
  validateConfidence(decision.confidence, "decision.confidence");
  validatePrivacyAssessment(decision.privacy_assessment);
  requireObject(decision.human_authority, "decision.human_authority");
  requireOneOf(decision.human_authority.decision_owner, ["participant", "peer_group", "facilitator", "application"], "decision.human_authority.decision_owner");
  requireArray(decision.proposed_tool_calls, "decision.proposed_tool_calls");
  decision.proposed_tool_calls.forEach(validateToolCall);

  if (decision.privacy_assessment.raw_private_content_included && decision.privacy_assessment.permission_required) {
    if (!decision.privacy_assessment.permission_refs.length) {
      throw new Error("decision includes raw private content without permission refs");
    }
  }

  return true;
}

function validateToolCall(toolCall) {
  requireObject(toolCall, "toolCall");
  requireString(toolCall.tool_call_id, "toolCall.tool_call_id");
  requireOneOf(toolCall.tool_name, TOOL_NAMES, "toolCall.tool_name");
  requireObject(toolCall.arguments, "toolCall.arguments");
  if (toolCall.requires_permission) {
    validateEvidenceRefs(toolCall.permission_refs, "toolCall.permission_refs");
    if (!toolCall.permission_refs.length) {
      throw new Error("permissioned tool call has no permission refs");
    }
  }
  return true;
}

function validateConfidence(confidence, path) {
  requireObject(confidence, path);
  requireOneOf(confidence.level, ["unknown", "low", "medium", "high"], path + ".level");
  requireString(confidence.rationale, path + ".rationale");
  validateEvidenceRefs(confidence.evidence_refs, path + ".evidence_refs");
}

function validatePrivacyAssessment(assessment) {
  requireObject(assessment, "decision.privacy_assessment");
  requireOneOf(assessment.source_scope, PRIVACY_SCOPES, "privacy.source_scope");
  requireOneOf(assessment.proposed_destination_scope, PRIVACY_SCOPES, "privacy.proposed_destination_scope");
  requireBoolean(assessment.raw_private_content_included, "privacy.raw_private_content_included");
  requireBoolean(assessment.permission_required, "privacy.permission_required");
  requireBoolean(assessment.minimum_necessary_projection, "privacy.minimum_necessary_projection");
  validateEvidenceRefs(assessment.permission_refs, "privacy.permission_refs");
}

function validateEvidenceRefs(refs, path) {
  requireArray(refs, path);
  refs.forEach((ref, index) => {
    requireObject(ref, path + "[" + index + "]");
    requireString(ref.event_id, path + "[" + index + "].event_id");
  });
}

function requireObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(path + " must be an object");
  }
}

function requireArray(value, path) {
  if (!Array.isArray(value)) {
    throw new Error(path + " must be an array");
  }
}

function requireString(value, path) {
  if (typeof value !== "string" || !value.length) {
    throw new Error(path + " must be a non-empty string");
  }
}

function requireBoolean(value, path) {
  if (typeof value !== "boolean") {
    throw new Error(path + " must be a boolean");
  }
}

function requireOneOf(value, choices, path) {
  if (choices.indexOf(value) === -1) {
    throw new Error(path + " must be one of: " + choices.join(", "));
  }
}

module.exports = {
  validateNormalizedEvent,
  validateAiDecision,
  validateToolCall
};
