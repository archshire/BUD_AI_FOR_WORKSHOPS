const assert = require("assert");
const { createBudRuntime } = require("../apps/server/src/runtime");
const { createInMemoryStateStore } = require("../apps/server/src/state/in-memory-state-store");
const { executeDecisionTools } = require("../apps/server/src/tools/tool-executor");
const { createServer } = require("../apps/server/src/index");
const { createTranscriptLog } = require("../apps/server/src/transcript/transcript-log");
const { createSentenceBuffer } = require("../apps/server/src/transcript/sentence-buffer");
const { baseEvent } = require("../packages/test-fixtures/src/demo-events");
const { validateAiDecision } = require("../packages/contracts/src/validators");
const { cleanTranscript } = require("../apps/server/src/providers/transcript-hygiene");
const { groqSttConfigured, groqSttModel } = require("../apps/server/src/providers/groq-stt");
const { llmTranslateBackend, llmTranslateConfigured, cleanTranslation } = require("../apps/server/src/providers/llm-translate");
const { createCheckinScheduler, parseVerdict } = require("../apps/server/src/checkin/checkin-scheduler");

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
  testTranscriptLogKeepsRoomSpeech();
  testTranscriptLogSurfacesOlderRelevantTurns();
  testSentenceBufferHoldsFragmentsUntilSentenceEnds();
  testSentenceBufferReleasesStrandedTextWithoutSwallowingNextSentence();
  testSentenceBufferKeepsSpeakersApart();
  testSentenceBufferFlushReturnsTail();
  testSentenceBufferReleasesOnSilenceWithoutAnotherFragment();
  testSentenceBufferMeasuresPausesInSpeechTimeNotArrivalTime();
  testHygieneDropsSubtitleHallucinations();
  testHygieneKeepsRealSpeech();
  testHygieneDropsVerbatimRepeatsPerSpeaker();
  testGroqSttConfiguration();
  testLlmTranslationConfiguration();
  testLlmTranslationCleansModelWrappers();
  testCheckinSchedulerTracksSpeechWithoutImmediateInterruption();
  testComprehensionReportsCoexistWithTaskResponses();
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

function testTranscriptLogKeepsRoomSpeech() {
  const log = createTranscriptLog();
  log.record({
    room_name: "BUD-101",
    participant_id: "facilitator-1",
    display_name: "Teacher",
    role: "facilitator",
    original_text: "Start by naming the user goal.",
    original_language: "en",
    translated_text: "Empieza nombrando el objetivo del usuario.",
    target_language: "es",
    created_at: "2026-07-25T10:00:00.000Z"
  });
  log.record({ room_name: "BUD-101", participant_id: "learner-1", original_text: "" });

  const entries = log.recent("BUD-101", 10);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].role, "facilitator");

  const context = log.context("BUD-101", "what did the facilitator say?");
  assert.equal(context.text.indexOf("Teacher (facilitator)") !== -1, true);
  assert.equal(context.text.indexOf("Start by naming the user goal.") !== -1, true);
  assert.equal(context.text.indexOf("Empieza nombrando") !== -1, true);
  assert.equal(log.context("other-room", "anything").text, "");
}

function testTranscriptLogSurfacesOlderRelevantTurns() {
  const log = createTranscriptLog();
  log.record({
    room_name: "BUD-101",
    participant_id: "facilitator-1",
    display_name: "Teacher",
    role: "facilitator",
    original_text: "Evidence means a screenshot of the prototype in use.",
    original_language: "en",
    created_at: "2026-07-25T10:00:00.000Z"
  });
  for (let index = 1; index <= 10; index += 1) {
    log.record({
      room_name: "BUD-101",
      participant_id: "learner-2",
      display_name: "Ana",
      role: "learner",
      original_text: "Filler turn number " + index + ".",
      original_language: "en",
      created_at: "2026-07-25T10:0" + index + ":00.000Z"
    });
  }

  const recentOnly = log.context("BUD-101", "how is everyone doing?");
  assert.equal(recentOnly.text.indexOf("Evidence means") === -1, true);

  const searched = log.context("BUD-101", "what counts as evidence?");
  assert.equal(searched.text.indexOf("Evidence means") !== -1, true);
  assert.equal(searched.text.indexOf("Evidence means") < searched.text.indexOf("Filler turn number 10"), true);
}

