function nowIso() {
  return new Date().toISOString();
}

function evidenceRef(eventId) {
  return { event_id: eventId };
}

function baseDecision(event, surface, decisionType, evidenceRefs) {
  return {
    decision_id: "decision-" + event.event_id,
    workshop_id: event.workshop_id,
    created_at: nowIso(),
    surface: surface,
    decision_type: decisionType,
    trigger_event_ids: [event.event_id],
    observation: "",
    interpretation: "",
    inference: {
      statement: "",
      status: "unknown"
    },
    evidence_refs: evidenceRefs || [],
    confidence: {
      level: "unknown",
      rationale: "",
      evidence_refs: evidenceRefs || []
    },
    privacy_assessment: {
      source_scope: event.privacy_scope,
      proposed_destination_scope: event.privacy_scope,
      raw_private_content_included: false,
      permission_required: false,
      permission_refs: [],
      minimum_necessary_projection: true
    },
    human_authority: {
      decision_owner: "application",
      reason: "",
      consequence_level: "low"
    },
    proposed_tool_calls: [],
    rationale: ""
  };
}

module.exports = { nowIso, evidenceRef, baseDecision };

