function createInMemoryStateStore(initialState) {
  const state = initialState || {
    workshop: {
      workshop_id: "workshop-demo",
      title: "Bud AI Demo Workshop",
      phase: "active",
      supported_languages: ["en", "es", "zh", "my", "fr", "th"],
      default_language: "en",
      facilitator_ids: ["facilitator-1"],
      participant_ids: ["learner-1", "learner-2"],
      group_ids: ["group-main"],
      room_patterns: [],
      facilitator_signals: [],
      evidence_index: [],
      permissions: [],
      updated_at: new Date().toISOString()
    },
    participants: {},
    groups: {
      "group-main": {
        group_id: "group-main",
        participant_ids: ["learner-1", "learner-2"],
        shared_meaning: {
          status: "unknown",
          evidence_refs: [],
          confidence: {
            level: "unknown",
            rationale: "No group evidence yet.",
            evidence_refs: []
          }
        },
        meaning_gaps: [],
        pending_confirmations: [],
        revision_history: [],
        updated_at: new Date().toISOString()
      }
    },
    messages: [],
    tool_results: []
  };

  function recordEvent(event) {
    state.workshop.evidence_index.push({
      evidence_id: "evidence-" + event.event_id,
      event_id: event.event_id,
      event_type: event.type,
      participant_id: participantIdForEvidence(event),
      scope: event.privacy_scope,
      kind: evidenceKindForEvent(event),
      language: event.language,
      text: event.payload.text || event.payload.original_text || event.payload.transcript_fragment,
      status: "current",
      created_at: event.occurred_at
    });
    state.workshop.updated_at = new Date().toISOString();
  }

  function applyParticipantPatch(participantId, patch, evidenceRefs) {
    if (!state.participants[participantId]) {
      state.participants[participantId] = defaultParticipant(participantId);
    }
    state.participants[participantId].revision_history.push({
      revision_id: "revision-" + Date.now(),
      reason: "Bud tool update",
      patch: patch,
      evidence_refs: evidenceRefs,
      created_at: new Date().toISOString()
    });
    if (patch.understanding) {
      state.participants[participantId].understanding = Object.assign(
        state.participants[participantId].understanding,
        patch.understanding
      );
    }
    if (patch.participation) {
      state.participants[participantId].participation = Object.assign(
        state.participants[participantId].participation,
        patch.participation
      );
    }
    if (patch.support_context) {
      state.participants[participantId].support_context = Object.assign(
        state.participants[participantId].support_context,
        patch.support_context
      );
    }
    if (patch.comprehension) {
      state.participants[participantId].comprehension = Object.assign(
        state.participants[participantId].comprehension,
        patch.comprehension
      );
    }
    state.participants[participantId].updated_at = new Date().toISOString();
  }

  function applyGroupPatch(groupId, patch, evidenceRefs) {
    if (!state.groups[groupId]) {
      state.groups[groupId] = defaultGroup(groupId);
    }
    state.groups[groupId].revision_history.push({
      revision_id: "revision-" + Date.now(),
      reason: "Bud tool update",
      patch: patch,
      evidence_refs: evidenceRefs,
      created_at: new Date().toISOString()
    });
    if (patch.shared_meaning) {
      state.groups[groupId].shared_meaning = Object.assign(
        state.groups[groupId].shared_meaning,
        patch.shared_meaning
      );
    }
    state.groups[groupId].updated_at = new Date().toISOString();
  }

  function addMessage(message) {
    state.messages.push(message);
  }

  function addSharedMessage(message) {
    state.messages.push(Object.assign({}, message, { scope: "group_shared" }));
  }

  function addFacilitatorSignal(signal) {
    state.workshop.facilitator_signals.push(signal);
    state.workshop.updated_at = new Date().toISOString();
  }

  function markEvidenceDisputed(eventId) {
    state.workshop.evidence_index = state.workshop.evidence_index.map((item) => {
      if (item.event_id === eventId) {
        return Object.assign({}, item, { status: "disputed" });
      }
      return item;
    });
  }

  function recordToolResult(result) {
    state.tool_results.push(result);
  }

  function getSnapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  return {
    recordEvent,
    applyParticipantPatch,
    applyGroupPatch,
    addMessage,
    addSharedMessage,
    addFacilitatorSignal,
    markEvidenceDisputed,
    recordToolResult,
    getSnapshot
  };
}

function defaultParticipant(participantId) {
  return {
    participant_id: participantId,
    display_name: participantId,
    role: participantId.indexOf("facilitator") === 0 ? "facilitator" : "learner",
    preferred_language: "en",
    working_languages: ["en"],
    participation: {
      status: "present",
      evidence_refs: [],
      confidence: {
        level: "low",
        rationale: "Created from observed event.",
        evidence_refs: []
      }
    },
    understanding: {
      status: "unknown",
      evidence_refs: [],
      confidence: {
        level: "unknown",
        rationale: "No understanding evidence yet.",
        evidence_refs: []
      }
    },
    comprehension: {
      status: "unknown",
      evidence_refs: []
    },
    support_context: {
      open_support_requests: []
    },
    privacy_context: {
      default_scope: "private_participant_ai",
      private_raw_share_allowed: false,
      operational_projection_allowed: true,
      permission_refs: []
    },
    revision_history: [],
    updated_at: new Date().toISOString()
  };
}

function defaultGroup(groupId) {
  return {
    group_id: groupId,
    participant_ids: [],
    shared_meaning: {
      status: "unknown",
      evidence_refs: [],
      confidence: {
        level: "unknown",
        rationale: "No shared meaning evidence yet.",
        evidence_refs: []
      }
    },
    meaning_gaps: [],
    pending_confirmations: [],
    revision_history: [],
    updated_at: new Date().toISOString()
  };
}

function evidenceKindForEvent(event) {
  if (event.type === "facilitator_instruction") return "instruction";
  if (event.type === "translation_completed") return "translation";
  if (event.type === "participant_correction") return "correction";
  if (event.type === "participant_utterance") return "transcript";
  if (event.type === "participation_observation") return "participation";
  if (event.type === "permission_response") return "permission";
  return "original_text";
}

function participantIdForEvidence(event) {
  if (event.type === "participation_observation" && event.payload.participant_id) {
    return event.payload.participant_id;
  }
  return event.actor && event.actor.participant_id;
}

module.exports = { createInMemoryStateStore };
