function baseEvent(overrides) {
  return Object.assign({
    event_id: "event-" + Math.random().toString(16).slice(2),
    workshop_id: "workshop-demo",
    source: "manual",
    occurred_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
    privacy_scope: "public_shared",
    language: "en",
    actor: {
      actor_type: "participant",
      participant_id: "learner-1"
    },
    payload: {}
  }, overrides);
}

const demoEvents = [
  baseEvent({
    event_id: "evt-facilitator-prompt-001",
    type: "facilitator_instruction",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      instruction_id: "instruction-001",
      text: "Define success criteria for your prototype: name the user goal, describe what a good outcome looks like, and list the evidence that would prove it worked.",
      target: "room",
      language: "en"
    }
  }),
  baseEvent({
    event_id: "evt-000-adaptive-checkin",
    type: "participation_observation",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "system"
    },
    payload: {
      participant_id: "learner-2",
      observation_type: "low_observable_activity",
      window_seconds: 420,
      observable_counts: {
        messages: 0,
        utterances: 0,
        reactions: 0,
        tool_actions: 0
      },
      context_event_ids: []
    }
  }),
  baseEvent({
    event_id: "evt-000-help-stuck",
    type: "ai_partner_request",
    privacy_scope: "private_participant_ai",
    actor: {
      actor_type: "participant",
      participant_id: "learner-1"
    },
    payload: {
      request_id: "help-stuck-001",
      requested_surface: "me",
      request_type: "help_stuck",
      text: "Help, I'm Stuck",
      target_participant_id: "learner-1",
      context_event_ids: ["evt-facilitator-prompt-001"]
    }
  }),
  baseEvent({
    event_id: "evt-001-private-help",
    type: "participant_message",
    privacy_scope: "private_participant_ai",
    actor: {
      actor_type: "participant",
      participant_id: "learner-1"
    },
    payload: {
      message_id: "msg-001",
      text: "I am confused about what the group means by success criteria.",
      language: "en"
    }
  }),
  baseEvent({
    event_id: "evt-002-meaning-gap",
    type: "peer_message",
    privacy_scope: "group_shared",
    actor: {
      actor_type: "participant",
      participant_id: "learner-2"
    },
    payload: {
      message_id: "msg-002",
      text: "The translation is okay, but that is not what I meant.",
      language: "en",
      group_id: "group-main"
    }
  }),
  baseEvent({
    event_id: "evt-003-room-request",
    type: "workshop_state_request",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      request_id: "state-001",
      requester_id: "facilitator-1",
      requested_view: "facilitator_view"
    }
  }),
  baseEvent({
    event_id: "evt-004-correction",
    type: "participant_correction",
    privacy_scope: "group_shared",
    actor: {
      actor_type: "participant",
      participant_id: "learner-2"
    },
    payload: {
      corrected_event_id: "evt-translation-001",
      correction_type: "translation",
      corrected_text: "I meant timeline, not deadline.",
      explanation: "The translated word changed my meaning."
    }
  }),
  baseEvent({
    event_id: "evt-005-wait",
    type: "participant_message",
    privacy_scope: "group_shared",
    actor: {
      actor_type: "participant",
      participant_id: "learner-1"
    },
    payload: {
      message_id: "msg-005",
      text: "Sounds good.",
      language: "en",
      group_id: "group-main"
    }
  })
];

module.exports = { baseEvent, demoEvents };
