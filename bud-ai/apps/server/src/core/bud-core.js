const { nowIso, evidenceRef, baseDecision } = require("./decision-helpers");
const { resolveHelpStuckContext, buildSimplifiedExplanation } = require("../context/context-resolver");

function decide(input) {
  const event = input.event;

  if (event.type === "participant_correction" || event.type === "translation_disputed") {
    return correctionDecision(event);
  }

  if (event.type === "workshop_state_request") {
    return facilitatorSignalDecision(event);
  }

  if (event.type === "ai_partner_request" && event.payload.request_type === "help_stuck") {
    return helpStuckDecision(input);
  }

  if (event.type === "participation_observation") {
    return participationObservationDecision(input);
  }

  if (event.type === "comprehension_check_response") {
    return comprehensionResponseDecision(event);
  }

  if (event.type === "participant_message" || event.type === "peer_message") {
    return messageDecision(event);
  }

  if (event.type === "utterance_completed") {
    return utteranceDecision(event);
  }

  return waitDecision(event, "The event is useful context, but does not warrant intervention yet.");
}

function messageDecision(event) {
  const text = String(event.payload.text || "").toLowerCase();
  const refs = [evidenceRef(event.event_id)];

  if (event.privacy_scope === "private_participant_ai" && requestsFacilitatorSupport(text)) {
    const participantId = event.actor && event.actor.participant_id;
    return Object.assign(baseDecision(event, "the_room", "CREATE_FACILITATOR_SIGNAL", refs), {
      observation: "A learner explicitly requested facilitator help.",
      interpretation: "The learner has authorized a minimum-necessary notification without sharing the private message text.",
      inference: {
        statement: "Facilitator support was explicitly requested by the learner.",
        status: "supported"
      },
      confidence: {
        level: "high",
        rationale: "The learner directly asked Bud to notify the facilitator.",
        evidence_refs: refs
      },
      privacy_assessment: {
        source_scope: "private_participant_ai",
        proposed_destination_scope: "facilitator_view",
        raw_private_content_included: false,
        permission_required: false,
        permission_refs: [],
        minimum_necessary_projection: true
      },
      human_authority: {
        decision_owner: "facilitator",
        reason: "The learner requested human facilitator support; the facilitator decides how to respond.",
        consequence_level: "low"
      },
      proposed_tool_calls: [{
        tool_call_id: "tool-" + event.event_id + "-facilitator-help",
        tool_name: "create_facilitator_signal",
        arguments: {
          facilitator_id: "facilitator-1",
          participant_id: participantId,
          signal_type: "support_needed",
          summary: "Learner " + participantId + " requested help from the facilitator.",
          severity: "low",
          evidence_refs: refs,
          privacy_projection: {
            raw_private_content_included: false,
            minimum_necessary: true
          }
        },
        requires_permission: false,
        permission_refs: []
      }],
      rationale: "An explicit learner request permits a minimum-necessary facilitator notification while keeping the private message itself private."
    });
  }

  if (event.privacy_scope === "private_participant_ai" && mentionsConfusion(text)) {
    return Object.assign(baseDecision(event, "me", "HELP", refs), {
      observation: "A learner privately expressed possible confusion.",
      interpretation: "The learner may benefit from private support before any room-level escalation.",
      inference: {
        statement: "Private participant support is warranted.",
        status: "provisional"
      },
      confidence: {
        level: "medium",
        rationale: "The message contains direct confusion/help language.",
        evidence_refs: refs
      },
      privacy_assessment: {
        source_scope: "private_participant_ai",
        proposed_destination_scope: "private_participant_ai",
        raw_private_content_included: false,
        permission_required: false,
        permission_refs: [],
        minimum_necessary_projection: true
      },
      human_authority: {
        decision_owner: "participant",
        reason: "The learner owns whether to disclose private context.",
        consequence_level: "low"
      },
      proposed_tool_calls: [{
        tool_call_id: "tool-" + event.event_id + "-private-support",
        tool_name: "send_private_checkin",
        arguments: {
          participant_id: event.actor.participant_id,
          message: "I can help. What part feels unclear right now?",
          reason: "Learner privately indicated possible confusion.",
          evidence_refs: refs
        },
        requires_permission: false,
        permission_refs: []
      }],
      state_update_proposal: {
        target_state: "ParticipantState",
        operation: "append_revision",
        patch: {
          understanding: {
            status: "requested_help",
            topic: "current workshop activity"
          }
        },
        evidence_refs: refs
      },
      rationale: "Keep the support at ME because the evidence is private and can be addressed privately."
    });
  }

  if (mentionsMeaningGap(text)) {
    return Object.assign(baseDecision(event, "us", "PROPOSE_MEANING", refs), {
      observation: "A group message suggests a possible shared-meaning gap.",
      interpretation: "Literal translation may not be enough; peers should confirm intended meaning.",
      inference: {
        statement: "US-level meaning repair is useful.",
        status: "provisional"
      },
      confidence: {
        level: "medium",
        rationale: "The message explicitly references meaning, translation, or misunderstanding.",
        evidence_refs: refs
      },
      privacy_assessment: {
        source_scope: event.privacy_scope,
        proposed_destination_scope: "group_shared",
        raw_private_content_included: false,
        permission_required: false,
        permission_refs: [],
        minimum_necessary_projection: true
      },
      human_authority: {
        decision_owner: "peer_group",
        reason: "Peers own whether the proposed interpretation matches intended meaning.",
        consequence_level: "medium"
      },
      proposed_tool_calls: [{
        tool_call_id: "tool-" + event.event_id + "-meaning",
        tool_name: "propose_meaning_interpretation",
        arguments: {
          group_id: event.payload.group_id || "group-main",
          utterance_event_id: event.event_id,
          original_text: event.payload.text,
          proposed_interpretation: "Bud thinks there may be a mismatch in intended meaning. Can the group confirm what was meant?",
          confidence: {
            level: "medium",
            rationale: "Meaning gap language was observed.",
            evidence_refs: refs
          },
          evidence_refs: refs
        },
        requires_permission: false,
        permission_refs: []
      }],
      state_update_proposal: {
        target_state: "GroupState",
        operation: "append_revision",
        patch: {
          shared_meaning: {
            status: "possible_gap",
            topic: "current discussion"
          }
        },
        evidence_refs: refs
      },
      rationale: "Use US because the repair belongs to shared group meaning."
    });
  }

  return waitDecision(event, "The message does not provide enough evidence for a meaningful intervention.");
}

