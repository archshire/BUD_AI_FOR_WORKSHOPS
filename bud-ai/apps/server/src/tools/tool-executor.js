const { validateToolCall } = require("../../../../packages/contracts/src/validators");

function executeDecisionTools(decision, state) {
  return decision.proposed_tool_calls.map((toolCall) => executeToolCall(toolCall, decision, state));
}

function executeToolCall(toolCall, decision, state) {
  validateToolCall(toolCall);

  if (violatesPrivateBoundary(decision)) {
    return recordRejected(state, toolCall, "Privacy boundary violation.");
  }

  try {
    if (toolCall.tool_name === "update_participant_state") {
      state.applyParticipantPatch(
        toolCall.arguments.participant_id,
        toolCall.arguments.patch,
        toolCall.arguments.evidence_refs
      );
      return recordSucceeded(state, toolCall, "Participant state updated.");
    }

    if (toolCall.tool_name === "send_private_checkin") {
      if (toolCall.arguments.checkin_type === "adaptive_participation" && diagnosesQuietness(toolCall.arguments.message)) {
        return recordRejected(state, toolCall, "Adaptive check-in attempted to diagnose quietness.");
      }
      state.addMessage({
        message_id: "message-" + toolCall.tool_call_id,
        scope: "private_participant_ai",
        target_id: toolCall.arguments.participant_id,
        text: toolCall.arguments.message,
        created_at: new Date().toISOString()
      });
      if (decision.state_update_proposal) {
        state.applyParticipantPatch(
          toolCall.arguments.participant_id,
          decision.state_update_proposal.patch,
          decision.state_update_proposal.evidence_refs
        );
      }
      return recordSucceeded(state, toolCall, "Private check-in sent.");
    }

    if (toolCall.tool_name === "send_help_stuck_explanation") {
      if (!toolCall.arguments.source_context_refs || !toolCall.arguments.source_context_refs.length) {
        return recordRejected(state, toolCall, "Help, I'm Stuck explanation needs source context refs.");
      }
      if (!evidenceRefsExist(state, toolCall.arguments.source_context_refs)) {
        return recordRejected(state, toolCall, "Help, I'm Stuck explanation references missing source context.");
      }
      state.addMessage({
        message_id: "message-" + toolCall.tool_call_id,
        scope: "private_participant_ai",
        target_id: toolCall.arguments.participant_id,
        text: toolCall.arguments.simplified_explanation + " " + toolCall.arguments.followup_prompt,
        created_at: new Date().toISOString()
      });
      if (decision.state_update_proposal) {
        state.applyParticipantPatch(
          toolCall.arguments.participant_id,
          decision.state_update_proposal.patch,
          decision.state_update_proposal.evidence_refs
        );
      }
      return recordSucceeded(state, toolCall, "Help, I'm Stuck explanation sent.");
    }

    if (toolCall.tool_name === "propose_meaning_interpretation") {
      state.addMessage({
        message_id: "message-" + toolCall.tool_call_id,
        scope: "group_shared",
        target_id: toolCall.arguments.group_id,
        text: toolCall.arguments.proposed_interpretation,
        created_at: new Date().toISOString()
      });
      if (decision.state_update_proposal) {
        state.applyGroupPatch(
          toolCall.arguments.group_id,
          decision.state_update_proposal.patch,
          decision.state_update_proposal.evidence_refs
        );
      }
      return recordSucceeded(state, toolCall, "Meaning interpretation proposed.");
    }

    if (toolCall.tool_name === "create_facilitator_signal") {
      if (toolCall.arguments.privacy_projection.raw_private_content_included) {
        return recordRejected(state, toolCall, "Facilitator signal attempted to include raw private content.");
      }
      state.addFacilitatorSignal({
        signal_id: "signal-" + toolCall.tool_call_id,
        participant_id: toolCall.arguments.participant_id || null,
        type: toolCall.arguments.signal_type,
        summary: toolCall.arguments.summary,
        severity: toolCall.arguments.severity,
        evidence_refs: toolCall.arguments.evidence_refs,
        created_at: new Date().toISOString()
      });
      return recordSucceeded(state, toolCall, "Facilitator signal created.");
    }

    if (toolCall.tool_name === "mark_translation_disputed") {
      state.markEvidenceDisputed(toolCall.arguments.translation_event_id);
      return recordSucceeded(state, toolCall, "Translation evidence marked disputed.");
    }

    return recordRejected(state, toolCall, "Tool is registered but not implemented in this scaffold.");
  } catch (error) {
    return recordFailed(state, toolCall, error.message);
  }
}

function diagnosesQuietness(message) {
  const text = String(message || "").toLowerCase();
  return [
    "you are disengaged",
    "you seem disengaged",
    "you are confused",
    "you seem confused",
    "you are not paying attention",
    "you seem unmotivated",
    "you are unmotivated"
  ].some((phrase) => text.indexOf(phrase) !== -1);
}

function evidenceRefsExist(state, refs) {
  const snapshot = state.getSnapshot();
  const evidence = snapshot.workshop && snapshot.workshop.evidence_index || [];
  return refs.every((ref) => evidence.some((item) => item.event_id === ref.event_id));
}

function violatesPrivateBoundary(decision) {
  const privacy = decision.privacy_assessment;
  return privacy.source_scope === "private_participant_ai" &&
    privacy.proposed_destination_scope !== "private_participant_ai" &&
    privacy.raw_private_content_included &&
    !privacy.permission_refs.length;
}

function recordSucceeded(state, toolCall, summary) {
  return record(state, toolCall, "succeeded", summary);
}

function recordRejected(state, toolCall, summary) {
  return record(state, toolCall, "rejected", summary);
}

function recordFailed(state, toolCall, summary) {
  return record(state, toolCall, "failed", summary);
}

function record(state, toolCall, status, summary) {
  const result = {
    tool_call_id: toolCall.tool_call_id,
    tool_name: toolCall.tool_name,
    status: status,
    result_summary: summary,
    state_change_refs: [],
    created_at: new Date().toISOString()
  };
  state.recordToolResult(result);
  return result;
}

module.exports = { executeDecisionTools, executeToolCall };
