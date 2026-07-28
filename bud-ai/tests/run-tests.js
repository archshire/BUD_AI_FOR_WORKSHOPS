const assert = require("assert");
const { createBudRuntime } = require("../apps/server/src/runtime");
const { createInMemoryStateStore } = require("../apps/server/src/state/in-memory-state-store");
const { executeDecisionTools } = require("../apps/server/src/tools/tool-executor");
const { createServer, checkinRecipients, asksCurrentLesson, llmProvider, llmProviderLabel, normalizeLearnerReasoningText, normalizeChineseBudReply } = require("../apps/server/src/index");
const { createTranscriptLog } = require("../apps/server/src/transcript/transcript-log");
const { createSentenceBuffer } = require("../apps/server/src/transcript/sentence-buffer");
const { cleanTranscript } = require("../apps/server/src/providers/transcript-hygiene");
const { groqSttConfigured, groqSttModel } = require("../apps/server/src/providers/groq-stt");
const { llmTranslateBackend, llmTranslateConfigured, cleanTranslation } = require("../apps/server/src/providers/llm-translate");
const { createCheckinScheduler, parseVerdict } = require("../apps/server/src/checkin/checkin-scheduler");
const { createContextualMemoryLedger } = require("../apps/server/src/contextual-memory-ledger");
const { createBudCognition } = require("../apps/server/src/bud-cognition");
const { createBudMemoryStore } = require("../apps/server/src/bud-memory");
const { createSourcePackStore } = require("../apps/server/src/source-pack");
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
  testCategorizedSourcePackBoundaries();
  testLongMarkdownGrounding();
  testLeaderResponseBrief();
  testLearnerResponseBrief();
  testCurrentLessonIntentBoundary();
  testChineseReasoningAliases();
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
  testBudLlmProviderConfiguration();
  testLlmTranslationConfiguration();
  testLlmTranslationCleansModelWrappers();
  testCheckinSchedulerTracksSpeechWithoutImmediateInterruption();
  testCheckinRecipientScoping();
  testLearnerCheckinRendering();
  testWorkshopAudioAndCaptionWiring();
  testRootProblemDefinition(function () {
    testLearnerNativeLanguageApi(function () {
      testLeaderNameRouting(function () {
        testLeaderBreakoutAssignmentFollowup(function () {
          testLearnerNextStepAndUncertainty(function () {
            testBreakoutServerEnforcesAssignment(function () {
              testChatVisibilityAndLeaderContext(function () {
                testLearnerServerApi(function () {
                  console.log("All Bud AI scaffold tests passed.");
                });
              });
            });
          });
        });
      });
    });
  });
}

function testRootProblemDefinition(done) {
  const server = createServer();
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "POST", "/api/private-message", {
      room_name: "BUD-ROOT-PROBLEM",
      participant_id: "learner-root-problem",
      display_name: "Root Problem Learner",
      native_language: "en",
      text: "What does the root of the problem mean?"
    }, function (payload) {
      const answer = payload.state.private_messages.slice(-1)[0];
      assert.equal(answer.provider, "learner-root-problem-definition");
      assert.equal(
        answer.text,
        "It means the **fundamental, underlying cause** of a situation or trouble, rather than just the visible signs or surface symptoms."
      );
      requestJson(port, "POST", "/api/private-message", {
        room_name: "BUD-ROOT-PROBLEM",
        participant_id: "learner-root-problem-zh",
        display_name: "Root Problem Learner ZH",
        native_language: "zh",
        text: "“问题的根”是什么意思？"
      }, function (chinesePayload) {
        const chineseAnswer = chinesePayload.state.private_messages.slice(-1)[0];
        assert.equal(chineseAnswer.provider, "learner-root-problem-definition");
        assert.equal(chineseAnswer.language, "zh");
        assert.equal(
          chineseAnswer.text,
          "“问题的根”或“问题的根源”指的是造成问题的根本原因，也就是藏在表面现象下面、真正让问题发生的原因；不是只看表面的症状。"
        );
        server.close(done);
      });
    });
  });
}