function testSentenceBufferHoldsFragmentsUntilSentenceEnds() {
  const buffer = createSentenceBuffer();
  const first = buffer.push("learner-1", "I think the main", 1000);
  assert.equal(first.ready, null);
  assert.equal(first.pending, "I think the main");

  const second = buffer.push("learner-1", "problem is cost.", 1500);
  assert.equal(second.ready, "I think the main problem is cost.");
  assert.equal(second.reason, "sentence");
  assert.equal(buffer.pending("learner-1"), "");

  assert.equal(buffer.push("learner-1", "\u6211\u4eec\u5f00\u59cb\u5427\u3002", 1600).ready, "\u6211\u4eec\u5f00\u59cb\u5427\u3002");
}

function testSentenceBufferReleasesStrandedTextWithoutSwallowingNextSentence() {
  const buffer = createSentenceBuffer({ idleReleaseMs: 3500 });
  buffer.push("learner-1", "so that was the first idea", 1000);
  const resumed = buffer.push("learner-1", "now for something else", 9000);
  assert.equal(resumed.ready, "so that was the first idea");
  assert.equal(resumed.reason, "idle");
  assert.equal(resumed.pending, "now for something else");
}

function testSentenceBufferKeepsSpeakersApart() {
  const buffer = createSentenceBuffer();
  buffer.push("learner-1", "the cost of", 1000);
  buffer.push("learner-2", "a different thought", 1050);
  const released = buffer.push("learner-1", "the prototype matters.", 1100);
  assert.equal(released.ready, "the cost of the prototype matters.");
  assert.equal(buffer.pending("learner-2"), "a different thought");
}

function testSentenceBufferFlushReturnsTail() {
  const buffer = createSentenceBuffer();
  buffer.push("learner-1", "and that is roughly", 1000);
  assert.equal(buffer.flush("learner-1").ready, "and that is roughly");
  assert.equal(buffer.flush("learner-1").ready, null);
}

function fakeTimers() {
  const scheduled = [];
  return {
    setTimer: function (fn, ms) {
      const entry = { fn: fn, ms: ms, cancelled: false };
      scheduled.push(entry);
      return entry;
    },
    clearTimer: function (entry) { entry.cancelled = true; },
    fire: function () {
      const pending = scheduled.filter(function (entry) { return !entry.cancelled; });
      assert.equal(pending.length, 1);
      pending[0].cancelled = true;
      pending[0].fn();
      return pending[0].ms;
    }
  };
}

function testSentenceBufferReleasesOnSilenceWithoutAnotherFragment() {
  const clock = fakeTimers();
  const released = [];
  const buffer = createSentenceBuffer({
    idleReleaseMs: 1500,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onRelease: function (speakerId, text, reason) { released.push({ speakerId, text, reason }); }
  });

  buffer.push("learner-1", "so that was the first idea", 5000, {
    speechStartedAt: 1000,
    speechEndedAt: 2000,
    sequence: 1
  });

  assert.equal(clock.fire(), 0);
  assert.equal(released.length, 1);
  assert.equal(released[0].text, "so that was the first idea");
  assert.equal(buffer.pending("learner-1"), "");
  buffer.stop();
}

