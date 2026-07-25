const assert = require("assert");
const { createBudRuntime } = require("../apps/server/src/runtime");
const { createInMemoryStateStore } = require("../apps/server/src/state/in-memory-state-store");
const { executeDecisionTools } = require("../apps/server/src/tools/tool-executor");
const { createServer } = require("../apps/server/src/index");
const { baseEvent } = require("../packages/test-fixtures/src/demo-events");
const { validateAiDecision } = require("../packages/contracts/src/validators");

function run() {
  testPrivateHelp();
  testHelpStuck();
  testHelpStuckMissingContextAsksClarify();
  testAdaptiveCheckin();
  testAdaptiveCheckinCooldown();
  testAdaptiveCheckinDiagnosisRejected();
  testParticipationObserverGeneratesQuietCheckin();
  testParticipationObserverSkipsActiveParticipant();
  testParticipationObserverSkipsEmptyRoom();
  testMeaningRepair();
  testFacilitatorProjection();
  testCorrection();
  testWait();
  testPrivacyViolationRejectedByValidatorShape();
  testLearnerServerApi(function () {
    console.log("All Bud AI scaffold tests passed.");
  });
}

function testPrivateHelp() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-private-help",
    type: "participant_message",
    privacy_scope: "private_participant_ai",
    payload: {
      message_id: "msg-private",
      text: "I am lost and need help.",
      language: "en"
    }
  }));

  assert.equal(result.decision.decision_type, "HELP");
  assert.equal(result.decision.surface, "me");
  assert.equal(result.toolResults[0].status, "succeeded");
  assert.equal(runtime.getStateSnapshot().messages[0].scope, "private_participant_ai");
}

function testHelpStuck() {
  const runtime = createBudRuntime();
  runtime.handleEvent(baseEvent({
    event_id: "facilitator-context-1",
    type: "facilitator_instruction",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      instruction_id: "instruction-test",
      text: "Define success criteria by naming the user goal, the expected outcome, and the evidence that proves the prototype worked.",
      target: "room",
      language: "en"
    }
  }));
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-help-stuck",
    type: "ai_partner_request",
    privacy_scope: "private_participant_ai",
    payload: {
      request_id: "request-help-stuck",
      requested_surface: "me",
      request_type: "help_stuck",
      text: "Help, I'm Stuck",
      target_participant_id: "learner-1",
      context_event_ids: ["facilitator-context-1"]
    }
  }));

  assert.equal(result.decision.decision_type, "HELP");
  assert.equal(result.decision.surface, "me");
  assert.equal(result.decision.proposed_tool_calls[0].tool_name, "send_help_stuck_explanation");
  assert.equal(result.decision.proposed_tool_calls[0].arguments.simplified_explanation.indexOf("Define success criteria") !== -1, true);
  assert.equal(result.toolResults[0].status, "succeeded");
  assert.equal(runtime.getStateSnapshot().messages[0].scope, "private_participant_ai");
  assert.equal(runtime.getStateSnapshot().messages[0].text.indexOf("Define success criteria") !== -1, true);
  assert.equal(runtime.getStateSnapshot().participants["learner-1"].support_context.last_help_stuck_at.length > 0, true);
}

function testHelpStuckMissingContextAsksClarify() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-help-stuck-missing-context",
    type: "ai_partner_request",
    privacy_scope: "private_participant_ai",
    payload: {
      request_id: "request-help-stuck-missing",
      requested_surface: "me",
      request_type: "help_stuck",
      text: "Help, I'm Stuck",
      target_participant_id: "learner-1",
      context_event_ids: ["missing-context"]
    }
  }));

  assert.equal(result.decision.decision_type, "ASK_CLARIFY");
  assert.equal(result.decision.proposed_tool_calls[0].tool_name, "send_private_checkin");
  assert.equal(result.toolResults[0].status, "succeeded");
  assert.equal(runtime.getStateSnapshot().messages[0].text.indexOf("What should I explain?") !== -1, true);
}

function testAdaptiveCheckin() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-adaptive-checkin",
    type: "participation_observation",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "system"
    },
    payload: {
      participant_id: "learner-2",
      observation_type: "low_observable_activity",
      window_seconds: 600,
      observable_counts: {
        messages: 0,
        utterances: 0,
        reactions: 0,
        tool_actions: 0
      },
      context_event_ids: []
    }
  }));

  assert.equal(result.decision.decision_type, "HELP");
  assert.equal(result.decision.surface, "me");
  assert.equal(result.decision.proposed_tool_calls[0].tool_name, "send_private_checkin");
  assert.equal(result.decision.proposed_tool_calls[0].arguments.checkin_type, "adaptive_participation");
  assert.equal(result.toolResults[0].status, "succeeded");
  assert.equal(runtime.getStateSnapshot().messages[0].scope, "private_participant_ai");
  assert.equal(runtime.getStateSnapshot().participants["learner-2"].participation.status, "quiet");
}