function requestsFacilitatorSupport(text) {
  return [
    "tell the facilitator",
    "notify the facilitator",
    "contact the facilitator",
    "ask the facilitator",
    "teacher that i need help",
    "teacher i need help",
    "facilitator that i need help"
  ].some(function (phrase) { return text.indexOf(phrase) !== -1; });
}

function helpStuckDecision(input) {
  const event = input.event;
  const context = resolveHelpStuckContext(input.state, event);
  const refs = [evidenceRef(event.event_id)].concat(context.refs);
  const participantId = event.payload.target_participant_id || event.actor.participant_id;

  if (!context.items.length) {
    return Object.assign(baseDecision(event, "me", "ASK_CLARIFY", [evidenceRef(event.event_id)]), {
      observation: "A learner activated Help, I'm Stuck, but no permitted workshop context was available.",
      interpretation: "Bud should not invent a lesson explanation without source context.",
      inference: {
        statement: "Private clarification is needed before grounded help can be given.",
        status: "unknown"
      },
      confidence: {
        level: "low",
        rationale: "The request is explicit, but source context could not be resolved.",
        evidence_refs: [evidenceRef(event.event_id)]
      },
      privacy_assessment: {
        source_scope: "private_participant_ai",
        proposed_destination_scope: "private_participant_ai",
        raw_private_content_included: false,
        permission_required: false,
        permission_refs: [],
        minimum_necessary_projection: true
      },
      human_authority: {
        decision_owner: "participant",
        reason: "The learner owns whether to clarify what they need help with.",
        consequence_level: "low"
      },
      proposed_tool_calls: [{
        tool_call_id: "tool-" + event.event_id + "-help-stuck-clarify",
        tool_name: "send_private_checkin",
        arguments: {
          participant_id: participantId,
          message: "I can help, but I need the current prompt or the part that feels unclear. What should I explain?",
          reason: "Help, I'm Stuck was requested without resolvable workshop context.",
          evidence_refs: [evidenceRef(event.event_id)],
          checkin_type: "confusion_support"
        },
        requires_permission: false,
        permission_refs: []
      }],
      state_update_proposal: {
        target_state: "ParticipantState",
        operation: "append_revision",
        patch: {
          understanding: {
            status: "requested_help",
            topic: "Help, I'm Stuck"
          },
          support_context: {
            last_help_stuck_at: nowIso()
          }
        },
        evidence_refs: [evidenceRef(event.event_id)]
      },
      rationale: "Bud must ask privately instead of fabricating a grounded explanation when context retrieval fails."
    });
  }

  return Object.assign(baseDecision(event, "me", "HELP", refs), {
    observation: "A learner activated Help, I'm Stuck.",
    interpretation: "The learner wants a simplified explanation grounded in the current workshop context.",
    inference: {
      statement: "Private grounded support is warranted.",
      status: "supported"
    },
    confidence: {
      level: context.status === "resolved" ? "medium" : "low",
      rationale: context.status === "resolved"
        ? "The request includes resolved workshop context references."
        : "Bud found recent permitted workshop context, but the request did not resolve explicit context references.",
      evidence_refs: refs
    },
    privacy_assessment: {
      source_scope: "private_participant_ai",
      proposed_destination_scope: "private_participant_ai",
      raw_private_content_included: false,
      permission_required: false,
      permission_refs: [],
      minimum_necessary_projection: true
    },
    human_authority: {
      decision_owner: "participant",
      reason: "The learner owns the private help request and whether to disclose confusion.",
      consequence_level: "low"
    },
    proposed_tool_calls: [{
      tool_call_id: "tool-" + event.event_id + "-help-stuck",
      tool_name: "send_help_stuck_explanation",
      arguments: {
        participant_id: participantId,
        simplified_explanation: buildSimplifiedExplanation(context.items),
        source_context_refs: context.refs,
        uncertainty_note: "I am using the available workshop context. Tell me which part still feels unclear.",
        followup_prompt: "Which part should we unpack next?"
      },
      requires_permission: false,
      permission_refs: []
    }],
    state_update_proposal: {
      target_state: "ParticipantState",
      operation: "append_revision",
      patch: {
        understanding: {
          status: "requested_help",
          topic: "Help, I'm Stuck"
        },
        support_context: {
          last_help_stuck_at: nowIso()
        }
      },
      evidence_refs: refs
    },
    rationale: "Help, I'm Stuck belongs to ME because it gives private, grounded support without exposing confusion to the facilitator."
  });
}

