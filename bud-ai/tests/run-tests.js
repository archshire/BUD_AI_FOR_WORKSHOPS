const assert = require("assert");
const { createBudRuntime } = require("../apps/server/src/runtime");
const { createInMemoryStateStore } = require("../apps/server/src/state/in-memory-state-store");
const { executeDecisionTools } = require("../apps/server/src/tools/tool-executor");
const { createServer } = require("../apps/server/src/index");
const { createContextualMemoryLedger } = require("../apps/server/src/contextual-memory-ledger");
const { createBudCognition } = require("../apps/server/src/bud-cognition");
const { createBudMemoryStore } = require("../apps/server/src/bud-memory");
const { buildLeaderResponseBrief, classifyLeaderIntent, normalizeLeaderBudReply } = require("../apps/server/src/leader-response-brief");
const { buildLearnerResponseBrief, classifyLearnerIntent, normalizeLearnerBudReply } = require("../apps/server/src/learner-response-brief");
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
  testParticipantEventRegistersForObservation();
  testMeaningRepair();
  testFacilitatorProjection();
  testCorrection();
  testWait();
  testPrivacyViolationRejectedByValidatorShape();
  testContextualMemoryLedger();
  testBudCognitionScopes();
  testBudMemorySupportSignals();
  testLeaderResponseBrief();
  testLearnerResponseBrief();
  testLeaderNameRouting(function () {
    testChatVisibilityAndLeaderContext(function () {
      testLearnerServerApi(function () {
        console.log("All Bud AI scaffold tests passed.");
      });
    });
  });
}

function testBudMemorySupportSignals() {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bud-memory-test-"));
  const memory = createBudMemoryStore(root);
  memory.recordSupport("BUD-TEST", "learner-a", {
    status: "open",
    task: "Identify the main idea",
    signal: "marked as needing help"
  });
  memory.recordSupport("BUD-TEST", "learner-a", {
    status: "resolved",
    task: "Identify the main idea",
    signal: "learner later marked the task as clear"
  });
  const content = memory.context("BUD-TEST", "learner-a");
  assert.equal(content.indexOf("status: open") !== -1, true);
  assert.equal(content.indexOf("status: resolved") !== -1, true);
}

function testLearnerResponseBrief() {
  assert.equal(classifyLearnerIntent("Can you explain what bounded agency means?"), "explain");
  assert.equal(classifyLearnerIntent("What should I do next?"), "next-step");
  assert.equal(classifyLearnerIntent("I feel stuck."), "support");
  const brief = buildLearnerResponseBrief({
    question: "Can you explain this?",
    source_available: true,
    group_id: "breakout-room-2"
  });
  assert.equal(brief.indexOf("Identity: Learner Bud") !== -1, true);
  assert.equal(brief.indexOf("assigned breakout group") !== -1, true);
  assert.equal(brief.indexOf("never reveal another learner's private conversation") !== -1, true);
  const personalBrief = buildLearnerResponseBrief({ question: "What is my sister's name?", personal_context: true });
  assert.equal(personalBrief.indexOf("they have not introduced it yet") !== -1, true);
  assert.equal(normalizeLearnerBudReply("I am Bud, your workshop partner. Let's unpack this.").indexOf("I'm here with you.") === 0, true);
}

function testLeaderResponseBrief() {
  assert.equal(classifyLeaderIntent("Help me introduce this workshop in two sentences."), "draft");
  assert.equal(classifyLeaderIntent("Can you explain the difference between Bud and a tool?"), "explain");
  assert.equal(classifyLeaderIntent("Give me the gist of today."), "brief");
  const brief = buildLeaderResponseBrief({
    question: "Give me the gist of today.",
    source_status: "active",
    has_plan: true
  });
  assert.equal(brief.indexOf("Identity: Leader Bud") !== -1, true);
  assert.equal(brief.indexOf("Audience: the Leader") !== -1, true);
  assert.equal(brief.indexOf("active source material and locked learning plan") !== -1, true);
  assert.equal(brief.indexOf("a concise natural-language briefing") !== -1, true);
  const personalBrief = buildLeaderResponseBrief({ question: "What is my sister's name?", personal_context: true });
  assert.equal(personalBrief.indexOf("it has not been introduced yet") !== -1, true);
  const normalized = normalizeLeaderBudReply("I am Bud, your workshop partner. I differ from a normal AI tool because I exercise bounded agency and remain present. I adapt to learner needs, offer timely support, and stay with learners as they work. I can clarify uncertainty.");
  assert.equal(normalized.indexOf("I am Bud") === -1, true);
  assert.equal(normalized.indexOf("I differ from a normal AI tool") !== -1, true);
  assert.equal(normalized.indexOf("I exercise bounded agency and remain present") !== -1, true);
  assert.equal(normalized.indexOf("I adapt to learner needs, offer timely support") !== -1, true);
  assert.equal(normalized.indexOf("I can clarify") !== -1, true);
  assert.equal(normalizeLeaderBudReply("Leader Bud responds naturally: Hello.").indexOf("responds naturally") === -1, true);
  assert.equal(normalizeLeaderBudReply("Bud helps with the workshop. **Practical Implication:** Stay focused.").indexOf("Practical Implication") === -1, true);
}