function testAdaptiveCheckinCooldown() {
  const runtime = createBudRuntime();
  runtime.handleEvent(baseEvent({
    event_id: "test-adaptive-cooldown-1",
    type: "participation_observation",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "system"
    },
    occurred_at: "2026-07-25T10:00:00.000Z",
    payload: {
      participant_id: "learner-2",
      observation_type: "low_observable_activity",
      window_seconds: 600,
      context_event_ids: []
    }
  }));
  const second = runtime.handleEvent(baseEvent({
    event_id: "test-adaptive-cooldown-2",
    type: "participation_observation",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "system"
    },
    occurred_at: "2026-07-25T10:05:00.000Z",
    payload: {
      participant_id: "learner-2",
      observation_type: "low_observable_activity",
      window_seconds: 600,
      context_event_ids: []
    }
  }));

  assert.equal(second.decision.decision_type, "WAIT");
  assert.equal(second.toolResults.length, 0);
}

function testAdaptiveCheckinDiagnosisRejected() {
  const state = createInMemoryStateStore();
  const decision = {
    privacy_assessment: {
      source_scope: "public_shared",
      proposed_destination_scope: "private_participant_ai",
      raw_private_content_included: false,
      permission_required: false,
      permission_refs: [],
      minimum_necessary_projection: true
    },
    proposed_tool_calls: [{
      tool_call_id: "tool-bad-adaptive",
      tool_name: "send_private_checkin",
      arguments: {
        participant_id: "learner-2",
        message: "You seem disengaged. Please participate.",
        reason: "Bad diagnostic prompt.",
        evidence_refs: [{ event_id: "evt-low-activity" }],
        checkin_type: "adaptive_participation"
      },
      requires_permission: false,
      permission_refs: []
    }]
  };

  const results = executeDecisionTools(decision, state);
  assert.equal(results[0].status, "rejected");
  assert.equal(state.getSnapshot().messages.length, 0);
}

function testParticipationObserverGeneratesQuietCheckin() {
  const runtime = createBudRuntime();
  runtime.handleEvent(baseEvent({
    event_id: "test-observer-room-active",
    type: "facilitator_instruction",
    privacy_scope: "public_shared",
    occurred_at: "2026-07-25T10:00:00.000Z",
    received_at: "2026-07-25T10:00:00.000Z",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      instruction_id: "instruction-observer",
      text: "Work with your group on the prototype success criteria.",
      target: "room",
      language: "en"
    }
  }));

  const results = runtime.observeParticipation({
    now: "2026-07-25T10:10:00.000Z",
    window_seconds: 600
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].event.type, "participation_observation");
  assert.equal(results[0].decision.decision_type, "HELP");
  assert.equal(results[0].toolResults[0].status, "succeeded");
  assert.equal(runtime.getStateSnapshot().messages.length, 2);

  const repeated = runtime.observeParticipation({
    now: "2026-07-25T10:11:00.000Z",
    window_seconds: 600
  });

  assert.equal(repeated.length, 0);
}

function testParticipationObserverSkipsActiveParticipant() {
  const runtime = createBudRuntime();
  runtime.handleEvent(baseEvent({
    event_id: "test-observer-active-room",
    type: "facilitator_instruction",
    privacy_scope: "public_shared",
    occurred_at: "2026-07-25T10:00:00.000Z",
    received_at: "2026-07-25T10:00:00.000Z",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      instruction_id: "instruction-active-observer",
      text: "Discuss the next build step.",
      target: "room",
      language: "en"
    }
  }));
  runtime.handleEvent(baseEvent({
    event_id: "test-observer-active-learner-1",
    type: "participant_message",
    privacy_scope: "group_shared",
    occurred_at: "2026-07-25T10:05:00.000Z",
    received_at: "2026-07-25T10:05:00.000Z",
    actor: {
      actor_type: "participant",
      participant_id: "learner-1"
    },
    payload: {
      message_id: "msg-active-observer",
      text: "I can take the evidence section.",
      language: "en",
      group_id: "group-main"
    }
  }));

  const results = runtime.observeParticipation({
    now: "2026-07-25T10:10:00.000Z",
    window_seconds: 600
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].event.payload.participant_id, "learner-2");
}