function participationObservationDecision(input) {
  const event = input.event;
  const participantId = event.payload.participant_id || (event.actor && event.actor.participant_id);
  const refs = [evidenceRef(event.event_id)].concat((event.payload.context_event_ids || []).map(evidenceRef));

  if (event.payload.observation_type !== "low_observable_activity") {
    return waitDecision(event, "Participation observation recorded; no adaptive check-in is warranted.");
  }

  if (!participantId) {
    return waitDecision(event, "Participation observation lacks a participant target.");
  }

  if (recentAdaptiveCheckin(input.state, participantId, event.occurred_at)) {
    return waitDecision(event, "A recent adaptive check-in already gave this participant space.");
  }

  return Object.assign(baseDecision(event, "me", "HELP", refs), {
    observation: "A participant has low observable activity over the current workshop window.",
    interpretation: "The participant may be listening, processing, interrupted, or may want a low-pressure way to engage.",
    inference: {
      statement: "A private optional check-in is appropriate without diagnosing the participant.",
      status: "provisional"
    },
    confidence: {
      level: "low",
      rationale: "Low observable activity is enough for an invitation, but not enough to infer confusion or disengagement.",
      evidence_refs: refs
    },
    privacy_assessment: {
      source_scope: event.privacy_scope,
      proposed_destination_scope: "private_participant_ai",
      raw_private_content_included: false,
      permission_required: false,
      permission_refs: [],
      minimum_necessary_projection: true
    },
    human_authority: {
      decision_owner: "participant",
      reason: "The participant owns whether to respond, keep listening, ask for clarification, or contribute.",
      consequence_level: "low"
    },
    proposed_tool_calls: [{
      tool_call_id: "tool-" + event.event_id + "-adaptive-checkin",
      tool_name: "send_private_checkin",
      arguments: {
        participant_id: participantId,
        message: "Want a quiet way to check in? You can ask a question, request clarification, keep listening, or share something with the group.",
        reason: "Observable participation has been low during this workshop window; this is an optional invitation, not a diagnosis.",
        evidence_refs: refs,
        checkin_type: "adaptive_participation"
      },
      requires_permission: false,
      permission_refs: []
    }],
    state_update_proposal: {
      target_state: "ParticipantState",
      operation: "append_revision",
      patch: {
        participation: {
          status: "quiet",
          evidence_refs: refs,
          confidence: {
            level: "low",
            rationale: "Only low observable activity was observed.",
            evidence_refs: refs
          }
        },
        support_context: {
          last_adaptive_checkin_at: event.occurred_at || nowIso()
        }
      },
      evidence_refs: refs
    },
    rationale: "Adaptive check-in belongs to ME because it preserves agency and privacy while offering support at the smallest appropriate scope."
  });
}

