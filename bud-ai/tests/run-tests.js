const assert = require("assert");
const { createBudRuntime } = require("../apps/server/src/runtime");
const { createInMemoryStateStore } = require("../apps/server/src/state/in-memory-state-store");
const { executeDecisionTools } = require("../apps/server/src/tools/tool-executor");
const { createServer, facilitatorState } = require("../apps/server/src/index");
const { createTranscriptLog } = require("../apps/server/src/transcript/transcript-log");
const { createSentenceBuffer } = require("../apps/server/src/transcript/sentence-buffer");
const { createCheckinScheduler, parseVerdict } = require("../apps/server/src/checkin/checkin-scheduler");
const { baseEvent } = require("../packages/test-fixtures/src/demo-events");
const { validateAiDecision } = require("../packages/contracts/src/validators");
const { cleanTranscript } = require("../apps/server/src/providers/transcript-hygiene");

async function run() {
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
  await testCheckinWaitsForTheWordInterval();
  await testCheckinSkipsSummaryWhenModelSaysNo();
  await testCheckinSummarisesOnlyUncoveredSpeechEachTime();
  await testCheckinJudgeSeesWholeLogAndParsesVerdicts();
  await testCheckinChaptersAreNamedAndOrdered();
  await testComprehensionResponsesAreStampedWithAChapter();
  testAnswersExpireWhenTheNextChapterOpens();
  testSentenceBufferHoldsFragmentsUntilSentenceEnds();
  testSentenceBufferKeepsAccumulatingWhileSpeechContinues();
  testSentenceBufferReleasesStrandedTextWithoutSwallowingNextSentence();
  testSentenceBufferReleasesOnLengthAndHardTimeout();
  testSentenceBufferKeepsSpeakersApart();
  testSentenceBufferFlushReturnsTail();
  testSentenceBufferReleasesOnSilenceWithoutAnotherFragment();
  testSentenceBufferWaitsWhileAChunkIsStillBeingTranscribed();
  testSentenceBufferMeasuresPausesInSpeechTimeNotArrivalTime();
  testHygieneDropsSubtitleHallucinations();
  testHygieneKeepsRealSpeech();
  testHygieneDropsVerbatimRepeatsPerSpeaker();
  testLearnerServerApi(function () {
    console.log("All Bud AI scaffold tests passed.");
  });
}

// Background noise makes Whisper emit the sign-off text from the subtitled video it was
// trained on, in whatever language it thinks it heard. None of it is speech.
function testHygieneDropsSubtitleHallucinations() {
  const noise = [
    "请不吝点赞 订阅 转发 打赏支持明镜与点点栏目",
    "请不吝点赞，订阅，转发，打赏支持明镜与点点栏目！",
    "好",
    "早安",
    "好。好。好。",
    "好好好好好好",
    "Thanks for watching!",
    "Subtitles by the Amara.org community",
    "♪♪♪"
  ];
  noise.forEach(function (text, index) {
    const result = cleanTranscript(text, { participantId: "noise-" + index });
    assert.equal(result.text, "", "expected to drop: " + text);
    assert.equal(result.dropped, true);
  });
}

// The filter must not eat short real answers or ordinary sentences.
function testHygieneKeepsRealSpeech() {
  const speech = [
    "我们今天要讨论气候变化的影响",
    "Okay, so the next step is to open the file.",
    "Yes, I understand.",
    "မင်္ဂလာပါ ဆရာ"
  ];
  speech.forEach(function (text, index) {
    const result = cleanTranscript(text, { participantId: "speaker-" + index });
    assert.equal(result.text, text, "expected to keep: " + text);
    assert.equal(result.dropped, false);
  });
}