function testParticipationObserverSkipsEmptyRoom() {
  const runtime = createBudRuntime();
  const results = runtime.observeParticipation({
    now: "2026-07-25T10:10:00.000Z",
    window_seconds: 600
  });

  assert.equal(results.length, 0);
  assert.equal(runtime.getStateSnapshot().messages.length, 0);
}

function testMeaningRepair() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-meaning",
    type: "peer_message",
    privacy_scope: "group_shared",
    payload: {
      message_id: "msg-meaning",
      text: "The translation is not what I meant.",
      language: "en",
      group_id: "group-main"
    }
  }));

  assert.equal(result.decision.decision_type, "PROPOSE_MEANING");
  assert.equal(result.decision.surface, "us");
  assert.equal(runtime.getStateSnapshot().groups["group-main"].shared_meaning.status, "possible_gap");
}

function testFacilitatorProjection() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-room",
    type: "workshop_state_request",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      request_id: "request-room",
      requester_id: "facilitator-1",
      requested_view: "facilitator_view"
    }
  }));

  assert.equal(result.decision.decision_type, "CREATE_FACILITATOR_SIGNAL");
  assert.equal(result.decision.surface, "the_room");
  assert.equal(runtime.getStateSnapshot().workshop.facilitator_signals.length, 1);
}

function testCorrection() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-correction",
    type: "participant_correction",
    privacy_scope: "group_shared",
    payload: {
      corrected_event_id: "missing-translation",
      correction_type: "translation",
      explanation: "The translation changed my meaning."
    }
  }));

  assert.equal(result.decision.decision_type, "ASK_CLARIFY");
  assert.equal(result.decision.inference.status, "disputed");
}

function testWait() {
  const runtime = createBudRuntime();
  const result = runtime.handleEvent(baseEvent({
    event_id: "test-wait",
    type: "participant_message",
    privacy_scope: "group_shared",
    payload: {
      message_id: "msg-wait",
      text: "Okay.",
      language: "en",
      group_id: "group-main"
    }
  }));

  assert.equal(result.decision.decision_type, "WAIT");
  assert.equal(result.toolResults.length, 0);
}

function testPrivacyViolationRejectedByValidatorShape() {
  assert.throws(function () {
    validateAiDecision({
      decision_id: "bad-decision",
      workshop_id: "workshop-demo",
      created_at: new Date().toISOString(),
      surface: "the_room",
      decision_type: "CREATE_FACILITATOR_SIGNAL",
      trigger_event_ids: ["evt-private"],
      observation: "private",
      interpretation: "private",
      inference: {
        statement: "private raw content should cross",
        status: "provisional"
      },
      evidence_refs: [{ event_id: "evt-private" }],
      confidence: {
        level: "high",
        rationale: "bad",
        evidence_refs: [{ event_id: "evt-private" }]
      },
      privacy_assessment: {
        source_scope: "private_participant_ai",
        proposed_destination_scope: "facilitator_view",
        raw_private_content_included: true,
        permission_required: true,
        permission_refs: [],
        minimum_necessary_projection: false
      },
      human_authority: {
        decision_owner: "facilitator",
        reason: "bad",
        consequence_level: "high"
      },
      proposed_tool_calls: [],
      rationale: "bad"
    });
  });
}

function testLearnerServerApi(done) {
  const server = createServer();
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "GET", "/api/state", null, function (state) {
      assert.equal(state.workshop.prompt.indexOf("Define success criteria") !== -1, true);
      requestJson(port, "POST", "/api/help-stuck", {
        participant_id: "learner-1"
      }, function (helpPayload) {
        assert.equal(helpPayload.result.decision_type, "HELP");
        assert.equal(helpPayload.state.private_messages.length, 1);
        assert.equal(helpPayload.state.private_messages[0].text.indexOf("Define success criteria") !== -1, true);
        requestJson(port, "POST", "/api/observe", {
          participant_id: "learner-1"
        }, function (observePayload) {
          assert.equal(Array.isArray(observePayload.observations), true);
          assert.equal(observePayload.state.participant_id, "learner-1");
          server.close(done);
        });
      });
    });
  });
}

function requestJson(port, method, url, body, callback) {
  const http = require("http");
  const payload = body ? JSON.stringify(body) : "";
  const req = http.request({
    hostname: "127.0.0.1",
    port: port,
    path: url,
    method: method,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, function (res) {
    let data = "";
    res.on("data", function (chunk) {
      data += chunk;
    });
    res.on("end", function () {
      assert.equal(res.statusCode, 200);
      callback(JSON.parse(data));
    });
  });
  req.on("error", function (error) {
    throw error;
  });
  if (payload) {
    req.write(payload);
  }
  req.end();
}

run();