function testSentenceBufferMeasuresPausesInSpeechTimeNotArrivalTime() {
  const buffer = createSentenceBuffer({ idleReleaseMs: 1500 });
  buffer.push("learner-1", "the cost of the prototype", 10000, { speechStartedAt: 1000, speechEndedAt: 2000, sequence: 1 });
  const joined = buffer.push("learner-1", "is what worries me", 14000, { speechStartedAt: 2400, speechEndedAt: 3500, sequence: 2 });
  assert.equal(joined.ready, null);
  assert.equal(joined.pending, "the cost of the prototype is what worries me");

  const split = createSentenceBuffer({ idleReleaseMs: 1500 });
  split.push("learner-1", "the cost of the prototype", 10000, { speechStartedAt: 1000, speechEndedAt: 2000, sequence: 1 });
  const separate = split.push("learner-1", "anyway lets move on", 14000, { speechStartedAt: 4000, speechEndedAt: 5000, sequence: 2 });
  assert.equal(separate.ready, "the cost of the prototype");
  assert.equal(separate.reason, "idle");
}

function testHygieneDropsSubtitleHallucinations() {
  [
    "\u8bf7\u4e0d\u541d\u70b9\u8d5e \u8ba2\u9605 \u8f6c\u53d1 \u6253\u8d4f\u652f\u6301\u660e\u955c\u4e0e\u70b9\u70b9\u680f\u76ee",
    "\u597d\u3002\u597d\u3002\u597d\u3002",
    "Thanks for watching!",
    "Subtitles by the Amara.org community",
    "..."
  ].forEach(function (text, index) {
    const result = cleanTranscript(text, { participantId: "noise-" + index });
    assert.equal(result.text, "", "expected to drop: " + text);
    assert.equal(result.dropped, true);
  });
}

function testHygieneKeepsRealSpeech() {
  [
    "\u6211\u4eec\u4eca\u5929\u8981\u8ba8\u8bba\u6c14\u5019\u53d8\u5316\u7684\u5f71\u54cd",
    "Okay, so the next step is to open the file.",
    "Yes, I understand."
  ].forEach(function (text, index) {
    const result = cleanTranscript(text, { participantId: "speaker-" + index });
    assert.equal(result.text, text, "expected to keep: " + text);
    assert.equal(result.dropped, false);
  });
}

function testHygieneDropsVerbatimRepeatsPerSpeaker() {
  const first = cleanTranscript("this is the same sentence", { participantId: "repeat-a" });
  assert.equal(first.dropped, false);
  const repeat = cleanTranscript("this is the same sentence", { participantId: "repeat-a" });
  assert.equal(repeat.dropped, true);
  assert.equal(repeat.text, "");
  const otherSpeaker = cleanTranscript("this is the same sentence", { participantId: "repeat-b" });
  assert.equal(otherSpeaker.dropped, false);
  const later = cleanTranscript("this is the same sentence", { participantId: "repeat-a", now: Date.now() + 120000 });
  assert.equal(later.dropped, false);
}

function testGroqSttConfiguration() {
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_STT_MODEL;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_STT_MODEL;
  assert.equal(groqSttConfigured(), false);
  assert.equal(groqSttModel(), "whisper-large-v3");

  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_STT_MODEL = "test-model";
  assert.equal(groqSttConfigured(), true);
  assert.equal(groqSttModel(), "test-model");

  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GROQ_STT_MODEL;
  else process.env.GROQ_STT_MODEL = originalModel;
}