function testContextualMemoryLedger() {
  const root = require("fs").mkdtempSync(require("path").join(require("os").tmpdir(), "bud-ledger-test-"));
  const ledger = createContextualMemoryLedger(root);
  ledger.initialize("BUD-TEST");
  ledger.record("BUD-TEST", {
    category: "People Index",
    actor_id: "guest-taylor",
    display_name: "Taylor Guest",
    source_event_id: "presence-test",
    privacy_scope: "public_shared",
    usable_by: ["public_shared", "private_facilitator_ai"],
    summary: "Taylor Guest is currently connected as learner in room BUD-TEST."
  });
  const retrieved = ledger.retrieve("BUD-TEST", {
    question: "is Taylor in the workshop?",
    usable_by: ["private_facilitator_ai"],
    categories: ["People Index"]
  });
  assert.equal(retrieved.indexOf("Taylor Guest") !== -1, true);
  assert.equal(retrieved.indexOf("currently connected") !== -1, true);
  ledger.supersede("BUD-TEST", {
    category: "People Index",
    actor_id: "guest-taylor",
    status: "stale"
  });
  const afterDisconnect = ledger.retrieve("BUD-TEST", {
    question: "is Taylor in the workshop?",
    usable_by: ["private_facilitator_ai"],
    categories: ["People Index"]
  });
  assert.equal(afterDisconnect.indexOf("Taylor Guest") === -1, true);
}