function recentAdaptiveCheckin(state, participantId, occurredAt) {
  if (!state || !state.participants || !state.participants[participantId]) {
    return false;
  }
  const last = state.participants[participantId].support_context.last_adaptive_checkin_at;
  if (!last) {
    return false;
  }
  const lastMs = Date.parse(last);
  const currentMs = Date.parse(occurredAt || nowIso());
  if (isNaN(lastMs) || isNaN(currentMs)) {
    return false;
  }
  return currentMs - lastMs < 10 * 60 * 1000;
}

function utteranceDecision(event) {
  const refs = [evidenceRef(event.event_id)];
  const original = String(event.payload.original_text || "");
  if (original.trim().length < 8) {
    return waitDecision(event, "The utterance is too short for a reliable interpretation.");
  }
  return waitDecision(event, "The utterance is recorded as evidence; translation/reasoning can occur when meaning warrants it.");
}

function correctionDecision(event) {
  const refs = [evidenceRef(event.event_id)];
  return Object.assign(baseDecision(event, "me", "ASK_CLARIFY", refs), {
    observation: "A participant disputed or corrected a prior transformation.",
    interpretation: "Dependent inferences should be reopened or downgraded.",
    inference: {
      statement: "Prior translation or interpretation may be unreliable.",
      status: "disputed"
    },
    confidence: {
      level: "high",
      rationale: "A human correction is direct evidence that the earlier representation may be wrong.",
      evidence_refs: refs
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
      decision_owner: "participant",
      reason: "The participant owns correction of their own meaning.",
      consequence_level: "medium"
    },
    proposed_tool_calls: [{
      tool_call_id: "tool-" + event.event_id + "-disputed",
      tool_name: "mark_translation_disputed",
      arguments: {
        translation_event_id: event.payload.corrected_event_id || event.payload.translation_event_id,
        disputed_by_participant_id: event.actor.participant_id,
        explanation: event.payload.explanation,
        evidence_refs: refs
      },
      requires_permission: false,
      permission_refs: []
    }],
    rationale: "Corrections must revise evidence rather than being treated as ordinary chatter."
  });
}

function facilitatorSignalDecision(event) {
  const refs = [evidenceRef(event.event_id)];
  return Object.assign(baseDecision(event, "the_room", "CREATE_FACILITATOR_SIGNAL", refs), {
    observation: "A facilitator requested workshop state.",
    interpretation: "A privacy-aware room summary is appropriate.",
    inference: {
      statement: "FacilitatorViewState can be projected without raw private content.",
      status: "supported"
    },
    confidence: {
      level: "medium",
      rationale: "The request is explicit, but available state may still be partial.",
      evidence_refs: refs
    },
    privacy_assessment: {
      source_scope: "public_shared",
      proposed_destination_scope: "facilitator_view",
      raw_private_content_included: false,
      permission_required: false,
      permission_refs: [],
      minimum_necessary_projection: true
    },
    human_authority: {
      decision_owner: "facilitator",
      reason: "Facilitator owns consequential workshop decisions.",
      consequence_level: "medium"
    },
    proposed_tool_calls: [{
      tool_call_id: "tool-" + event.event_id + "-signal",
      tool_name: "create_facilitator_signal",
      arguments: {
        facilitator_id: event.actor.participant_id,
        signal_type: "meaning_gap",
        summary: "Bud can summarize operational patterns without exposing raw private learner content.",
        severity: "low",
        evidence_refs: refs,
        privacy_projection: {
          raw_private_content_included: false,
          minimum_necessary: true
        }
      },
      requires_permission: false,
      permission_refs: []
    }],
    rationale: "Use THE ROOM because this is facilitator-facing operational awareness."
  });
}