function testLlmTranslationConfiguration() {
  const originalProvider = process.env.TRANSLATION_PROVIDER;
  const originalGroq = process.env.GROQ_API_KEY;
  const originalGemini = process.env.GEMINI_API_KEY;
  const originalHost = process.env.LLM_HOST;
  const originalPort = process.env.LLM_PORT;

  delete process.env.TRANSLATION_PROVIDER;
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.LLM_HOST;
  delete process.env.LLM_PORT;
  assert.equal(llmTranslateBackend(), "nllb");
  assert.equal(llmTranslateConfigured(), false);

  process.env.GROQ_API_KEY = "test-key";
  assert.equal(llmTranslateBackend(), "groq");
  assert.equal(llmTranslateConfigured(), true);

  delete process.env.GROQ_API_KEY;
  process.env.TRANSLATION_PROVIDER = "qwen";
  process.env.LLM_HOST = "localhost";
  assert.equal(llmTranslateBackend(), "qwen");
  assert.equal(llmTranslateConfigured(), true);

  if (originalProvider === undefined) delete process.env.TRANSLATION_PROVIDER;
  else process.env.TRANSLATION_PROVIDER = originalProvider;
  if (originalGroq === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroq;
  if (originalGemini === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGemini;
  if (originalHost === undefined) delete process.env.LLM_HOST;
  else process.env.LLM_HOST = originalHost;
  if (originalPort === undefined) delete process.env.LLM_PORT;
  else process.env.LLM_PORT = originalPort;
}

function testLlmTranslationCleansModelWrappers() {
  assert.equal(cleanTranslation("Translation: hello"), "hello");
  assert.equal(cleanTranslation("\"hello\""), "hello");
  assert.equal(cleanTranslation("<think>notes</think>\nbonjour"), "bonjour");
  assert.equal(cleanTranslation("```text\nhola\n```"), "hola");
}

function testCheckinSchedulerTracksSpeechWithoutImmediateInterruption() {
  const log = createTranscriptLog();
  const scheduler = createCheckinScheduler({
    transcriptLog: log,
    wordInterval: 10,
    judge: function () { throw new Error("should not judge below interval"); },
    summarise: function () { throw new Error("should not summarise below interval"); },
    deliver: function () { throw new Error("should not deliver below interval"); }
  });
  const entry = log.record({
    room_name: "BUD-101",
    participant_id: "facilitator-1",
    original_text: "one two three",
    role: "facilitator"
  });
  assert.equal(scheduler.noteSpeech(entry), null);
  assert.equal(scheduler.stats()[0].words_since_judgement, 3);
  assert.equal(parseVerdict("YES\nThe topic wrapped.").needed, true);
  assert.equal(parseVerdict("NO - still mid explanation").needed, false);
}

function testComprehensionReportsCoexistWithTaskResponses() {
  const runtime = createBudRuntime();
  runtime.recordTaskResponse({
    room_name: "BUD-101",
    task_id: "task-1",
    task_index: 1,
    task_text: "Read the first page.",
    participant_id: "learner-1",
    response: "green"
  });
  runtime.handleEvent(baseEvent({
    event_id: "chapter-response-1",
    type: "comprehension_check_response",
    privacy_scope: "private_participant_ai",
    actor: { actor_type: "participant", participant_id: "learner-1" },
    payload: {
      checkin_id: "chapter-BUD-101-1",
      recap_point_id: "chapter-BUD-101-1",
      chapter: {
        chapter_id: "chapter-BUD-101-1",
        index: 1,
        label: "Check-in 1",
        summary_text: "The room covered evidence."
      },
      response: "yellow"
    }
  }));
  const snapshot = runtime.getStateSnapshot();
  assert.equal(snapshot.task_responses["BUD-101"]["task-1"].responses["learner-1"].response, "green");
  assert.equal(snapshot.participants["learner-1"].comprehension.status, "yellow");
  assert.equal(snapshot.participants["learner-1"].comprehension.reports.length, 1);
  assert.equal(snapshot.participants["learner-1"].comprehension.reports[0].chapter_summary, "The room covered evidence.");
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
          requestJson(port, "GET", "/api/transcript?room=BUD-101", null, function (transcriptPayload) {
            assert.equal(transcriptPayload.room_name, "BUD-101");
            assert.equal(Array.isArray(transcriptPayload.entries), true);
            requestJson(port, "GET", "/api/transcript/live?room=BUD-101&after_sequence=0", null, function (livePayload) {
              assert.equal(livePayload.room_name, "BUD-101");
              assert.equal(Array.isArray(livePayload.entries), true);
              assert.equal(typeof livePayload.latest_sequence, "number");
              server.close(done);
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