function testWorkshopAudioAndCaptionWiring() {
  const fs = require("fs");
  const path = require("path");
  const appRoot = path.resolve(__dirname, "../apps/web/src/app");
  const serverSource = fs.readFileSync(path.resolve(__dirname, "../apps/server/src/index.js"), "utf8");
  const leader = fs.readFileSync(path.join(appRoot, "leader.js"), "utf8");
  const leaderHtml = fs.readFileSync(path.join(appRoot, "leader.html"), "utf8");
  const leaderCss = fs.readFileSync(path.join(appRoot, "leader.css"), "utf8");
  const learner = fs.readFileSync(path.join(appRoot, "learner.js"), "utf8");
  const learnerApp = fs.readFileSync(path.join(appRoot, "app.js"), "utf8");
  const learnerHtml = fs.readFileSync(path.join(appRoot, "learner.html"), "utf8");
  const learnerCss = fs.readFileSync(path.join(appRoot, "styles.css"), "utf8");

  assert.equal(leaderHtml.indexOf('class="leader-bud-panel" hidden') !== -1, true);
  assert.equal(/\.leader-bud-panel\[hidden\]\s*\{\s*display:\s*none;\s*\}/.test(leaderCss), true);
  assert.equal(leader.indexOf("leaderBudPanel.hidden = false;") !== -1, true);
  assert.equal(/class="leader-sidebar"[\s\S]*<\/nav>\s*<aside id="leader-bud-panel"[\s\S]*<\/aside>\s*<\/div>/.test(leaderHtml), true);
  assert.equal(/\.leader-sidebar\s*\{[^}]*gap:\s*9px/.test(leaderCss), true);
  const setupTabIndex = leaderHtml.indexOf('href="#setup"');
  const planTabIndex = leaderHtml.indexOf('href="#plan-view"');
  const roomsTabIndex = leaderHtml.indexOf('href="#rooms"');
  const workshopTabIndex = leaderHtml.indexOf('href="#source-pack"');
  assert.equal(setupTabIndex < planTabIndex && planTabIndex < roomsTabIndex && roomsTabIndex < workshopTabIndex, true);
  assert.equal(leaderHtml.indexOf('class="is-locked" href="#plan-view" aria-disabled="true"') !== -1, true);
  assert.equal(leaderHtml.indexOf('class="is-locked" href="#rooms" aria-disabled="true"') !== -1, true);
  assert.equal(leaderHtml.indexOf('class="is-locked" href="#launch-bud" aria-disabled="true"') !== -1, true);
  assert.equal(leader.indexOf("let planGenerationComplete = false") !== -1, true);
  assert.equal(leader.indexOf("let planLockComplete = false") !== -1, true);
  assert.equal(leader.indexOf("const hasGeneratedPlan = planGenerationComplete") !== -1, true);
  assert.equal(leader.indexOf("const planLocked = planLockComplete") !== -1, true);
  assert.equal(leader.indexOf("planGenerationComplete = true") !== -1, true);
  assert.equal(leader.indexOf("planLockComplete = true") !== -1, true);
  assert.equal(leader.indexOf('"plan-view": !hasGeneratedPlan') !== -1, true);
  assert.equal(leader.indexOf("rooms: !planLocked") !== -1, true);
  assert.equal(leader.indexOf('"launch-bud": !roomPrepared') !== -1, true);
  assert.equal(leader.indexOf('"source-pack": !leaderBudLaunched') !== -1, true);
  assert.equal(leader.indexOf("insights: !workshopComplete") !== -1, true);
  assert.equal(leaderHtml.indexOf('id="room-caption-list"') !== -1, true);
  assert.equal(leaderHtml.indexOf('id="room-talk"') !== -1, true);
  assert.equal(leader.indexOf("localParticipant.setMicrophoneEnabled(true)") !== -1, true);
  assert.equal(leader.indexOf("localParticipant.setMicrophoneEnabled(false)") !== -1, true);
  assert.equal(leader.indexOf('"X-Group-Id": "group-main"') !== -1, true);
  assert.equal(leader.indexOf("attachBreakoutCaptionFeed(groupId") !== -1, true);
  assert.equal(leader.indexOf("&participant_id=facilitator-1&scope=public&target=") !== -1, true);
  assert.equal(leader.indexOf("message.translated_text") !== -1, true);
  assert.equal(leader.indexOf("translated.textContent = message.translated_text") !== -1, true);
  assert.equal(learner.indexOf("ensureWorkshopAudioConnected();") !== -1, true);
  assert.equal(learner.indexOf("getGroupId: function () { return breakoutGroupId; }") !== -1, true);
  ["en", "es", "zh", "my", "fr", "th", "ms"].forEach(function (language) {
    const option = '<option value="' + language + '">';
    assert.equal(learnerHtml.split(option).length - 1 >= 2, true);
  });
  assert.equal(learnerApp.indexOf("native_language: elements.nativeLanguageInput.value") !== -1, true);
  assert.equal(learner.indexOf("&scope=group&target=") !== -1, true);
  assert.equal(learner.indexOf("item.translated_text") !== -1, true);
  assert.equal(learner.indexOf("translated.textContent = item.translated_text") !== -1, true);
  assert.equal(learner.indexOf("bud-learner-native-language-") !== -1, true);
  assert.equal(learner.indexOf('if (language === "zh")') !== -1, true);
  assert.equal(learnerApp.indexOf('"&target=" + encodeURIComponent(selectedNativeLanguage())') !== -1, true);
  assert.equal(learnerApp.indexOf("function renderLocalizedState") !== -1, true);
  assert.equal(leader.indexOf("roomNameInput.addEventListener(\"change\", resetLeaderSourcePack)") === -1, true);
  assert.equal(/\nresetLeaderSourcePack\(\);\n/.test(leader), false);
  assert.equal(leader.indexOf("new_workshop: true") !== -1, true);
  assert.equal(leader.indexOf("body: JSON.stringify({ room_name: roomName, new_workshop: true })") !== -1, true);
  assert.equal(leader.indexOf("let sourcePackPreparedForSession = false") !== -1, true);
  assert.equal(leader.indexOf("prepareSourcePackForUpload()") !== -1, true);
  assert.equal(leader.indexOf("sourcePackPreparedForSession = true") !== -1, true);
  assert.equal(leader.indexOf('stage.className = "leader-rendered-document-stage"') !== -1, true);
  assert.equal(leader.indexOf('slide.className = "leader-rendered-document-slide"') !== -1, true);
  assert.equal(leader.indexOf("page.rendered_slide_url") !== -1, true);
  assert.equal(learnerApp.indexOf('stage.className = "rendered-document-stage"') !== -1, true);
  assert.equal(learnerApp.indexOf('slide.className = "rendered-document-slide"') !== -1, true);
  assert.equal(learnerApp.indexOf("page.rendered_slide_url") !== -1, true);
  assert.equal(leaderCss.indexOf("object-fit: contain") !== -1, true);
  assert.equal(learnerCss.indexOf("object-fit: contain") !== -1, true);
  const learnerChapterRenderer = learnerApp.slice(
    learnerApp.indexOf("function renderLearningPlanTasks"),
    learnerApp.indexOf("function taskResponseId")
  );
  assert.equal(learnerChapterRenderer.indexOf("Comprehension check:") === -1, true);
  const generationHandler = leader.slice(
    leader.indexOf('generatePlanButton.addEventListener("click"'),
    leader.indexOf("function requestPlanLock")
  );
  assert.equal(generationHandler.indexOf("planTab.click()") === -1, true);
  assert.equal(leader.indexOf('let pendingField = ""') !== -1, true);
  assert.equal(leader.indexOf('target[pendingField] += (target[pendingField] ? "\\n" : "") + value') !== -1, true);
  assert.equal(serverSource.indexOf("Create exactly 4 numbered chapters") !== -1, true);
  assert.equal(serverSource.indexOf("Create exactly 4 practical learner-centred chapters") !== -1, true);
  assert.equal(serverSource.indexOf("structured_output: true") !== -1, true);
  assert.equal(serverSource.indexOf("Follow the requested output structure exactly") !== -1, true);
  const parserSource = leader.slice(
    leader.indexOf("function plainWorkshopPlanValue"),
    leader.indexOf("function serializeWorkshopPlanCards")
  );
  const parseWorkshopPlan = new Function("plan", parserSource + "\nreturn parseWorkshopPlanCards(plan);");
  const chapterCards = parseWorkshopPlan([
    "Chapter 1: Define the problem",
    "Learner task: Identify the underlying need.",
    "Comprehension check: What need does the prototype address?",
    "## Chapter 2 - Test the prototype",
    "Learner task: Evaluate speed and accessibility.",
    "Comprehension check: Which usability factor matters most?",
    "3) Improve the design",
    "Learner task: Apply the strongest test insight.",
    "Comprehension check: What evidence supports the change?"
  ].join("\n"));
  assert.equal(chapterCards.length, 3);
  assert.equal(chapterCards[0].title, "Define the problem");
  assert.equal(chapterCards[1].title, "Test the prototype");
  assert.equal(chapterCards[2].title, "Improve the design");
  const bareNumberCards = parseWorkshopPlan([
    "1",
    "Learner task: Design a real-time multilingual prototype.",
    "Comprehension check: What requirements must the prototype meet?",
    "2",
    "Learner task: Create a multilingual chat interface.",
    "Comprehension check: How does the interface improve communication?",
    "3",
    "Learner task: Develop a real-time translation tool.",
    "Comprehension check: What benefit does translation provide?"
  ].join("\n"));
  assert.equal(bareNumberCards.length, 3);
  assert.equal(bareNumberCards[0].title, "Chapter 1");
  assert.equal(bareNumberCards[1].comprehensionCheck, "How does the interface improve communication?");
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

function testCategorizedSourcePackBoundaries() {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bud-source-category-test-"));
  const roomName = "BUD-CATEGORY";
  const roomRoot = path.join(root, roomName);
  const versionRoot = path.join(roomRoot, "version-1");
  fs.mkdirSync(versionRoot, { recursive: true });

  const materials = [
    { material_id: "slide-material", filename: "slides.pdf", material_role: "slides", text: "Visible learner slide", rendered_ref: "BUD-CATEGORY/version-1/slide-material.pdf" },
    { material_id: "curriculum-material", filename: "curriculum.docx", material_role: "curriculum", text: "Learning goal and learner task" },
    { material_id: "notes-material", filename: "notes.pdf", material_role: "teaching_notes", text: "Detailed teaching explanation" },
    { material_id: "legacy-material", filename: "legacy.pdf", text: "Uncategorized legacy content" }
  ].map(function (material) {
    const extractionRef = path.join("BUD-CATEGORY", "version-1", material.material_id + ".json");
    fs.writeFileSync(path.join(root, extractionRef), JSON.stringify({
      chunks: [{ location: "page 1", text: material.text }]
    }));
    return {
      material_id: material.material_id,
      filename: material.filename,
      material_role: material.material_role,
      media_type: "pdf",
      extracted_text_ref: extractionRef,
      rendered_ref: material.rendered_ref || null,
      rendered_media_type: material.rendered_ref ? "pdf" : null,
      source_location_refs: ["page 1"],
      chunk_count: 1
    };
  });
  fs.writeFileSync(path.join(versionRoot, "slide-material.pdf"), "%PDF-1.4 preview");

  fs.writeFileSync(path.join(roomRoot, "manifest.json"), JSON.stringify({
    room_name: roomName,
    active_version: 1,
    versions: [{
      source_pack_id: "source-pack-" + roomName,
      workshop_id: roomName,
      version: 1,
      status: "active",
      uploaded_by: "leader-test",
      uploaded_at: new Date().toISOString(),
      materials: materials
    }],
    learning_plan_draft: "",
    learning_plan: "1. Goal\nTask: Complete the curriculum task"
  }));

  const store = createSourcePackStore(root);
  const learnerMaterial = store.pages(roomName);
  assert.equal(learnerMaterial.pages.length, 1);
  assert.equal(learnerMaterial.pages[0].filename, "slides.pdf");
  assert.equal(learnerMaterial.pages[0].material_role, "slides");
  assert.equal(learnerMaterial.pages[0].rendered_url.indexOf("/api/workshop-asset?") === 0, true);
  assert.equal(learnerMaterial.pages[0].rendered_slide_url.indexOf("/api/workshop-slide?") === 0, true);
  assert.equal(learnerMaterial.pages[0].rendered_page, 1);
  assert.equal(store.renderedAsset(roomName, "slide-material").content_type, "application/pdf");

  const curriculum = store.context(roomName, "learning goal task", { roles: ["curriculum"], all_chunks: true });
  assert.equal(curriculum.text.indexOf("Learning goal and learner task") !== -1, true);
  assert.equal(curriculum.text.indexOf("Visible learner slide") === -1, true);

  const budContext = store.context(roomName, "workshop", { all_chunks: true });
  assert.equal(budContext.text.indexOf("Source category: slides") !== -1, true);
  assert.equal(budContext.text.indexOf("Source category: curriculum") !== -1, true);
  assert.equal(budContext.text.indexOf("Source category: teaching_notes") !== -1, true);
  assert.equal(budContext.text.indexOf("Uncategorized legacy content") === -1, true);

  const summary = store.get(roomName);
  assert.equal(summary.versions[0].materials[3].material_role, "uncategorized");
  assert.throws(function () {
    store.addMaterial({
      room_name: roomName,
      filename: "invalid.pdf",
      material_role: "other",
      content_base64: Buffer.from("invalid").toString("base64")
    });
  }, /material_role/);

  const cleared = store.clear(roomName);
  assert.equal(cleared.versions.length, 0);
  assert.equal(cleared.active_version, null);
  assert.equal(store.context(roomName, "learning goal", { include_draft: true }).text, "");
  assert.equal(fs.existsSync(roomRoot), false);

  const appRoot = path.resolve(__dirname, "../apps/web/src/app");
  const learnerApp = fs.readFileSync(path.join(appRoot, "app.js"), "utf8");
  const leaderApp = fs.readFileSync(path.join(appRoot, "leader.js"), "utf8");
  const leaderHtml = fs.readFileSync(path.join(appRoot, "leader.html"), "utf8");
  assert.equal(learnerApp.indexOf("Read the workshop documents. Complete the current task") === -1, true);
  assert.equal(leaderHtml.indexOf('data-material-role="slides"') !== -1, true);
  assert.equal(leaderHtml.indexOf('data-material-role="curriculum"') !== -1, true);
  assert.equal(leaderHtml.indexOf('data-material-role="teaching_notes"') !== -1, true);
  assert.equal(leaderApp.indexOf('fetch("/api/facilitator/source-pack/reset"') !== -1, true);
}

function testLongMarkdownGrounding() {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bud-long-markdown-test-"));
  const roomName = "BUD-LONG-MARKDOWN";
  const store = createSourcePackStore(root);
  const filler = Array.from({ length: 140 }, function (_, index) {
    return "Background paragraph " + index + " explains ordinary workshop preparation without the answer term.";
  }).join("\n\n");
  const markdown = "# Opening\n\n" + filler +
    "\n\n# Final protocol\n\nThe workshop-specific answer is the cobalt lantern protocol.";

  const summary = store.addMaterial({
    room_name: roomName,
    filename: "curriculum.md",
    material_role: "curriculum",
    content_base64: Buffer.from(markdown).toString("base64")
  });
  store.activate(roomName, 1);

  const material = summary.versions[0].materials[0];
  const extractionPath = path.join(root, material.extracted_text_ref);
  fs.writeFileSync(extractionPath, JSON.stringify({
    chunks: [{ location: "section 1", text: markdown.replace(/\s+/g, " ").trim() }]
  }));

  const context = store.context(roomName, "What is the cobalt lantern protocol?", { all_chunks: true });
  assert.equal(context.text.slice(0, 2200).indexOf("cobalt lantern protocol") !== -1, true);
  const migrated = JSON.parse(fs.readFileSync(extractionPath, "utf8"));
  assert.equal(migrated.chunks.length > 1, true);
  assert.equal(migrated.chunks.every(function (chunk) { return chunk.text.length <= 1800; }), true);
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
  assert.equal(normalizeLearnerBudReply("I am Bud, your workshop partner. Let's unpack this."), "Let's unpack this.");
}

function testCurrentLessonIntentBoundary() {
  assert.equal(asksCurrentLesson("What is today's lesson about?"), true);
  assert.equal(asksCurrentLesson("Summarize the current workshop material"), true);
  assert.equal(asksCurrentLesson("If the workshop is short on time, what can I trim?"), false);
  assert.equal(asksCurrentLesson("What must I not cut from this workshop?"), false);
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

function testBudLlmProviderConfiguration() {
  const originalProvider = process.env.LLM_PROVIDER;

  delete process.env.LLM_PROVIDER;
  assert.equal(llmProvider(), "qwen");
  assert.equal(llmProviderLabel(), "Qwen");

  process.env.LLM_PROVIDER = "openai";
  assert.equal(llmProvider(), "openai");
  assert.equal(llmProviderLabel(), "OpenAI");

  process.env.LLM_PROVIDER = "dev";
  assert.equal(llmProvider(), "qwen");

  if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = originalProvider;
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

function testCheckinRecipientScoping() {
  const diagnostics = {
    connections: {
      "facilitator-1": {
        participant_id: "facilitator-1",
        role: "facilitator",
        room_name: "BUD-101"
      },
      "learner-1": {
        participant_id: "learner-1",
        role: "learner",
        room_name: "BUD-101",
        language: "en"
      },
      "learner-2": {
        participant_id: "learner-2",
        role: "learner",
        room_name: "BUD-101",
        language: "fr"
      },
      "learner-other": {
        participant_id: "learner-other",
        role: "learner",
        room_name: "OTHER"
      }
    }
  };
  const roomDirectory = {
    rooms: {
      "BUD-101": {
        room_name: "BUD-101",
        breakout_assignments: [
          { group_id: "breakout-room-1", members: [{ participant_id: "learner-1" }] },
          { group_id: "breakout-room-2", members: [{ participant_id: "learner-2" }] }
        ]
      }
    }
  };

  assert.deepEqual(checkinRecipients(diagnostics, roomDirectory, "BUD-101").map(function (learner) {
    return learner.participant_id;
  }), ["learner-1", "learner-2"]);
  assert.deepEqual(checkinRecipients(diagnostics, roomDirectory, "BUD-101::breakout-room-1").map(function (learner) {
    return learner.participant_id;
  }), ["learner-1"]);
  assert.deepEqual(checkinRecipients(diagnostics, roomDirectory, "BUD-101::breakout-room-3"), []);
}

function testLearnerCheckinRendering() {
  const fs = require("fs");
  const path = require("path");
  const appRoot = path.resolve(__dirname, "../apps/web/src/app");
  const learnerApp = fs.readFileSync(path.join(appRoot, "app.js"), "utf8");
  const learnerHtml = fs.readFileSync(path.join(appRoot, "learner.html"), "utf8");
  const server = fs.readFileSync(path.resolve(__dirname, "../apps/server/src/index.js"), "utf8");

  assert.equal(learnerHtml.indexOf('id="learner-bud-panel"') !== -1, true);
  assert.equal(learnerApp.indexOf('message.message_type === "periodic_summary"') !== -1, true);
  assert.equal(learnerApp.indexOf("Check-in summary") !== -1, true);
  assert.equal(learnerApp.indexOf("message-checkin") !== -1, true);
  assert.equal(server.indexOf("Do not ask the learner to respond or self-report.") !== -1, true);
  assert.equal(server.indexOf('normalizeLanguage(stateUrl.searchParams.get("target"))') !== -1, true);
  assert.equal(server.indexOf('stateUrl.searchParams.get("display_name")') !== -1, true);
  assert.equal(server.indexOf("localizeBudState(learnerState(runtime, participantId, roomName, displayName), targetLanguage") !== -1, true);
}

function testLearnerNativeLanguageApi(done) {
  const fs = require("fs");
  const http = require("http");
  const os = require("os");
  const path = require("path");
  const previousHost = process.env.TRANSLATION_HOST;
  const previousPort = process.env.TRANSLATION_PORT;
  const roomDirectoryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bud-native-language-test-")), "rooms.json");
  const translationServer = http.createServer(function (req, res) {
    let body = "";
    req.on("data", function (chunk) { body += chunk; });
    req.on("end", function () {
      const input = JSON.parse(body || "{}");
      const translatedText = input.source_language === "zh" && input.target_language === "en"
        ? "Who are you?"
        : "不应调用此翻译";
      const payload = Buffer.from(JSON.stringify({
        translated_text: translatedText,
        source_language: input.source_language,
        target_language: input.target_language,
        provider: "test-translator"
      }));
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": payload.length
      });
      res.end(payload);
    });
  });

  function restoreEnvironment() {
    if (previousHost === undefined) delete process.env.TRANSLATION_HOST;
    else process.env.TRANSLATION_HOST = previousHost;
    if (previousPort === undefined) delete process.env.TRANSLATION_PORT;
    else process.env.TRANSLATION_PORT = previousPort;
  }

  translationServer.listen(0, "127.0.0.1", function () {
    process.env.TRANSLATION_HOST = "127.0.0.1";
    process.env.TRANSLATION_PORT = String(translationServer.address().port);
    const server = createServer({ room_directory_file: roomDirectoryFile });
    server.listen(0, "127.0.0.1", function () {
      const port = server.address().port;
      requestJson(port, "POST", "/api/private-message", {
        room_name: "BUD-NATIVE-LANGUAGE",
        participant_id: "learner-chinese",
        display_name: "小安",
        native_language: "zh",
        text: "你是谁？"
      }, function (payload) {
        const learnerMessage = payload.state.private_messages.find(function (message) {
          return message.sender === "learner";
        });
        const budMessage = payload.state.private_messages.slice(-1)[0];
        assert.equal(learnerMessage.text, "你是谁？");
        assert.equal(learnerMessage.language, "zh");
        assert.equal(budMessage.provider, "bud-identity");
        assert.equal(budMessage.language, "zh");
        assert.equal(budMessage.text.indexOf("我是你的 Learner Bud") === 0, true);
        requestJson(port, "GET", "/api/state?room=BUD-NATIVE-LANGUAGE&participant_id=learner-chinese&target=zh", null, function (polledState) {
          const polledBudMessage = polledState.private_messages.slice(-1)[0];
          assert.equal(polledBudMessage.language, "zh");
          assert.equal(polledBudMessage.text.indexOf("我是你的 Learner Bud") === 0, true);
          server.close(function () {
            translationServer.close(function () {
              restoreEnvironment();
              done();
            });
          });
        });
      });
    });
  });
}

function testChineseReasoningAliases() {
  assert.equal(
    normalizeLearnerReasoningText("What happens if the coordinator refuses permission?", "zh"),
    "What happens if the facilitator refuses permission?"
  );
  assert.equal(
    normalizeLearnerReasoningText("What did the coordinators request?", "zh"),
    "What did the facilitators request?"
  );
  assert.equal(
    normalizeLearnerReasoningText("What did the coordinator request?", "en"),
    "What did the coordinator request?"
  );
  assert.equal(
    normalizeChineseBudReply('主持人：如果参与者拒绝 facilitator 的请求，"no is final"。'),
    "如果参与者拒绝主持人的请求，“拒绝即为最终决定”。"
  );
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
        text: "how many participnats are tehre",
        attendance_context: {
          registered_present: 11,
          registered_absent: 3,
          guests_present: 6
        }
      }, function (attendanceTypo) {
        const typoAnswer = attendanceTypo.state.facil_bud_messages.slice(-1)[0];
        assert.equal(typoAnswer.provider, "attendance-context");
        assert.equal(typoAnswer.text.indexOf("17 learners present") !== -1, true);
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
                  requestJson(port, "GET", "/api/transcript?room=BUD-101", null, function (transcriptPayload) {
                    assert.equal(transcriptPayload.room_name, "BUD-101");
                    assert.equal(Array.isArray(transcriptPayload.entries), true);
                    requestJson(port, "GET", "/api/transcript/live?room=BUD-101&after_sequence=0", null, function (livePayload) {
                      assert.equal(livePayload.room_name, "BUD-101");
                      assert.equal(Array.isArray(livePayload.entries), true);
                      assert.equal(typeof livePayload.latest_sequence, "number");
                      requestJson(port, "POST", "/api/group-message", {
                        room_name: "BUD-101",
                        participant_id: "learner-1",
                        sender_display_name: "Learner One",
                        group_id: "group-main",
                        text: "Hello workshop",
                        language: "en"
                      }, function (messagePayload) {
                        assert.equal(messagePayload.event.privacy_scope, "public_shared");
                        requestJson(port, "GET", "/api/group-messages?room=BUD-101&target=en&scope=public", null, function (messagesPayload) {
                          assert.equal(messagesPayload.room_name, "BUD-101");
                          assert.equal(messagesPayload.scope, "public");
                          assert.equal(messagesPayload.target_language, "en");
                          assert.equal(messagesPayload.messages.length >= 1, true);
                          const lastMessage = messagesPayload.messages[messagesPayload.messages.length - 1];
                          assert.equal(lastMessage.display_name, "Learner One");
                          assert.equal(lastMessage.original_text, "Hello workshop");
                          assert.equal(lastMessage.translated_text, null);
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
      requestJson(port, "POST", "/api/facilitator-message", {
        room_name: "BUD-101",
        leader_name: "Daniel Yeo",
        text: "asdfsdf"
      }, function (unintelligible) {
        const clarify = unintelligible.state.facil_bud_messages.slice(-1)[0];
        assert.equal(clarify.provider, "intelligibility-guard");
        assert.equal(clarify.text, "I'm sorry, I don't understand. Could you say that again?");
        requestJson(port, "POST", "/api/topview/presence", {
          room_name: "BUD-101",
          participant_id: "learner-zh",
          display_name: "Mei",
          role: "learner",
          language: "zh",
          connected: true
        }, function () {
          requestJson(port, "POST", "/api/topview/presence", {
            room_name: "BUD-101",
            participant_id: "learner-en",
            display_name: "Aisha",
            role: "learner",
            language: "en",
            connected: true
          }, function () {
            requestJson(port, "POST", "/api/facilitator-message", {
              room_name: "BUD-101",
              leader_name: "Daniel Yeo",
              text: "Are there any students speaking Chinese?"
            }, function (languagePayload) {
              const languageAnswer = languagePayload.state.facil_bud_messages.slice(-1)[0];
              assert.equal(languageAnswer.provider, "learner-language-context");
              assert.equal(languageAnswer.text.indexOf("Mei") !== -1, true);
              assert.equal(languageAnswer.text.indexOf("Chinese selected") !== -1, true);
              server.close(done);
            });
          });
        });
      });
    });
  });
}

function testLeaderBreakoutAssignmentFollowup(done) {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const roomName = "BUD-BREAKOUT-FOLLOWUP";
  const roomDirectoryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bud-breakout-followup-test-")), "rooms.json");
  fs.writeFileSync(roomDirectoryFile, JSON.stringify({
    rooms: {
      [roomName]: {
        room_name: roomName,
        ready: true,
        allocations: {},
        breakout_assignments: [
          { group_id: "breakout-room-2", members: [{ participant_id: "learner-tricia", display_name: "Tricia" }] }
        ]
      }
    }
  }));
  const server = createServer({ room_directory_file: roomDirectoryFile });
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "POST", "/api/facilitator-message", {
      room_name: roomName,
      text: "Is Tricia in the workshop?",
      attendance_context: {
        registered_present: 1,
        registered_absent: 0,
        guests_present: 0,
        registered_present_names: ["Tricia"]
      }
    }, function () {
      requestJson(port, "POST", "/api/facilitator-message", {
        room_name: roomName,
        text: "Yes, which breakout room?"
      }, function (payload) {
        const answer = payload.state.facil_bud_messages.slice(-1)[0];
        assert.equal(answer.provider, "breakout-allocation-context");
        assert.equal(answer.text, "Tricia is assigned to breakout room 2.");
        server.close(done);
      });
    });
  });
}

function testLearnerNextStepAndUncertainty(done) {
  const server = createServer();
  server.listen(0, "127.0.0.1", function () {
    const port = server.address().port;
    requestJson(port, "POST", "/api/private-message", {
      room_name: "BUD-101",
      participant_id: "learner-tricia",
      display_name: "Tricia",
      text: "What do I do next? Where is Jack?"
    }, function (nextStep) {
      const nextAnswer = nextStep.state.private_messages.slice(-1)[0];
      assert.equal(nextAnswer.provider, "learner-next-step-context");
      assert.equal(nextAnswer.text.indexOf("I do not have a live location for Jack") !== -1, true);
      requestJson(port, "POST", "/api/private-message", {
        room_name: "BUD-101",
        participant_id: "learner-tricia",
        display_name: "Tricia",
        text: "I really don't know?"
      }, function (uncertainty) {
        const uncertaintyAnswer = uncertainty.state.private_messages.slice(-1)[0];
        assert.equal(uncertaintyAnswer.provider, "learner-uncertainty-context");
        assert.equal(uncertaintyAnswer.text.indexOf("That is okay.") === 0, true);
        requestJson(port, "POST", "/api/private-message", {
          room_name: "BUD-101",
          participant_id: "learner-tricia",
          display_name: "Tricia",
          text: "What is the weather tomorrow?"
        }, function (unsupported) {
          const unsupportedAnswer = unsupported.state.private_messages.slice(-1)[0];
          assert.equal(unsupportedAnswer.provider, "learner-off-task-boundary");
          requestJson(port, "POST", "/api/private-message", {
            room_name: "BUD-101",
            participant_id: "learner-tricia",
            display_name: "Tricia",
            text: "I am going to beat up the other team"
          }, function (safety) {
            const safetyAnswer = safety.state.private_messages.slice(-1)[0];
            assert.equal(safetyAnswer.provider, "learner-safety-support");
            server.close(done);
          });
        });
      });
    });
  });
}

function testBreakoutServerEnforcesAssignment(done) {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const roomName = "BUD-BREAKOUT-ENFORCEMENT";
  const roomDirectoryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bud-breakout-enforcement-test-")), "rooms.json");
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
      participant_id: "learner-alice",
      sender_display_name: "Alice",
      group_id: "breakout-room-2",
      text: "This must stay in Alice's assigned room."
    }, function (sent) {
      assert.equal(sent.state.group_messages.length, 1);
      assert.equal(sent.state.group_messages[0].target_id, "breakout-room-1");
      requestJson(port, "POST", "/api/group-message", {
        room_name: roomName,
        participant_id: "guest-alice-refreshed",
        sender_display_name: "Alice",
        group_id: "breakout-room-1",
        text: "This refreshed guest ID should still use Alice's assigned room."
      }, function (refreshedGuest) {
        assert.equal(refreshedGuest.state.group_messages.length, 2);
        assert.equal(refreshedGuest.state.group_messages[1].target_id, "breakout-room-1");
        requestJson(port, "GET", "/api/group-messages?participant_id=guest-alice-refreshed&display_name=Alice&room=" + roomName + "&scope=group&target=en", null, function (aliceChat) {
          assert.equal(aliceChat.scope, "group");
          assert.equal(aliceChat.messages.length, 2);
          assert.equal(aliceChat.messages[0].scope, "group_shared");
          assert.equal(aliceChat.messages[0].target_id, "breakout-room-1");
          requestJson(port, "GET", "/api/group-messages?participant_id=learner-bob&room=" + roomName + "&scope=group&target=en", null, function (bobChat) {
            assert.equal(bobChat.messages.length, 0);
            requestJson(port, "GET", "/api/state?participant_id=learner-bob&room=" + roomName, null, function (bobState) {
              assert.equal(bobState.group_messages.length, 0);
              server.close(done);
            });
          });
        });
      });
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