function comprehensionResponseDecision(event) {
  const response = event.payload.response;
  const participantId = event.actor && event.actor.participant_id;
  const refs = [evidenceRef(event.event_id)];
  const patch = {
    comprehension: {
      status: response,
      checkin_id: event.payload.checkin_id,
      recap_point_id: event.payload.recap_point_id,
      evidence_refs: refs,
      reported_at: event.occurred_at
    }
  };
  const followup = response === "yellow"
    ? "Which part of this recap point feels partly unclear?"
    : response === "red"
      ? "I can explain this again privately. If that still does not help, you can choose to ask the facilitator in workshop chat."
      : null;
  const toolCalls = [{
    tool_call_id: "tool-" + event.event_id + "-record-comprehension",
    tool_name: "update_participant_state",
    arguments: { participant_id: participantId, patch: patch, evidence_refs: refs, confidence: { level: "medium", rationale: "The participant explicitly reported this comprehension response.", evidence_refs: refs } },
    requires_permission: false,
    permission_refs: []
  }];
  if (followup) {
    toolCalls.push({
      tool_call_id: "tool-" + event.event_id + "-comprehension-followup",
      tool_name: "send_private_checkin",
      arguments: { participant_id: participantId, message: followup, reason: "Participant-reported comprehension response.", evidence_refs: refs, checkin_type: "comprehension_followup" },
      requires_permission: false,
      permission_refs: []
    });
  }
  return Object.assign(baseDecision(event, "me", response === "green" ? "NO_ACTION" : response === "yellow" ? "ASK_CLARIFY" : "HELP", refs), {
    observation: "A participant explicitly reported a comprehension response.",
    interpretation: "The response is room-sensing evidence, not verified understanding.",
    inference: { statement: "The participant reported " + response + ".", status: "supported" },
    confidence: { level: "medium", rationale: "The response is direct participant-provided evidence.", evidence_refs: refs },
    privacy_assessment: { source_scope: "private_participant_ai", proposed_destination_scope: "private_participant_ai", raw_private_content_included: false, permission_required: false, permission_refs: [], minimum_necessary_projection: true },
    human_authority: { decision_owner: "participant", reason: "Participants own their comprehension report and any escalation choice.", consequence_level: "low" },
    proposed_tool_calls: toolCalls,
    state_update_proposal: { target_state: "ParticipantState", operation: "append_revision", patch: patch, evidence_refs: refs },
    rationale: "Record explicit room-sensing evidence without treating silence or self-report as a diagnosis."
  });
}

function waitDecision(event, reason) {
  const refs = [evidenceRef(event.event_id)];
  return Object.assign(baseDecision(event, "me", "WAIT", refs), {
    observation: "Bud observed an event.",
    interpretation: reason,
    inference: {
      statement: "No intervention is warranted yet.",
      status: "unknown"
    },
    confidence: {
      level: "low",
      rationale: "Evidence is insufficient for a bounded action.",
      evidence_refs: refs
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
      reason: "The application should simply continue observing.",
      consequence_level: "low"
    },
    proposed_tool_calls: [],
    rationale: reason
  });
}

function mentionsConfusion(text) {
  return text.indexOf("confused") >= 0 || text.indexOf("lost") >= 0 || text.indexOf("help") >= 0 || text.indexOf("unclear") >= 0;
}

function mentionsMeaningGap(text) {
  return text.indexOf("translation") >= 0 || text.indexOf("meaning") >= 0 || text.indexOf("misunderstood") >= 0 || text.indexOf("not what i meant") >= 0;
}

module.exports = { decide };