// A model looping on room noise repeats itself word for word; two people happening to
// say the same thing must not be mistaken for that.
function testHygieneDropsVerbatimRepeatsPerSpeaker() {
  const first = cleanTranscript("this is the same sentence", { participantId: "a" });
  assert.equal(first.dropped, false);
  const repeat = cleanTranscript("this is the same sentence", { participantId: "a" });
  assert.equal(repeat.dropped, true);
  assert.equal(repeat.text, "");
  const otherSpeaker = cleanTranscript("this is the same sentence", { participantId: "b" });
  assert.equal(otherSpeaker.dropped, false);
  // The same speaker saying it again long afterwards is a person, not a loop.
  const later = cleanTranscript("this is the same sentence", { participantId: "a", now: Date.now() + 120000 });
  assert.equal(later.dropped, false);
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

// Speaks `wordCount` words into a transcript log through the scheduler, the way the
// live server does: one sentence at a time, each one counted as it lands.
function speak(log, scheduler, wordCount, text) {
  const sentence = new Array(wordCount).fill(text || "point").join(" ") + ".";
  const stored = log.record({
    room_name: "bud-demo-room",
    participant_id: "facilitator-1",
    display_name: "Facilitator",
    role: "facilitator",
    original_text: sentence
  });
  return scheduler.noteSpeech(stored);
}

function checkinHarness(verdicts) {
  const log = createTranscriptLog();
  const calls = { judged: [], summarised: [], delivered: [] };
  const scheduler = createCheckinScheduler({
    transcriptLog: log,
    wordInterval: 500,
    judge: function (input) {
      calls.judged.push(input);
      const verdict = verdicts.shift();
      return Promise.resolve(verdict || { needed: false, reason: "no" });
    },
    summarise: function (input) {
      calls.summarised.push(input);
      return Promise.resolve("Summary of " + input.newEntries.length + " turns.");
    },
    deliver: function (input) {
      calls.delivered.push(input);
      return Promise.resolve({ recipients: 2 });
    }
  });
  return { log, scheduler, calls };
}

async function testCheckinWaitsForTheWordInterval() {
  const harness = checkinHarness([{ needed: true }]);
  await speak(harness.log, harness.scheduler, 400);
  assert.equal(harness.calls.judged.length, 0, "under 500 words the model must not be asked at all");

  await speak(harness.log, harness.scheduler, 150);
  assert.equal(harness.calls.judged.length, 1, "crossing 500 words asks the model once");
  assert.equal(harness.calls.delivered.length, 1);
  assert.equal(harness.scheduler.stats()[0].words_since_judgement, 0, "the counter restarts after a judgement");
}

async function testCheckinSkipsSummaryWhenModelSaysNo() {
  const harness = checkinHarness([{ needed: false, reason: "still mid-topic" }]);
  await speak(harness.log, harness.scheduler, 600);
  assert.equal(harness.calls.judged.length, 1);
  assert.equal(harness.calls.summarised.length, 0, "a no verdict must not cost a summarisation call");
  assert.equal(harness.calls.delivered.length, 0);
  assert.equal(harness.scheduler.stats()[0].covered_through, 0, "speech passed over stays uncovered");
}

async function testCheckinSummarisesOnlyUncoveredSpeechEachTime() {
  const harness = checkinHarness([{ needed: false }, { needed: true }, { needed: true }]);

  // Round one: judged no, so those two sentences stay uncovered.
  await speak(harness.log, harness.scheduler, 300, "alpha");
  await speak(harness.log, harness.scheduler, 300, "beta");
  assert.equal(harness.calls.summarised.length, 0);

  // Round two: judged yes, and the summary covers the speech the first round skipped.
  await speak(harness.log, harness.scheduler, 600, "gamma");
  assert.equal(harness.calls.summarised.length, 1);
  assert.equal(harness.calls.summarised[0].newEntries.length, 3, "the earlier unsummarised turns are included");
  assert.equal(harness.scheduler.stats()[0].covered_through, 3);

  // Round three: only the speech after the delivered check-in is sent to the model.
  await speak(harness.log, harness.scheduler, 600, "delta");
  assert.equal(harness.calls.summarised.length, 2);
  assert.equal(harness.calls.summarised[1].newEntries.length, 1, "already summarised turns are not summarised twice");
  assert.equal(harness.calls.summarised[1].newEntries[0].original_text.indexOf("delta"), 0);
  assert.equal(harness.calls.delivered.length, 2);
}

async function testCheckinJudgeSeesWholeLogAndParsesVerdicts() {
  const harness = checkinHarness([{ needed: false }, { needed: true }]);
  await speak(harness.log, harness.scheduler, 600, "alpha");
  await speak(harness.log, harness.scheduler, 600, "beta");
  assert.equal(harness.calls.judged[1].fullEntries.length, 2, "the judge always sees the whole stored speech log");
  assert.equal(harness.calls.judged[1].newEntries.length, 2, "and separately what is still uncovered");

  assert.equal(parseVerdict("YES\nThe facilitator wrapped up the evidence section.").needed, true);
  assert.equal(parseVerdict("NO - still mid explanation").needed, false);
  assert.equal(parseVerdict("").needed, false, "an empty answer must fail towards not interrupting learners");
  assert.equal(parseVerdict("Nothing worth sending yet").needed, false);
}

async function testCheckinChaptersAreNamedAndOrdered() {
  const harness = checkinHarness([{ needed: true }, { needed: true }]);
  const opening = harness.scheduler.currentChapter("bud-demo-room");
  assert.equal(opening.index, 0, "before any check-in, responses collect against an opening chapter");
  assert.equal(harness.scheduler.chapters("bud-demo-room").length, 0, "the opening chapter is not a delivered check-in");

  await speak(harness.log, harness.scheduler, 600, "consent");
  const first = harness.scheduler.currentChapter("bud-demo-room");
  assert.equal(first.index, 1);
  assert.equal(first.summary_text, "Summary of 1 turns.", "the chapter carries the summary learners were shown");
  assert.equal(harness.calls.delivered[0].chapter.chapter_id, first.chapter_id, "delivery is told which chapter it is sending");

  await speak(harness.log, harness.scheduler, 600, "retention");
  assert.equal(harness.scheduler.currentChapter("bud-demo-room").index, 2, "each delivered check-in opens the next chapter");
  assert.equal(harness.scheduler.chapters("bud-demo-room").length, 2);
}

// An answer is evidence about the chapter it was given for. Once the room moves on,
// it must stop counting towards the current picture - but it stays in the history so
// the facilitator can still see which stretch of the session was hardest.
function testAnswersExpireWhenTheNextChapterOpens() {
  const chapters = [
    { chapter_id: "c1", room_name: "bud-demo-room", index: 1, label: "Check-in 1", summary_text: "The room covered consent." },
    { chapter_id: "c2", room_name: "bud-demo-room", index: 2, label: "Check-in 2", summary_text: "The room covered retention periods." }
  ];
  let live = 1;
  const scheduler = {
    currentChapter: function () { return chapters[live - 1]; },
    chapters: function () { return chapters.slice(0, live); }
  };
  const runtime = createBudRuntime();
  function answer(participantId, response) {
    const chapter = scheduler.currentChapter();
    runtime.handleEvent(baseEvent({
      event_id: "e-" + participantId + "-" + chapter.chapter_id + "-" + response,
      type: "comprehension_check_response",
      source: "web",
      privacy_scope: "private_participant_ai",
      actor: { actor_type: "participant", participant_id: participantId },
      payload: { checkin_id: chapter.chapter_id, recap_point_id: chapter.chapter_id, chapter: chapter, response: response }
    }));
  }

  answer("learner-1", "red");
  answer("learner-2", "red");
  const duringFirst = facilitatorState(runtime, scheduler, "bud-demo-room");
  assert.equal(duringFirst.current_chapter.flagged, 2);

  // The room moves on. Nobody has answered about the new material yet.
  live = 2;
  const duringSecond = facilitatorState(runtime, scheduler, "bud-demo-room");
  assert.equal(duringSecond.current_chapter.chapter_id, "c2");
  assert.equal(duringSecond.current_chapter.answered, 0, "answers about the previous chapter are not evidence about this one");
  assert.equal(duringSecond.current_chapter.flagged, 0);
  assert.equal(duringSecond.rollup.unknown, duringSecond.current_chapter.total, "everyone counts as not having answered yet");

  // The history survives, and names the material rather than an internal id.
  assert.equal(duringSecond.chapter_breakdown.length, 2);
  assert.equal(duringSecond.chapter_breakdown[0].flagged, 2);
  assert.equal(duringSecond.rollup.most_flagged_recap_point.indexOf("The room covered consent.") !== -1, true,
    duringSecond.rollup.most_flagged_recap_point);

  // Ranked by share of answers, so a small badly-stuck chapter outranks a large mildly-stuck one.
  answer("learner-1", "green");
  answer("learner-2", "green");
  answer("learner-3", "red");
  const ranked = facilitatorState(runtime, scheduler, "bud-demo-room");
  assert.equal(ranked.rollup.most_flagged_recap_point.indexOf("The room covered consent.") !== -1, true,
    "chapter 1 flagged 2 of 2; chapter 2 flagged 1 of 3");
}

// A learner gets one answer per chapter. Tapping the same answer again must not raise
// a second event, send a second private message, or move any number in the room report.
function testComprehensionResponsesAreStampedWithAChapter() {
  const server = createServer();
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    const room = { room_name: "bud-demo-room", role: "learner" };
    requestJson(port, "POST", "/api/topview/presence", Object.assign({ participant_id: "learner-1", display_name: "Ann" }, room), function () {
      requestJson(port, "POST", "/api/topview/presence", Object.assign({ participant_id: "learner-2", display_name: "Bo" }, room), function () {
        requestJson(port, "POST", "/api/comprehension-response", { participant_id: "learner-1", room_name: "bud-demo-room", response: "red" }, function (first) {
          assert.equal(first.result.decision_type, "HELP");
          requestJson(port, "POST", "/api/comprehension-response", { participant_id: "learner-1", room_name: "bud-demo-room", response: "red" }, function (repeat) {
            assert.equal(repeat.result.unchanged, true, "tapping the same answer again is a no-op");
            assert.equal(repeat.state.private_messages.length, first.state.private_messages.length, "a repeat tap must not send another message");
            requestJson(port, "POST", "/api/comprehension-response", { participant_id: "learner-2", room_name: "bud-demo-room", response: "green" }, function () {
              requestJson(port, "GET", "/api/facilitator/state?room=bud-demo-room", null, function (state) {
                assert.equal(state.current_chapter.answered, 2, "two learners answered");
                assert.equal(state.current_chapter.red, 1, "five taps from one learner is still one answer");
                assert.equal(state.current_chapter.flagged_share, 0.5);
                assert.equal(state.room_report.text.indexOf("2 of 2 answered") !== -1, true, state.room_report.text);
                requestJson(port, "POST", "/api/comprehension-response", { participant_id: "learner-1", room_name: "bud-demo-room", response: "green" }, function () {
                  requestJson(port, "GET", "/api/facilitator/state?room=bud-demo-room", null, function (after) {
                    assert.equal(after.current_chapter.red, 0, "changing your mind replaces your earlier answer");
                    assert.equal(after.current_chapter.green, 2);
                    assert.equal(after.rollup.most_flagged_recap_point, null, "with nothing flagged there is no hardest chapter");
                    server.close();
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

function testSentenceBufferHoldsFragmentsUntilSentenceEnds() {
  const buffer = createSentenceBuffer();
  const first = buffer.push("learner-1", "I think the main", 1000);
  assert.equal(first.ready, null, "a fragment with no full stop must not be translated yet");
  assert.equal(first.pending, "I think the main");

  const second = buffer.push("learner-1", "problem is cost.", 1500);
  assert.equal(second.ready, "I think the main problem is cost.", "fragments rejoin into one sentence");
  assert.equal(second.reason, "sentence");
  assert.equal(buffer.pending("learner-1"), "", "a released sentence leaves nothing behind");

  // Full-width punctuation counts too, or Chinese would never release on punctuation.
  assert.equal(buffer.push("learner-1", "我们开始吧。", 1600).ready, "我们开始吧。");
}

function testSentenceBufferKeepsAccumulatingWhileSpeechContinues() {
  // A sentence that takes longer to say than the idle gap must not be cut in half.
  // Releasing here translated a partial sentence and left the tail to contaminate
  // whatever was said next.
  const buffer = createSentenceBuffer({ idleReleaseMs: 3500 });
  buffer.push("learner-1", "the thing I keep coming back to", 1000);
  const middle = buffer.push("learner-1", "when we look at the numbers", 3500);
  assert.equal(middle.ready, null, "continuous speech keeps accumulating past the idle gap");
  const end = buffer.push("learner-1", "is that cost dominates.", 6000);
  assert.equal(
    end.ready,
    "the thing I keep coming back to when we look at the numbers is that cost dominates.",
    "the whole sentence is translated as one unit however long it took to say"
  );
}

function testSentenceBufferReleasesStrandedTextWithoutSwallowingNextSentence() {
  const buffer = createSentenceBuffer({ idleReleaseMs: 3500 });
  buffer.push("learner-1", "so that was the first idea", 1000);
  // Long gap: the held text was a finished thought that never got a full stop.
  const resumed = buffer.push("learner-1", "now for something else", 9000);
  assert.equal(resumed.ready, "so that was the first idea", "stranded text is released on its own");
  assert.equal(resumed.reason, "idle");
  assert.equal(resumed.pending, "now for something else", "the new sentence starts fresh, not glued to the old one");
  assert.equal(buffer.pending("learner-1"), "now for something else");
}

function testSentenceBufferReleasesOnLengthAndHardTimeout() {
  const long = createSentenceBuffer({ maxPendingChars: 40 });
  long.push("learner-1", "one two three four five six seven", 1000);
  const overflowed = long.push("learner-1", "eight nine ten", 1100);
  assert.equal(overflowed.reason, "length", "an over-long buffer releases rather than growing forever");

  // Speech that never pauses and never gets punctuated still has a ceiling.
  // Gaps stay under the idle threshold throughout, so only the ceiling can fire.
  const endless = createSentenceBuffer({ idleReleaseMs: 3500, maxPendingMs: 8000 });
  endless.push("learner-1", "and then", 1000);
  endless.push("learner-1", "and then", 3000);
  endless.push("learner-1", "and then", 5000);
  endless.push("learner-1", "and then", 7000);
  const capped = endless.push("learner-1", "and then", 9000);
  assert.equal(capped.reason, "timeout", "the hard ceiling still applies to unbroken speech");
}

function testSentenceBufferKeepsSpeakersApart() {
  const buffer = createSentenceBuffer();
  buffer.push("learner-1", "the cost of", 1000);
  buffer.push("learner-2", "a different thought", 1050);
  const released = buffer.push("learner-1", "the prototype matters.", 1100);
  assert.equal(released.ready, "the cost of the prototype matters.", "one speaker's words never join another's");
  assert.equal(buffer.pending("learner-2"), "a different thought");
}

function testSentenceBufferFlushReturnsTail() {
  const buffer = createSentenceBuffer();
  buffer.push("learner-1", "and that is roughly", 1000);
  const flushed = buffer.flush("learner-1");
  assert.equal(flushed.ready, "and that is roughly", "stopping mid-sentence still translates the tail");
  assert.equal(buffer.flush("learner-1").ready, null, "flushing an empty buffer is a no-op");
}

// A fake clock for the release timer, so these tests assert on scheduling rather than
// on real elapsed time.
function fakeTimers() {
  const scheduled = [];
  return {
    setTimer: function (fn, ms) {
      const entry = { fn: fn, ms: ms, cancelled: false };
      scheduled.push(entry);
      return entry;
    },
    clearTimer: function (entry) { entry.cancelled = true; },
    // Runs the one timer still outstanding, which is all this buffer ever keeps.
    fire: function () {
      const pending = scheduled.filter(function (entry) { return !entry.cancelled; });
      assert.equal(pending.length, 1, "exactly one release should be scheduled");
      pending[0].cancelled = true;
      pending[0].fn();
      return pending[0].ms;
    },
    pending: function () {
      return scheduled.filter(function (entry) { return !entry.cancelled; });
    }
  };
}

function testSentenceBufferReleasesOnSilenceWithoutAnotherFragment() {
  // The speaker trails off without a full stop and says nothing more. This used to sit
  // in the buffer indefinitely, because releases were only ever considered when the
  // NEXT fragment arrived — so their last words stayed off the caption panel until they
  // switched the microphone off.
  const clock = fakeTimers();
  const released = [];
  const buffer = createSentenceBuffer({
    idleReleaseMs: 1500,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onRelease: function (speakerId, text, reason) { released.push({ speakerId, text, reason }); }
  });

  const held = buffer.push("learner-1", "so that was the first idea", 5000, {
    speechStartedAt: 1000,
    speechEndedAt: 2000,
    sequence: 1
  });
  assert.equal(held.ready, null, "an unpunctuated fragment is still held at first");

  const waited = clock.fire();
  assert.equal(waited, 0, "the speaker fell silent before transcription finished, so no further wait is owed");
  assert.equal(released.length, 1, "silence alone releases the sentence");
  assert.equal(released[0].text, "so that was the first idea");
  assert.equal(buffer.pending("learner-1"), "", "a released sentence leaves nothing behind");
  buffer.stop();
}

function testSentenceBufferWaitsWhileAChunkIsStillBeingTranscribed() {
  // The speaker paused, then carried on. Their next words exist as audio but not yet as
  // text, so the buffer must not treat the gap as the end of the sentence.
  const clock = fakeTimers();
  const released = [];
  const buffer = createSentenceBuffer({
    idleReleaseMs: 1500,
    speakingSafetyMs: 12000,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onRelease: function (speakerId, text, reason) { released.push({ speakerId, text, reason }); }
  });

  buffer.push("learner-1", "the thing I keep coming back to", 5000, {
    speechStartedAt: 1000,
    speechEndedAt: 2000,
    sequence: 1
  });
  // The microphone hears them start again, seconds before that audio is transcribed.
  buffer.markSpeaking("learner-1", 2, 5100);
  const waited = clock.fire();
  assert.equal(waited, 12000, "while a chunk is in flight only the stall backstop is armed");
  assert.equal(released.length, 1, "the backstop still fires eventually rather than stranding the text");

  // And the ordinary case: the second chunk's transcript arrives and joins the first.
  const rejoined = createSentenceBuffer({ idleReleaseMs: 1500 });
  rejoined.push("learner-1", "the thing I keep coming back to", 5000, { speechStartedAt: 1000, speechEndedAt: 2000, sequence: 1 });
  const end = rejoined.push("learner-1", "is that cost dominates.", 9000, { speechStartedAt: 2400, speechEndedAt: 4000, sequence: 2 });
  assert.equal(
    end.ready,
    "the thing I keep coming back to is that cost dominates.",
    "a short pause mid-sentence keeps the sentence together"
  );
  buffer.stop();
}

function testSentenceBufferMeasuresPausesInSpeechTimeNotArrivalTime() {
  // Both fragments reach the server four seconds apart because transcription is slow,
  // but the speaker only paused for 400ms. Measuring arrival gaps would split the
  // sentence in two; measuring speech gaps keeps it whole.
  const buffer = createSentenceBuffer({ idleReleaseMs: 1500 });
  buffer.push("learner-1", "the cost of the prototype", 10000, { speechStartedAt: 1000, speechEndedAt: 2000, sequence: 1 });
  const joined = buffer.push("learner-1", "is what worries me", 14000, { speechStartedAt: 2400, speechEndedAt: 3500, sequence: 2 });
  assert.equal(joined.ready, null, "slow transcription must not read as the speaker stopping");
  assert.equal(joined.pending, "the cost of the prototype is what worries me");

  // A real pause of the same length in speech time does split them.
  const split = createSentenceBuffer({ idleReleaseMs: 1500 });
  split.push("learner-1", "the cost of the prototype", 10000, { speechStartedAt: 1000, speechEndedAt: 2000, sequence: 1 });
  const separate = split.push("learner-1", "anyway lets move on", 14000, { speechStartedAt: 4000, speechEndedAt: 5000, sequence: 2 });
  assert.equal(separate.ready, "the cost of the prototype", "a genuine pause still ends the thought");
  assert.equal(separate.reason, "idle");
}

function testTranscriptLogKeepsRoomSpeech() {
  const log = createTranscriptLog();
  log.record({
    room_name: "bud-demo-room",
    participant_id: "facilitator-1",
    display_name: "Teacher",
    role: "facilitator",
    original_text: "Start by naming the user goal.",
    original_language: "en",
    translated_text: "Empieza nombrando el objetivo del usuario.",
    target_language: "es",
    created_at: "2026-07-25T10:00:00.000Z"
  });
  log.record({ room_name: "bud-demo-room", participant_id: "learner-1", original_text: "", created_at: "2026-07-25T10:01:00.000Z" });

  const entries = log.recent("bud-demo-room", 10);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].role, "facilitator");

  const context = log.context("bud-demo-room", "what did the facilitator say?");
  assert.equal(context.text.indexOf("Teacher (facilitator)") !== -1, true);
  assert.equal(context.text.indexOf("Start by naming the user goal.") !== -1, true);
  assert.equal(context.text.indexOf("Empieza nombrando") !== -1, true);
  assert.equal(log.context("other-room", "anything").text, "");
}

function testTranscriptLogSurfacesOlderRelevantTurns() {
  const log = createTranscriptLog();
  log.record({
    room_name: "bud-demo-room",
    participant_id: "facilitator-1",
    display_name: "Teacher",
    role: "facilitator",
    original_text: "Evidence means a screenshot of the prototype in use.",
    original_language: "en",
    created_at: "2026-07-25T10:00:00.000Z"
  });
  for (let index = 1; index <= 10; index += 1) {
    log.record({
      room_name: "bud-demo-room",
      participant_id: "learner-2",
      display_name: "Ana",
      role: "learner",
      original_text: "Filler turn number " + index + ".",
      original_language: "en",
      created_at: "2026-07-25T10:0" + index + ":00.000Z"
    });
  }

  const recentOnly = log.context("bud-demo-room", "how is everyone doing?");
  assert.equal(recentOnly.text.indexOf("Evidence means") === -1, true);

  const searched = log.context("bud-demo-room", "what counts as evidence?");
  assert.equal(searched.text.indexOf("Evidence means") !== -1, true);
  // Keyword matches are woven back into chronological order, oldest first.
  assert.equal(searched.text.indexOf("Evidence means") < searched.text.indexOf("Filler turn number 10"), true);
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
          requestJson(port, "GET", "/api/transcript?room=bud-demo-room", null, function (transcriptPayload) {
            assert.equal(transcriptPayload.room_name, "bud-demo-room");
            assert.equal(Array.isArray(transcriptPayload.entries), true);
            server.close(done);
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

run().catch(function (error) {
  console.error(error);
  process.exit(1);
});
