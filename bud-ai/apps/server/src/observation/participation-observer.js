const DEFAULT_WINDOW_SECONDS = 10 * 60;
const DEFAULT_COOLDOWN_SECONDS = 10 * 60;

function generateParticipationObservations(state, options) {
  const config = Object.assign({
    now: new Date().toISOString(),
    window_seconds: DEFAULT_WINDOW_SECONDS,
    cooldown_seconds: DEFAULT_COOLDOWN_SECONDS
  }, options || {});

  if (!state || !state.workshop || !Array.isArray(state.workshop.participant_ids)) {
    return [];
  }

  const nowMs = Date.parse(config.now);
  if (isNaN(nowMs)) {
    throw new Error("participation observer requires a valid ISO timestamp");
  }

  const windowStartMs = nowMs - config.window_seconds * 1000;
  const evidence = Array.isArray(state.workshop.evidence_index)
    ? state.workshop.evidence_index
    : [];
  const windowEvidence = evidence.filter(function (item) {
    const createdMs = Date.parse(item.created_at);
    return !isNaN(createdMs) && createdMs >= windowStartMs && createdMs <= nowMs;
  });
  const sharedContext = windowEvidence.filter(isSharedWorkshopActivity);

  if (!sharedContext.length) {
    return [];
  }

  return state.workshop.participant_ids
    .filter(function (participantId) {
      return participantId && participantId.indexOf("facilitator") !== 0;
    })
    .filter(function (participantId) {
      return !recentAdaptiveCheckin(state, participantId, nowMs, config.cooldown_seconds);
    })
    .filter(function (participantId) {
      return !recentLowActivityObservation(windowEvidence, participantId);
    })
    .map(function (participantId) {
      return {
        participantId: participantId,
        counts: observableCounts(windowEvidence, participantId)
      };
    })
    .filter(function (summary) {
      return totalObservableActivity(summary.counts) === 0;
    })
    .map(function (summary) {
      return participationObservationEvent(state, summary.participantId, summary.counts, sharedContext, config);
    });
}

function participationObservationEvent(state, participantId, counts, sharedContext, config) {
  const suffix = String(config.now).replace(/[^0-9A-Za-z]/g, "");
  return {
    event_id: "obs-low-activity-" + participantId + "-" + suffix,
    workshop_id: state.workshop.workshop_id,
    source: "bud_ai",
    type: "participation_observation",
    occurred_at: config.now,
    received_at: config.now,
    privacy_scope: "public_shared",
    language: state.workshop.default_language || "en",
    actor: {
      actor_type: "system"
    },
    payload: {
      participant_id: participantId,
      observation_type: "low_observable_activity",
      window_seconds: config.window_seconds,
      observable_counts: counts,
      context_event_ids: sharedContext.map(function (item) {
        return item.event_id;
      }).filter(Boolean).slice(-8)
    }
  };
}

function observableCounts(windowEvidence, participantId) {
  return windowEvidence.reduce(function (counts, item) {
    if (item.participant_id !== participantId) {
      return counts;
    }
    if (item.event_type === "participant_message" || item.event_type === "peer_message") {
      counts.messages += 1;
    } else if (item.event_type === "participant_utterance" || item.event_type === "utterance_completed") {
      counts.utterances += 1;
    } else if (item.event_type === "participant_reaction") {
      counts.reactions += 1;
    } else if (item.event_type === "ai_partner_request" || item.event_type === "tool_result") {
      counts.tool_actions += 1;
    }
    return counts;
  }, {
    messages: 0,
    utterances: 0,
    reactions: 0,
    tool_actions: 0
  });
}

function isSharedWorkshopActivity(item) {
  if (item.scope === "private_participant_ai") {
    return false;
  }
  return item.event_type === "facilitator_instruction"
    || item.event_type === "participant_message"
    || item.event_type === "peer_message"
    || item.event_type === "participant_utterance"
    || item.event_type === "utterance_completed"
    || item.event_type === "translation_completed";
}

function recentAdaptiveCheckin(state, participantId, nowMs, cooldownSeconds) {
  const participant = state.participants && state.participants[participantId];
  const last = participant
    && participant.support_context
    && participant.support_context.last_adaptive_checkin_at;
  if (!last) {
    return false;
  }
  const lastMs = Date.parse(last);
  return !isNaN(lastMs) && nowMs - lastMs < cooldownSeconds * 1000;
}

function recentLowActivityObservation(windowEvidence, participantId) {
  return windowEvidence.some(function (item) {
    return item.participant_id === participantId
      && item.event_type === "participation_observation";
  });
}

function totalObservableActivity(counts) {
  return counts.messages + counts.utterances + counts.reactions + counts.tool_actions;
}

module.exports = {
  generateParticipationObservations
};