function testBudCognitionScopes() {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bud-cognition-test-"));
  const cognition = createBudCognition({ ledger_root: root, default_room: "BUD-TEST" });
  cognition.recordSharedMessage({
    room_name: "BUD-TEST",
    message_id: "message-group-a",
    scope: "group_shared",
    target_id: "breakout-room-1",
    sender_id: "learner-a",
    sender_display_name: "Learner A",
    text: "Room one needs help with evidence."
  });
  cognition.recordSharedMessage({
    room_name: "BUD-TEST",
    message_id: "message-group-b",
    scope: "group_shared",
    target_id: "breakout-room-2",
    sender_id: "learner-b",
    sender_display_name: "Learner B",
    text: "Room two is discussing coffee."
  });
  cognition.recordLearnerExchange("BUD-TEST", "learner-a", {
    message_id: "private-a",
    sender: "learner",
    text: "My private note is about evidence."
  });

  const leader = cognition.leaderRetrieval("BUD-TEST", "What are the breakout rooms discussing?");
  assert.equal(leader.indexOf("Room one needs help") !== -1, true);
  assert.equal(leader.indexOf("Room two is discussing coffee") !== -1, true);
  assert.equal(leader.indexOf("My private note") === -1, true);

  const learnerA = cognition.learnerRetrieval("BUD-TEST", "learner-a", "breakout-room-1", "evidence");
  assert.equal(learnerA.indexOf("Room one needs help") !== -1, true);
  assert.equal(learnerA.indexOf("Room two is discussing coffee") === -1, true);
  assert.equal(learnerA.indexOf("My private note is about evidence") !== -1, true);

  const learnerB = cognition.learnerRetrieval("BUD-TEST", "learner-b", "breakout-room-2", "coffee");
  assert.equal(learnerB.indexOf("Room two is discussing coffee") !== -1, true);
  assert.equal(learnerB.indexOf("My private note") === -1, true);
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

function testParticipantEventRegistersForObservation() {
  const runtime = createBudRuntime();
  runtime.handleEvent(baseEvent({
    event_id: "test-register-new-participant",
    type: "task_completed",
    privacy_scope: "private_participant_ai",
    actor: {
      actor_type: "participant",
      participant_id: "guest-observer"
    },
    payload: {
      task_id: "page-1-task",
      page_id: "page-1"
    }
  }));
  assert.equal(runtime.getStateSnapshot().workshop.participant_ids.includes("guest-observer"), true);
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
  runtime.ensureParticipant("learner-1");
  runtime.ensureParticipant("learner-2");
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
  runtime.ensureParticipant("learner-2");
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
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const roomDirectoryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bud-room-directory-test-")), "rooms.json");
  const server = createServer({ room_directory_file: roomDirectoryFile });
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "GET", "/api/state", null, function (state) {
      assert.equal(state.workshop.prompt, "");
      requestJson(port, "POST", "/api/facilitator-message", {
        room_name: "BUD-101",
        text: "How many learners are we dealing with?",
        attendance_context: {
          registered_present: 11,
          registered_absent: 3,
          guests_present: 6
        }
      }, function () {
        requestJson(port, "POST", "/api/facilitator-message", {
          room_name: "BUD-101",
          text: "How many are there now?"
        }, function (attendanceFollowup) {
          const answer = attendanceFollowup.state.facil_bud_messages.slice(-1)[0];
          assert.equal(answer.provider, "attendance-context");
          assert.equal(answer.text.indexOf("17 learners present") !== -1, true);
          requestJson(port, "POST", "/api/private-message", {
            room_name: "BUD-101",
            participant_id: "learner-1",
            text: "How am I doing?"
          }, function (learnerProgress) {
            const progressAnswer = learnerProgress.state.private_messages.slice(-1)[0];
            assert.equal(progressAnswer.provider, "learner-self-checkin-context");
            assert.equal(progressAnswer.text.indexOf("do not have a task check-in") !== -1, true);
            requestJson(port, "POST", "/api/private-message", {
              room_name: "BUD-101",
              participant_id: "learner-1",
              text: "How do you know?"
            }, function (learnerEvidence) {
              const evidenceAnswer = learnerEvidence.state.private_messages.slice(-1)[0];
              assert.equal(evidenceAnswer.provider, "learner-evidence-basis");
              assert.equal(evidenceAnswer.text.indexOf("None have been recorded yet") !== -1, true);
              requestJson(port, "POST", "/api/help-stuck", {
                participant_id: "learner-1"
              }, function (helpPayload) {
                assert.equal(helpPayload.result.decision_type, "HELP");
                assert.equal(helpPayload.state.private_messages.length >= 1, true);
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
        });
      });
    });
  });
}

function testLeaderNameRouting(done) {
  const server = createServer();
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "POST", "/api/facilitator-message", {
      room_name: "BUD-101",
      leader_name: "Daniel Yeo",
      text: "What is my name?"
    }, function (payload) {
      const answer = payload.state.facil_bud_messages.slice(-1)[0];
      assert.equal(answer.provider, "leader-identity-context");
      assert.equal(answer.text, "Your name is Daniel Yeo.");
      server.close(done);
    });
  });
}

function testChatVisibilityAndLeaderContext(done) {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const roomName = "BUD-CHAT-TEST";
  const roomDirectoryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bud-chat-scope-test-")), "rooms.json");
  fs.writeFileSync(roomDirectoryFile, JSON.stringify({
    rooms: {
      [roomName]: {
        room_name: roomName,
        ready: true,
        allocations: {},
        breakout_assignments: [
          { group_id: "breakout-room-1", members: [{ participant_id: "learner-alice", display_name: "Alice" }] },
          { group_id: "breakout-room-2", members: [{ participant_id: "learner-bob", display_name: "Bob" }] }
        ]
      }
    }
  }));
  const server = createServer({ room_directory_file: roomDirectoryFile });
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "POST", "/api/group-message", {
      room_name: roomName,
      participant_id: "facilitator-1",
      sender_display_name: "Leader",
      group_id: "group-main",
      text: "Everyone, share one question about the material."
    }, function () {
      requestJson(port, "POST", "/api/group-message", {
        room_name: roomName,
        participant_id: "learner-alice",
        sender_display_name: "Alice",
        group_id: "breakout-room-1",
        text: "We need help connecting evidence to the claim."
      }, function () {
        requestJson(port, "POST", "/api/group-message", {
          room_name: roomName,
          participant_id: "learner-bob",
          sender_display_name: "Bob",
          group_id: "breakout-room-2",
          text: "We are comparing the two examples."
        }, function () {
          requestJson(port, "POST", "/api/private-message", {
            room_name: roomName,
            participant_id: "learner-alice",
            display_name: "Alice",
            text: "hey"
          }, function () {
            requestJson(port, "GET", "/api/state?room=" + roomName + "&participant_id=learner-alice", null, function (aliceState) {
              assert.equal(aliceState.public_messages.some(function (message) { return message.text.indexOf("Everyone, share") !== -1; }), true);
              assert.equal(aliceState.group_messages.some(function (message) { return message.text.indexOf("connecting evidence") !== -1; }), true);
              assert.equal(aliceState.group_messages.some(function (message) { return message.text.indexOf("comparing the two examples") !== -1; }), false);
              assert.equal(aliceState.public_messages.some(function (message) { return message.text.indexOf("connecting evidence") !== -1; }), false);
              requestJson(port, "GET", "/api/facilitator/state?room=" + roomName, null, function (leaderState) {
                assert.equal(leaderState.public_messages.some(function (message) { return message.text.indexOf("Everyone, share") !== -1; }), true);
                assert.equal(leaderState.group_messages.some(function (message) { return message.text.indexOf("connecting evidence") !== -1; }), true);
                assert.equal(leaderState.group_messages.some(function (message) { return message.text.indexOf("comparing the two examples") !== -1; }), true);
                assert.equal(JSON.stringify(leaderState).indexOf("message-bud-casual") === -1, true);
                requestJson(port, "POST", "/api/facilitator-message", {
                  room_name: roomName,
                  text: "What are the breakout rooms discussing?"
                }, function (leaderReply) {
                  const answer = leaderReply.state.facil_bud_messages.slice(-1)[0];
                  assert.equal(answer.provider, "shared-chat-context");
                  assert.equal(answer.text.indexOf("connecting evidence") !== -1, true);
                  assert.equal(answer.text.indexOf("comparing the two examples") !== -1, true);
                  assert.equal(answer.text.indexOf("message-bud-casual") === -1, true);
                  requestJson(port, "POST", "/api/task-comprehension-response", {
                    room_name: roomName,
                    participant_id: "learner-alice",
                    display_name: "Alice",
                    task_id: "evidence-task",
                    task_text: "Connect evidence to the claim",
                    response: "red"
                  }, function () {
                    requestJson(port, "POST", "/api/task-comprehension-response", {
                      room_name: roomName,
                      participant_id: "learner-bob",
                      display_name: "Bob",
                      task_id: "evidence-task",
                      task_text: "Connect evidence to the claim",
                      response: "yellow"
                    }, function () {
                      requestJson(port, "GET", "/api/facilitator/state?room=" + roomName, null, function (insightsState) {
                        const insight = insightsState.task_insights[0];
                        assert.equal(insight.needs_support.some(function (item) { return item.display_name === "Alice" && item.response === "red"; }), true);
                        assert.equal(insight.needs_support.some(function (item) { return item.display_name === "Bob" && item.response === "yellow"; }), true);
                        requestJson(port, "POST", "/api/facilitator-message", {
                          room_name: roomName,
                          text: "How are the students doing in the workshop?"
                        }, function (roomStatus) {
                          const statusAnswer = roomStatus.state.facil_bud_messages.slice(-1)[0];
                          assert.equal(statusAnswer.provider, "room-status-context");
                          assert.equal(statusAnswer.text.indexOf("Recent shared chat") !== -1, true);
                          assert.equal(statusAnswer.text.indexOf("Alice (needs help") !== -1, true);
                          requestJson(port, "POST", "/api/facilitator-message", {
                            room_name: roomName,
                            text: "Yes, I know, but how are they doing?"
                          }, function (followup) {
                            const followupAnswer = followup.state.facil_bud_messages.slice(-1)[0];
                            assert.equal(followupAnswer.provider, "room-status-context");
                            assert.equal(followupAnswer.text.indexOf("Recent shared chat") !== -1, true);
                            server.close(done);
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
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
      assert.equal(res.statusCode, 200, method + " " + url + " returned " + res.statusCode + ": " + data);
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
