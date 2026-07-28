const fs = require("fs");
const http = require("http");
const path = require("path");
const { createBudRuntime } = require("./runtime");
const { createSourcePackStore } = require("./source-pack");
const { createBudMemoryStore } = require("./bud-memory");
const { createTranscriptLog } = require("./transcript/transcript-log");
const { createSentenceBuffer } = require("./transcript/sentence-buffer");
const { cleanTranscript } = require("./providers/transcript-hygiene");
const { groqSttConfigured, transcribeWithGroq } = require("./providers/groq-stt");
const { llmTranslateBackend, llmTranslateConfigured, translateWithLlm } = require("./providers/llm-translate");
const { createCheckinScheduler, formatEntries, parseVerdict } = require("./checkin/checkin-scheduler");
const { createBudCognition } = require("./bud-cognition");
const { buildLeaderResponseBrief, normalizeLeaderBudReply } = require("./leader-response-brief");
const { buildLearnerResponseBrief, normalizeLearnerBudReply } = require("./learner-response-brief");
const { LEADER_BUD_BEHAVIOR } = require("./config/leader-bud-config");
const { LEARNER_BUD_BEHAVIOR } = require("./config/learner-bud-config");
const { baseEvent } = require("../../../packages/test-fixtures/src/demo-events");

const WEB_ROOT = path.resolve(__dirname, "../../web/src/app");
const DEFAULT_ROOM = "BUD-101";
const DEFAULT_OBSERVATION_INTERVAL_MS = 60 * 1000;
const MINIMUM_OBSERVATION_INTERVAL_MS = 15 * 1000;
const ROOT_PROBLEM_DEFINITION = "It means the **fundamental, underlying cause** of a situation or trouble, rather than just the visible signs or surface symptoms.";

function createServer(options) {
  const runtime = createBudRuntime();
  runtime.workshopControl = {
    duration_seconds: 30 * 60,
    status: "not_started",
    started_at: null,
    elapsed_seconds: 0,
    updated_at: new Date().toISOString()
  };
  const workshopDocumentControls = {};
  const config = Object.assign({
    participant_id: "",
    observation_interval_ms: Number(process.env.BUD_OBSERVATION_INTERVAL_MS) || DEFAULT_OBSERVATION_INTERVAL_MS
  }, options || {});
  const sourcePackStore = createSourcePackStore();
  const roomDirectoryFile = config.room_directory_file || process.env.ROOM_DIRECTORY_FILE || path.join(sourcePackStore.root, "room-directory.json");
  const roomDirectory = loadRoomDirectory(roomDirectoryFile);
  runtime.roomDirectory = roomDirectory;
  const diagnostics = {
    connections: {},
    metrics: {
      transcriptions: 0,
      last_stt_ms: null,
      last_translation_ms: null,
      last_total_ms: null,
      provider_errors: 0
    },
    events: []
  };
  const summaryLastSentAt = {};
  const mediaState = {};
  const budMemoryStore = createBudMemoryStore();
  const cognition = createBudCognition({ default_room: DEFAULT_ROOM });
  const facilitatorRoomByTarget = {};
  const participantRoomByTarget = {};
  const attendanceByRoom = {};
  const learnerNamesByRoom = {};
  const budReplyTranslations = {};
  const originalRecordPrivateMessage = runtime.recordPrivateMessage;
  runtime.recordPrivateMessage = function (message) {
    const scope = message && (message.scope || "private_participant_ai");
    const participantId = String(message && message.target_id || "").trim();
    const roomName = message && message.room_name || (scope === "private_facilitator_ai"
      ? facilitatorRoomByTarget[participantId || "facilitator-1"] || DEFAULT_ROOM
      : participantRoomByTarget[participantId] || DEFAULT_ROOM);
    const scopedMessage = Object.assign({}, message, { room_name: roomName });
    originalRecordPrivateMessage(scopedMessage);
    if (scope === "private_facilitator_ai") {
      cognition.recordLeaderExchange(roomName, scopedMessage);
      return;
    }
    if (scope === "private_participant_ai") {
      if (participantId) {
        cognition.recordLearnerExchange(roomName, participantId, scopedMessage);
      }
    }
  };
  const originalRecordSharedMessage = runtime.recordSharedMessage;
  runtime.recordSharedMessage = function (message) {
    originalRecordSharedMessage(message);
    cognition.recordSharedMessage(message);
  };

  const transcriptLog = createTranscriptLog();
  const speakerContext = {};
  const recentUtterances = {};
  const captionTranslations = {};
  const sharedMessageTranslations = {};
  const checkinScheduler = createCheckinScheduler({
    transcriptLog: transcriptLog,
    wordInterval: Number(process.env.CHECKIN_WORD_INTERVAL || 500),
    judge: judgeCheckinNeeded,
    summarise: summariseForCheckin,
    deliver: deliverCheckin
  });
  const sentenceBuffer = createSentenceBuffer({
    idleReleaseMs: Number(process.env.CAPTION_IDLE_RELEASE_MS || 900),
    maxPendingMs: Number(process.env.CAPTION_MAX_PENDING_MS || 7000),
    maxPendingChars: Number(process.env.CAPTION_MAX_PENDING_CHARS || 220),
    speakingSafetyMs: Number(process.env.CAPTION_SPEAKING_SAFETY_MS || 5000),
    onRelease: function (participantId, sentenceText) {
      const context = speakerContext[participantId];
      if (!context || !sentenceText) return;
      publishSentence(context, sentenceText, function () {});
    }
  });

  function publishSentence(context, sentenceText, callback) {
    const done = typeof callback === "function" ? callback : function () {};
    const text = String(sentenceText || "").trim();
    if (!text) return done({ translation: null, event: null, result: null, failed: false });

    const participantId = context.participantId || config.participant_id;
    const roomName = context.roomName || DEFAULT_ROOM;
    const sourceRoomName = mainRoomName(roomName);
    const sourceLanguage = context.sourceLanguage || "en";
    const targetLanguage = context.targetLanguage || "es";
    const utteranceId = context.utteranceId || "utterance-" + Date.now();
    const sourceEventIds = context.sourceEventIds || [];
    rememberUtterance(recentUtterances, participantId, text);

    function logOriginalOnly(createdAt) {
      logSpeech({
        room_name: roomName,
        participant_id: participantId,
        display_name: context.displayName || participantId,
        role: context.role || speakerRole(participantId),
        original_text: text,
        original_language: sourceLanguage,
        translated_text: null,
        target_language: null,
        created_at: createdAt
      });
    }

    const completedEvent = baseEvent({
      event_id: "stt-completed-" + Date.now(),
      type: "utterance_completed",
      source: context.sttProvider || "faster-whisper",
      privacy_scope: "public_shared",
      language: sourceLanguage,
      actor: { actor_type: "participant", participant_id: participantId },
      payload: {
        utterance_id: utteranceId,
        original_text: text,
        original_language: sourceLanguage,
        completion_reason: context.completionReason || "sentence_buffer",
        source_event_ids: sourceEventIds
      }
    });
    const completedResult = runtime.handleEvent(completedEvent);

    if (sourceLanguage === targetLanguage) {
      logOriginalOnly(completedEvent.occurred_at);
      return done({ translation: null, event: completedEvent, result: completedResult, failed: false });
    }

    const snapshot = runtime.getStateSnapshot();
    translateText(text, sourceLanguage, targetLanguage, {
      workshopPrompt: currentPrompt(snapshot),
      recentTurns: recentUtterances[participantId] || [],
      sourceText: sourcePackStore.context(sourceRoomName, text).text
    }, function (translationError, translation) {
      if (translationError || !translation || !translation.translated_text) {
        logOriginalOnly(completedEvent.occurred_at);
        return done({ translation: null, event: completedEvent, result: completedResult, failed: true });
      }
      const translationEvent = baseEvent({
        event_id: "translation-completed-" + Date.now(),
        type: "translation_completed",
        source: translation.provider,
        privacy_scope: "public_shared",
        language: targetLanguage,
        actor: { actor_type: "participant", participant_id: participantId },
        payload: {
          utterance_id: utteranceId,
          original_text: text,
          original_language: sourceLanguage,
          translated_text: translation.translated_text,
          target_language: targetLanguage,
          provider: translation.provider,
          context_event_ids: [completedEvent.event_id]
        }
      });
      runtime.handleEvent(translationEvent);
      logSpeech({
        room_name: roomName,
        participant_id: participantId,
        display_name: context.displayName || participantId,
        role: context.role || speakerRole(participantId),
        original_text: text,
        original_language: sourceLanguage,
        translated_text: translation.translated_text,
        target_language: targetLanguage,
        created_at: translationEvent.occurred_at
      });
      done({ translation: translation, event: completedEvent, translationEvent: translationEvent, result: completedResult, failed: false });
    });
  }

  async function judgeCheckinNeeded(input) {
    const reply = await askLocalBud({
      system: "You decide whether learners in a live workshop should receive a private check-in summary right now. Answer with YES or NO on the first line, then at most one short sentence saying why. Answer YES only when the recent speech has finished a topic, moved on to a new one, or made substantial points a learner could have missed. Answer NO for greetings, logistics, small talk, unfinished explanations, or when the room is still in the middle of the same point.",
      question: "Full workshop speech so far:\n" + formatEntries(input.fullEntries) +
        "\n\nSpeech not yet covered by any check-in:\n" + formatEntries(input.newEntries) +
        "\n\nShould the learners get a check-in summary now? Answer YES or NO.",
      max_tokens: 60,
      timeout_ms: 20000
    });
    if (!reply) return { needed: false, reason: "judge_unavailable" };
    return parseVerdict(reply.text);
  }

  async function summariseForCheckin(input) {
    const snapshot = runtime.getStateSnapshot();
    const reply = await askLocalBud({
      system: "You are Bud, a friendly workshop learning companion writing a private check-in for one learner. Summarise only what was actually said in the supplied speech. Do not invent workshop facts. Write two or three short sentences in English: what the room just covered and one concrete next step. Do not ask the learner to respond or self-report.",
      workshopPrompt: currentPrompt(snapshot),
      question: "Speech to summarise:\n" + formatEntries(input.newEntries),
      max_tokens: 200,
      timeout_ms: 25000
    });
    return reply ? reply.text : null;
  }

  async function deliverCheckin(input) {
    const learners = checkinRecipients(diagnostics, roomDirectory, input.roomName);
    if (!learners.length) return { recipients: 0, languages: [] };

    const byLanguage = {};
    learners.forEach(function (learner) {
      const language = normalizeLanguage(learner.language) || "en";
      (byLanguage[language] || (byLanguage[language] = [])).push(learner);
    });
    const createdAt = new Date().toISOString();
    const stamp = Date.now();
    const baseRoomName = mainRoomName(input.roomName);

    await Promise.all(Object.keys(byLanguage).map(async function (language) {
      const text = language === "en"
        ? input.summaryText
        : await translateOrKeep(input.summaryText, "en", language);
      byLanguage[language].forEach(function (learner, index) {
        runtime.recordPrivateMessage({
          message_id: "message-checkin-" + stamp + "-" + language + "-" + index,
          room_name: baseRoomName,
          target_id: learner.participant_id,
          sender: "bud",
          message_type: "periodic_summary",
          text: text,
          language: language,
          provider: "local-llm",
          checkin_id: input.chapter && input.chapter.chapter_id,
          chapter: input.chapter,
          created_at: createdAt
        });
      });
    }));

    return { recipients: learners.length, languages: Object.keys(byLanguage) };
  }

  function logSpeech(entry) {
    const stored = transcriptLog.record(entry);
    if (stored) checkinScheduler.noteSpeech(stored);
    return stored;
  }

  const server = http.createServer(function (req, res) {
    if (req.method === "GET" && req.url === "/api/livekit/config") {
      const { livekitConfig } = require("./livekit/livekit-adapter");
      const config = livekitConfig();
      return sendJson(res, {
        configured: Boolean(config.url && config.apiKey && config.apiSecret),
        url: config.url,
        room_name: config.roomName
      });
    }

    if (req.method === "POST" && req.url === "/api/livekit/room") {
      return readJson(req, res, async function (body) {
        try {
          const { ensureRoom } = require("./livekit/livekit-adapter");
          const room = await ensureRoom(body.room_name);
          sendJson(res, { room });
        } catch (error) {
          sendJson(res, { error: error.message, code: error.code || "LIVEKIT_ROOM_ERROR" }, error.code === "LIVEKIT_NOT_CONFIGURED" ? 503 : 500);
        }
      });
    }

    if (req.method === "GET" && req.url === "/api/facilitator/rooms") {
      return sendJson(res, { rooms: listRooms(roomDirectory) });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/room") {
      return readJson(req, res, async function (body) {
        const roomName = cleanRoomName(body.room_name);
        if (!roomName) return sendJson(res, { error: "A room name is required" }, 400);
        const persistedPlan = sourcePackStore.learningPlan(roomName);
        const roomPlan = roomDirectory.rooms[roomName] && roomDirectory.rooms[roomName].learning_plan;
        if (!String(persistedPlan.locked || roomPlan || "").trim()) {
          return sendJson(res, { error: "Lock the full workshop plan before starting the main workshop room." }, 409);
        }
        try {
          const { ensureRoom } = require("./livekit/livekit-adapter");
          const livekitRoom = await ensureRoom(roomName);
          if (!roomDirectory.rooms[roomName]) {
            roomDirectory.rooms[roomName] = { room_name: roomName, allocations: {}, participant_screen_share_enabled: false, ready: false, learning_plan_draft: "", learning_plan: "" };
          }
          if (body.new_workshop === true) {
            runtime.clearRoomConversation(roomName);
            budMemoryStore.clearRoom(roomName);
            cognition.clearConversation(roomName);
            delete attendanceByRoom[roomName];
            delete learnerNamesByRoom[roomName];
          }
          // Opening the leader room is the explicit preparation gate for learners.
          roomDirectory.rooms[roomName].ready = true;
          saveRoomDirectory(roomDirectoryFile, roomDirectory);
          sendJson(res, { room: livekitRoom, rooms: listRooms(roomDirectory) });
        } catch (error) {
          sendJson(res, { error: error.message, code: error.code || "LIVEKIT_ROOM_ERROR" }, error.code === "LIVEKIT_NOT_CONFIGURED" ? 503 : 500);
        }
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/allocation") {
      return readJson(req, res, function (body) {
          const roomName = cleanRoomName(body.room_name);
          const participantId = String(body.participant_id || "").trim();
          const displayName = String(body.display_name || participantId).trim();
        if (!roomName || (!participantId && !displayName)) {
          return sendJson(res, { error: "room_name and a participant ID or display name are required" }, 400);
        }
        if (!roomDirectory.rooms[roomName]) {
          return sendJson(res, { error: "Create the room before allocating participants" }, 404);
        }
        const allocationKey = participantId || "name:" + displayName.toLowerCase();
        roomDirectory.rooms[roomName].allocations[allocationKey] = {
          participant_id: participantId || null,
          display_name: displayName,
          allocated_at: new Date().toISOString()
        };
        saveRoomDirectory(roomDirectoryFile, roomDirectory);
        sendJson(res, { allocation: roomDirectory.rooms[roomName].allocations[participantId], rooms: listRooms(roomDirectory) });
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/breakouts") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name);
        const assignments = Array.isArray(body.assignments) ? body.assignments : [];
        if (!roomName || !assignments.length) return sendJson(res, { error: "room_name and breakout assignments are required" }, 400);
        const room = roomDirectory.rooms[roomName];
        if (!room) return sendJson(res, { error: "Create the room before configuring breakout rooms" }, 404);
        room.breakout_assignments = assignments.map(function (members, index) {
          return {
            group_id: "breakout-room-" + (index + 1),
            members: (Array.isArray(members) ? members : []).filter(Boolean).map(function (member) {
              return {
                participant_id: member.participant_id || null,
                display_name: String(member.display_name || member.name || member.participant_id || "Participant")
              };
            })
          };
        });
        saveRoomDirectory(roomDirectoryFile, roomDirectory);
        sendJson(res, { room_name: roomName, breakout_assignments: room.breakout_assignments, rooms: listRooms(roomDirectory) });
      });
    }

    if (req.method === "POST" && req.url === "/api/livekit/token") {
      return readJson(req, res, async function (body) {
        try {
          const roomName = cleanRoomName(body.room_name);
          const participantId = String(body.participant_id || "").trim();
          const managedRoom = roomDirectory.rooms[roomName];
          if (body.role !== "facilitator" && managedRoom && Object.keys(managedRoom.allocations).length) {
            const allocation = managedRoom.allocations[participantId] || Object.keys(managedRoom.allocations).map(function (key) {
              return managedRoom.allocations[key];
            }).find(function (item) {
              return item.display_name.toLowerCase() === String(body.name || "").trim().toLowerCase();
            });
            if (!allocation) {
              return sendJson(res, { error: "This learner has not been allocated to this room." }, 403);
            }
          }
          const { createParticipantToken } = require("./livekit/livekit-adapter");
          body.screen_share_allowed = body.role === "facilitator" || Boolean(managedRoom && managedRoom.participant_screen_share_enabled);
          sendJson(res, await createParticipantToken(body));
        } catch (error) {
          sendJson(res, { error: error.message, code: error.code || "LIVEKIT_TOKEN_ERROR" }, error.code === "LIVEKIT_NOT_CONFIGURED" ? 503 : 400);
        }
      });
    }

    if (req.method === "GET" && req.url.indexOf("/api/livekit/media") === 0) {
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || DEFAULT_ROOM;
      sendJson(res, { room_name: roomName, participant_screen_share_enabled: Boolean(roomDirectory.rooms[roomName] && roomDirectory.rooms[roomName].participant_screen_share_enabled), active_screen_share: mediaState[roomName] || null });
      return;
    }

    if (req.method === "POST" && req.url === "/api/livekit/media/claim") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name);
        const participantId = String(body.participant_id || "").trim();
        const current = mediaState[roomName];
        if (!roomName || !participantId) return sendJson(res, { error: "room_name and participant_id are required" }, 400);
        if (current && current.participant_id !== participantId) return sendJson(res, { error: "Another participant is already sharing their screen" }, 409);
        mediaState[roomName] = { participant_id: participantId, display_name: String(body.display_name || participantId), role: body.role || "learner", updated_at: new Date().toISOString() };
        sendJson(res, { active_screen_share: mediaState[roomName] });
      });
    }

    if (req.method === "POST" && req.url === "/api/livekit/media/release") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name);
        if (mediaState[roomName] && (!body.participant_id || mediaState[roomName].participant_id === body.participant_id)) delete mediaState[roomName];
        sendJson(res, { active_screen_share: mediaState[roomName] || null });
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/media-permission") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name);
        if (!roomDirectory.rooms[roomName]) return sendJson(res, { error: "Create the room before changing media permissions" }, 404);
        roomDirectory.rooms[roomName].participant_screen_share_enabled = Boolean(body.enabled);
        saveRoomDirectory(roomDirectoryFile, roomDirectory);
        sendJson(res, { room_name: roomName, participant_screen_share_enabled: roomDirectory.rooms[roomName].participant_screen_share_enabled });
      });
    }

    if (req.method === "GET" && req.url.indexOf("/api/facilitator/source-pack") === 0) {
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || DEFAULT_ROOM;
      return sendJson(res, sourcePackStore.get(roomName));
    }

    if (req.method === "POST" && req.url === "/api/facilitator/source-pack/reset") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        if (!roomName) return sendJson(res, { error: "A valid room name is required" }, 400);
        const sourcePack = sourcePackStore.clear(roomName);
        const room = roomDirectory.rooms[roomName];
        if (room) {
          room.ready = false;
          room.learning_plan_draft = "";
          room.learning_plan = "";
          saveRoomDirectory(roomDirectoryFile, roomDirectory);
        }
        delete workshopDocumentControls[roomName];
        return sendJson(res, { source_pack: sourcePack });
      });
    }

    if (req.method === "GET" && req.url.indexOf("/api/workshop-material") === 0) {
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || DEFAULT_ROOM;
      return sendJson(res, sourcePackStore.pages(roomName));
    }

    if (req.method === "GET" && new URL(req.url, "http://localhost").pathname === "/api/workshop-asset") {
      const requestUrl = new URL(req.url, "http://localhost");
      const roomName = cleanRoomName(requestUrl.searchParams.get("room") || DEFAULT_ROOM);
      const materialId = String(requestUrl.searchParams.get("material_id") || "").trim();
      const asset = roomName && materialId ? sourcePackStore.renderedAsset(roomName, materialId) : null;
      if (!asset) return sendJson(res, { error: "Rendered workshop document not found" }, 404);
      return fs.createReadStream(asset.file_path).on("error", function () {
        sendJson(res, { error: "Rendered workshop document not found" }, 404);
      }).on("open", function () {
        res.writeHead(200, {
          "Content-Type": asset.content_type,
          "Content-Disposition": "inline",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
      }).pipe(res);
    }

    if (req.method === "GET" && new URL(req.url, "http://localhost").pathname === "/api/workshop-slide") {
      const requestUrl = new URL(req.url, "http://localhost");
      const roomName = cleanRoomName(requestUrl.searchParams.get("room") || DEFAULT_ROOM);
      const materialId = String(requestUrl.searchParams.get("material_id") || "").trim();
      const pageNumber = Number(requestUrl.searchParams.get("page"));
      const slide = roomName && materialId
        ? sourcePackStore.renderedSlide(roomName, materialId, pageNumber)
        : null;
      if (!slide) return sendJson(res, { error: "Rendered workshop slide not found" }, 404);
      return fs.createReadStream(slide.file_path).on("error", function () {
        sendJson(res, { error: "Rendered workshop slide not found" }, 404);
      }).on("open", function () {
        res.writeHead(200, {
          "Content-Type": slide.content_type,
          "Content-Disposition": "inline",
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff"
        });
      }).pipe(res);
    }

    if (req.method === "GET" && new URL(req.url, "http://localhost").pathname === "/api/workshop-document-control") {
      const roomName = cleanRoomName(new URL(req.url, "http://localhost").searchParams.get("room") || DEFAULT_ROOM);
      return sendJson(res, workshopDocumentControls[roomName] || {
        room_name: roomName,
        page_index: 0,
        active_task_index: 0,
        completed_task_indexes: [],
        updated_at: null,
        updated_by: null
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/workshop-document") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        const pageIndex = Number(body.page_index);
        if (!Number.isInteger(pageIndex)) {
          return sendJson(res, { error: "page_index must be an integer" }, 400);
        }
        const material = sourcePackStore.pages(roomName);
        const pageCount = material.pages && material.pages.length || 1;
        const previousControl = workshopDocumentControls[roomName] || {};
        const control = Object.assign({}, previousControl, {
          room_name: roomName,
          page_index: Math.max(0, Math.min(pageCount - 1, pageIndex)),
          updated_at: new Date().toISOString(),
          updated_by: String(body.updated_by || "facilitator-1")
        });
        workshopDocumentControls[roomName] = control;
        return sendJson(res, control);
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/learning-plan-task") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        const taskIndex = Number(body.task_index);
        const taskCount = Number(body.task_count);
        if (!Number.isInteger(taskIndex) || !Number.isInteger(taskCount) || taskCount < 1 || taskIndex < 0 || taskIndex >= taskCount) {
          return sendJson(res, { error: "A valid task_index and task_count are required" }, 400);
        }
        const previousControl = workshopDocumentControls[roomName] || { page_index: 0 };
        const completedTaskIndexes = Array.isArray(previousControl.completed_task_indexes)
          ? previousControl.completed_task_indexes.slice()
          : [];
        const existingIndex = completedTaskIndexes.indexOf(taskIndex);
        if (body.completed === false && existingIndex >= 0) {
          completedTaskIndexes.splice(existingIndex, 1);
        } else if (body.completed !== false && existingIndex === -1) {
          completedTaskIndexes.push(taskIndex);
        }
        completedTaskIndexes.sort(function (left, right) { return left - right; });
        const activeTaskIndex = Array.from({ length: taskCount }, function (_, index) { return index; })
          .find(function (index) { return completedTaskIndexes.indexOf(index) === -1; });
        const control = Object.assign({}, previousControl, {
          room_name: roomName,
          active_task_index: activeTaskIndex === undefined ? null : activeTaskIndex,
          completed_task_indexes: completedTaskIndexes,
          updated_at: new Date().toISOString(),
          updated_by: String(body.updated_by || "facilitator-1")
        });
        workshopDocumentControls[roomName] = control;
        return sendJson(res, control);
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/source-material") {
      return readJson(req, res, function (body) {
        try {
          const result = sourcePackStore.addMaterial(body);
          const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
          cognition.recordGroundContext(roomName, {
            actor_id: String(body.uploaded_by || "facilitator-1"),
            display_name: "Leader",
            source_event_id: "source-material-" + Date.now(),
            usable_by: ["public_shared", "private_facilitator_ai"],
            status: "draft",
            summary: "Categorized source material uploaded. Active version: " + String(result.active_version || "none") + ". Versions: " + result.versions.map(function (version) {
              return "v" + version.version + " " + version.status + " (" + version.materials.map(function (material) {
                return material.filename + " [" + material.material_role + "]";
              }).join(", ") + ")";
            }).join("; ")
          });
          sendJson(res, { source_pack: result });
        } catch (error) {
          sendJson(res, { error: error.message }, 400);
        }
      }, 25 * 1024 * 1024);
    }

    if (req.method === "POST" && req.url === "/api/facilitator/source-pack/activate") {
      return readJson(req, res, function (body) {
        try {
          const roomName = cleanRoomName(body.room_name);
          if (!roomName) return sendJson(res, { error: "A valid room name is required" }, 400);
          const sourcePack = sourcePackStore.activate(roomName, body.version);
          const room = roomDirectory.rooms[roomName] || (roomDirectory.rooms[roomName] = {
            room_name: roomName,
            allocations: {},
            breakout_assignments: [],
            participant_screen_share_enabled: false,
            ready: false,
            learning_plan_draft: "",
            learning_plan: ""
          });
          const plan = String(body.learning_plan || room.learning_plan_draft || "").trim();
          if (plan) {
            room.learning_plan = plan;
            sourcePackStore.setLearningPlan(roomName, plan, false);
          }
          saveRoomDirectory(roomDirectoryFile, roomDirectory);
          cognition.recordGroundContext(roomName, {
            actor_id: "facilitator-1",
            display_name: "Leader",
            source_event_id: "source-pack-activate-" + Date.now(),
            summary: "Source Pack version " + String(sourcePack.active_version || body.version) + " activated." + (room.learning_plan ? " Locked learning plan is available." : " No locked learning plan supplied.")
          });
          sendJson(res, { source_pack: sourcePack, learning_plan: room.learning_plan || "" });
        } catch (error) {
          sendJson(res, { error: error.message }, 400);
        }
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/learning-plan") {
      return readJson(req, res, async function (body) {
        const roomName = String(body.room_name || DEFAULT_ROOM).trim();
        const sourceContext = sourcePackStore.context(
          roomName,
          "workshop curriculum learning goals tasks objectives sequence challenge requirements deliverables",
          { include_draft: true, all_chunks: true, roles: ["curriculum"] }
        );
        if (!sourceContext.text) {
          return sendJson(res, { error: "No curriculum uploaded. Add a curriculum and learning-goals document before generating a learning plan." }, 400);
        }
        const localReply = await askLocalBud({
          workshopPrompt: "Create a learner-centred workshop learning plan from the supplied curriculum and learning goals.",
          question: "Generate a practical learning plan from the curriculum. Return only numbered chapters. For every chapter, use exactly three lines: the numbered chapter title, 'Learner task: ...', and 'Comprehension check: ...'. The learner task should be a clear editable explanation of what the learner will do. Use only the supplied source material.",
          sourceContext: sourceContext,
          system: "You are Leader Bud, a concise workshop planning assistant for a human Leader. Create a practical learner-centred plan grounded only in the supplied curriculum and learning goals. Each numbered chapter must contain one 'Learner task:' and one 'Comprehension check:' line so the Leader can review them as editable task cards. Do not use slides or teaching notes to create goals, and do not invent unsupported content. Return only the numbered chapters in no more than 500 words.",
          max_tokens: 500,
          source_context_chars: 9000,
          timeout_ms: 180000
        });
        if (!localReply) {
          return sendJson(res, { error: "Qwen is unavailable. Check that the local Qwen service is running and try again." }, 503);
        }
        const room = roomDirectory.rooms[roomName] || (roomDirectory.rooms[roomName] = {
          room_name: roomName,
          allocations: {},
          participant_screen_share_enabled: false,
          ready: false,
          learning_plan_draft: "",
          learning_plan: ""
        });
        room.learning_plan_draft = localReply.text;
        saveRoomDirectory(roomDirectoryFile, roomDirectory);
        sourcePackStore.setLearningPlan(roomName, localReply.text, true);
        cognition.recordGroundContext(roomName, {
          actor_id: "leader-bud",
          display_name: "Leader Bud",
          source_event_id: "learning-plan-draft-" + Date.now(),
          privacy_scope: "private_facilitator_ai",
          usable_by: ["private_facilitator_ai"],
          status: "draft",
          summary: "Draft learning plan generated: " + localReply.text
        });
        sendJson(res, { learning_plan: localReply.text, provider: localReply.provider, latency_ms: localReply.latency_ms, source_version: sourceContext.version });
      });
    }

    if (req.method === "POST" && req.url === "/api/transcribe") {
      return readBinary(req, res, function (audio, headers) {
        const requestStartedAt = Date.now();
        const participantId = headers["x-participant-id"] || config.participant_id;
        const pendingPrompt = sentenceBuffer.pending(participantId);
        transcribeAudio(audio, headers, pendingPrompt, function (error, transcript) {
          if (error) {
            return sendJson(res, {
              error: error.message,
              code: "STT_UNAVAILABLE",
              speech_sequence: headers["x-speech-sequence"] || null,
              timings_ms: { total: Date.now() - requestStartedAt }
            }, 503);
          }
          const sttCompletedAt = Date.now();
          const baseRoomName = cleanRoomName(headers["x-room-name"]) || cleanRoomName(headers["x-room"]) || DEFAULT_ROOM;
          const groupId = cleanGroupId(headers["x-group-id"]) || "group-main";
          const roomName = captionRoomName(baseRoomName, groupId);
          const nativeLanguage = normalizeLanguage(headers["x-native-language"]);
          const targetLanguage = headers["x-target-language"] || "es";
          const speechSequence = headers["x-speech-sequence"] || null;
          const speechSequenceNumber = Number(speechSequence);
          // Whisper receives the selected language as a hint. Its detected-language
          // field is unreliable on short chunks, so a mismatch is not grounds for
          // silently deleting an otherwise valid utterance.
          if (nativeLanguage) transcript.language = nativeLanguage;
          const hygiene = cleanTranscript(transcript.text, {
            participantId: participantId
          });
          transcript.text = hygiene.text;
          if (hygiene.dropped) {
            transcript.ignored = true;
            transcript.ignore_reason = hygiene.reason;
          }
          const utteranceId = "utterance-" + Date.now();
          const sourceEvent = baseEvent({
            event_id: "stt-partial-" + Date.now(),
            type: "participant_utterance",
            source: "faster-whisper",
            privacy_scope: "public_shared",
            language: transcript.language,
            actor: { actor_type: "participant", participant_id: participantId },
            payload: {
              transcript_fragment: transcript.text,
              is_final_fragment: false,
              stt_provider: transcript.provider,
              stt_confidence: transcript.language_probability
            }
          });
          const partialResult = transcript.text ? runtime.handleEvent(sourceEvent) : null;
          const uploadedAt = Date.now();
          const speechLeadMs = Number(headers["x-speech-lead-ms"] || 0);
          const speechSilenceMs = Number(headers["x-speech-silence-ms"] || 0);
          speakerContext[participantId] = {
            participantId: participantId,
            roomName: roomName,
            sourceLanguage: transcript.language,
            targetLanguage: targetLanguage,
            utteranceId: utteranceId,
            sourceEventIds: transcript.text ? [sourceEvent.event_id] : [],
            sttProvider: transcript.provider || "faster-whisper",
            displayName: headers["x-display-name"] || participantId,
            role: speakerRole(participantId)
          };
          const assembled = sentenceBuffer.push(participantId, transcript.text, uploadedAt, {
            speechStartedAt: uploadedAt - (Number.isFinite(speechLeadMs) ? Math.max(0, speechLeadMs) : 0),
            speechEndedAt: uploadedAt - (Number.isFinite(speechSilenceMs) ? Math.max(0, speechSilenceMs) : 0),
            sequence: Number.isFinite(speechSequenceNumber) ? speechSequenceNumber : undefined
          });
          const translationStartedAt = Date.now();
          if (!assembled.ready) {
            recordTranscriptionDiagnostic(diagnostics, participantId, {
              stt: sttCompletedAt - requestStartedAt,
              translation: 0,
              total: Date.now() - requestStartedAt
            }, false);
            return sendJson(res, {
              transcript,
              translation: null,
              released_sentence: null,
              pending_transcript: assembled.pending,
              speech_sequence: speechSequence,
              timings_ms: {
                stt: sttCompletedAt - requestStartedAt,
                translation: 0,
                total: Date.now() - requestStartedAt
              },
              events: transcript.text ? [sourceEvent] : [],
              result: partialResult ? summarizeResult(partialResult) : null,
              state: learnerState(runtime, participantId, roomName)
            });
          }
          publishSentence(Object.assign({}, speakerContext[participantId], {
            utteranceId: utteranceId,
            sourceEventIds: transcript.text ? [sourceEvent.event_id] : [],
            completionReason: assembled.reason
          }), assembled.ready, function (published) {
            recordTranscriptionDiagnostic(diagnostics, participantId, {
              stt: sttCompletedAt - requestStartedAt,
              translation: Date.now() - translationStartedAt,
              total: Date.now() - requestStartedAt
            }, Boolean(published.failed));
            const events = transcript.text ? [sourceEvent] : [];
            if (published.event) events.push(published.event);
            if (published.translationEvent) events.push(published.translationEvent);
            sendJson(res, {
              transcript,
              translation: published.failed ? { unavailable: true } : published.translation,
              released_sentence: assembled.ready,
              pending_transcript: assembled.pending,
              speech_sequence: speechSequence,
              timings_ms: {
                stt: sttCompletedAt - requestStartedAt,
                translation: Date.now() - translationStartedAt,
                total: Date.now() - requestStartedAt
              },
              events: events,
              result: published.result ? summarizeResult(published.result) : null,
              state: learnerState(runtime, participantId, roomName)
            });
          });
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/transcribe/speaking") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || config.participant_id).trim();
        const sequence = Number(body.speech_sequence);
        sentenceBuffer.markSpeaking(participantId, Number.isFinite(sequence) ? sequence : undefined);
        sendJson(res, { ok: true });
      });
    }

    if (req.method === "POST" && req.url === "/api/transcribe/flush") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || config.participant_id).trim();
        const context = speakerContext[participantId];
        const flushed = sentenceBuffer.flush(participantId);
        if (!flushed.ready || !context) {
          return sendJson(res, { sentence: null, translation: null });
        }
        publishSentence(Object.assign({}, context, {
          completionReason: flushed.reason
        }), flushed.ready, function (published) {
          sendJson(res, {
            sentence: flushed.ready,
            translation: published.failed ? { unavailable: true } : published.translation
          });
        });
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/state") {
      const stateUrl = new URL(req.url, "http://127.0.0.1");
      const participantId = stateUrl.searchParams.get("participant_id") || config.participant_id;
      const roomName = cleanRoomName(stateUrl.searchParams.get("room") || DEFAULT_ROOM);
      const targetLanguage = normalizeLanguage(stateUrl.searchParams.get("target")) || "en";
      return localizeBudState(learnerState(runtime, participantId, roomName), targetLanguage, budReplyTranslations)
        .then(function (state) { sendJson(res, state); })
        .catch(function () { sendJson(res, learnerState(runtime, participantId, roomName)); });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/transcript") {
      const transcriptUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(transcriptUrl.searchParams.get("room")) || DEFAULT_ROOM;
      const limit = Number(transcriptUrl.searchParams.get("limit")) || 20;
      return sendJson(res, {
        room_name: roomName,
        entries: transcriptLog.recent(roomName, Math.min(limit, 100))
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/transcript/live") {
      const transcriptUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(transcriptUrl.searchParams.get("room")) || DEFAULT_ROOM;
      const groupId = cleanGroupId(transcriptUrl.searchParams.get("group_id")) || "group-main";
      const captionScope = captionRoomName(roomName, groupId);
      const targetLanguage = normalizeLanguage(transcriptUrl.searchParams.get("target"));
      const afterSequence = Number(transcriptUrl.searchParams.get("after_sequence") || transcriptUrl.searchParams.get("after")) || 0;
      const entries = transcriptLog.since(captionScope, afterSequence, 25);
      return captionEntries(entries, targetLanguage, captionTranslations, function (captions, nextAfter) {
        sendJson(res, {
          room_name: roomName,
          group_id: groupId,
          caption_scope: captionScope,
          target_language: targetLanguage || null,
          latest_sequence: transcriptLog.latestSequence(captionScope),
          next_after: nextAfter,
          entries: captions
        });
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/group-messages") {
      const groupUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(groupUrl.searchParams.get("room")) || DEFAULT_ROOM;
      const participantId = String(groupUrl.searchParams.get("participant_id") || config.participant_id || "").trim();
      const targetLanguage = normalizeLanguage(groupUrl.searchParams.get("target"));
      const requestedScope = String(groupUrl.searchParams.get("scope") || "").trim().toLowerCase();
      const state = learnerState(runtime, participantId, roomName);
      const messages = (requestedScope === "public"
        ? state.public_messages
        : requestedScope === "group"
          ? state.group_messages
          : state.public_messages.concat(state.group_messages)).slice(-50);
      return sharedMessageRows(messages, targetLanguage, diagnostics, sharedMessageTranslations, function (rows) {
        sendJson(res, {
          room_name: roomName,
          scope: requestedScope === "public" || requestedScope === "group" ? requestedScope : "all",
          target_language: targetLanguage || null,
          messages: rows
        });
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/checkins") {
      return sendJson(res, {
        word_interval: checkinScheduler.wordInterval,
        rooms: checkinScheduler.stats()
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/dm/contacts") {
      const dmUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(dmUrl.searchParams.get("room") || DEFAULT_ROOM);
      const participantId = String(dmUrl.searchParams.get("participant_id") || "").trim();
      const room = roomDirectory.rooms[roomName];
      const contacts = [];
      const seen = {};
      function addContact(contact) {
        const id = String(contact.participant_id || "").trim();
        if (!id || id === participantId || seen[id]) return;
        seen[id] = true;
        contacts.push({ participant_id: id, display_name: String(contact.display_name || id), role: contact.role || "learner" });
      }
      runtime.getStateSnapshot().messages.filter(function (message) {
        return message.scope === "private_dm" && message.room_name === roomName &&
          (message.sender_id === participantId || message.recipient_id === participantId);
      }).forEach(function (message) {
        const contactId = message.sender_id === participantId ? message.recipient_id : message.sender_id;
        const contactName = message.sender_id === participantId ? message.recipient_display_name : message.sender_display_name;
        addContact({ participant_id: contactId, display_name: contactName || contactId, role: contactId === "facilitator-1" ? "leader" : "learner" });
      });
      return sendJson(res, { room_name: roomName, contacts: contacts });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/dm") {
      const dmUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(dmUrl.searchParams.get("room") || DEFAULT_ROOM);
      const participantId = String(dmUrl.searchParams.get("participant_id") || "").trim();
      const contactId = String(dmUrl.searchParams.get("contact_id") || "").trim();
      const messages = runtime.getStateSnapshot().messages.filter(function (message) {
        return message.scope === "private_dm" && message.room_name === roomName &&
          (message.sender_id === participantId || message.recipient_id === participantId) &&
          (!contactId || message.sender_id === contactId || message.recipient_id === contactId);
      });
      return sendJson(res, { room_name: roomName, messages: messages.slice(-100) });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/facilitator/state") {
      const stateUrl = new URL(req.url, "http://127.0.0.1");
      return sendJson(res, facilitatorState(runtime, cleanRoomName(stateUrl.searchParams.get("room") || DEFAULT_ROOM)));
    }

    if (req.method === "GET" && req.url === "/api/workshop-control") {
      return sendJson(res, timerSnapshot(runtime.workshopControl));
    }

    if (req.method === "POST" && req.url === "/api/facilitator/timer") {
      return readJson(req, res, function (body) {
        const control = runtime.workshopControl;
        const action = String(body.action || "").trim();
        timerSnapshot(control);
        if (action === "start") {
          if (control.status === "not_started" || control.status === "paused") {
            control.started_at = new Date(Date.now() - control.elapsed_seconds * 1000).toISOString();
          }
          control.status = "running";
        } else if (action === "pause" && control.status === "running") {
          timerSnapshot(control);
          control.status = "paused";
        } else if (action === "end") {
          timerSnapshot(control);
          control.status = "ended";
          control.elapsed_seconds = control.duration_seconds;
        } else if (action === "reset") {
          control.status = "not_started";
          control.started_at = null;
          control.elapsed_seconds = 0;
        } else {
          return sendJson(res, { error: "Timer action must be start, pause, end, or reset" }, 400);
        }
        control.updated_at = new Date().toISOString();
        sendJson(res, { timer: timerSnapshot(control), state: facilitatorState(runtime) });
      });
    }

    if (req.method === "GET" && req.url === "/api/topview/state") {
      return collectServiceHealth().then(function (health) {
        sendJson(res, topviewState(diagnostics, roomDirectory, health));
      });
    }

    if (req.method === "GET" && req.url === "/api/health") {
      return sendJson(res, { status: "ok", service: "bud" });
    }

    if (req.method === "POST" && req.url === "/api/topview/presence") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || "").trim();
        if (!participantId) return sendJson(res, { error: "participant_id is required" }, 400);
        if (body.connected === false) {
          cognition.clearPresence(cleanRoomName(body.room_name || participantRoomByTarget[participantId] || DEFAULT_ROOM), participantId);
          delete diagnostics.connections[participantId];
          delete participantRoomByTarget[participantId];
        } else {
          const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
          participantRoomByTarget[participantId] = roomName;
          rememberLearnerName(learnerNamesByRoom, roomName, participantId, body.display_name);
          runtime.ensureParticipant(participantId);
          diagnostics.connections[participantId] = {
            participant_id: participantId,
            display_name: String(body.display_name || participantId),
            role: body.role === "facilitator" ? "facilitator" : "learner",
            room_name: roomName,
            language: String(body.language || "unknown"),
            microphone_active: Boolean(body.microphone_active),
            connected_at: diagnostics.connections[participantId] && diagnostics.connections[participantId].connected_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          cognition.recordPresence(roomName, {
            participant_id: participantId,
            display_name: String(body.display_name || participantId),
            source_event_id: "presence-" + participantId + "-" + Date.now(),
            role: diagnostics.connections[participantId].role,
            language: diagnostics.connections[participantId].language
          });
        }
        diagnostics.events.unshift({
          type: body.connected === false ? "participant_disconnected" : "participant_presence",
          participant_id: participantId,
          created_at: new Date().toISOString()
        });
        diagnostics.events = diagnostics.events.slice(0, 30);
        sendJson(res, { ok: true });
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/observe") {
      return readJson(req, res, function () {
        const observations = runtime.observeParticipation({
          now: new Date().toISOString(),
          window_seconds: 600
        });
        sendJson(res, {
          observations: observations.map(summarizeResult),
          state: facilitatorState(runtime)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/help-stuck") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const sourcePackContext = sourcePackStore.context(body.room_name || DEFAULT_ROOM, "current workshop material");
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-help-stuck-" + Date.now(),
          type: "ai_partner_request",
          source: "web",
          privacy_scope: "private_participant_ai",
          actor: {
            actor_type: "participant",
            participant_id: body.participant_id || config.participant_id
          },
          payload: {
            request_id: "request-help-stuck-" + Date.now(),
            requested_surface: "me",
            request_type: "help_stuck",
            text: "Help, I'm Stuck",
            target_participant_id: participantId,
            context_event_ids: ["ui-facilitator-prompt-001"],
            source_pack_context: sourcePackContext
          }
        }));
        sendJson(res, {
          result: summarizeResult(result),
          state: learnerState(runtime, participantId)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/private-message") {
      return readJson(req, res, async function (body) {
        const participantId = body.participant_id || config.participant_id;
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        const nativeLanguage = normalizeLanguage(body.native_language) || "en";
        const originalText = String(body.text || "");
        const translatedLearnerText = nativeLanguage === "en"
          ? originalText
          : await translateOrKeep(originalText, nativeLanguage, "en");
        const learnerText = normalizeLearnerReasoningText(translatedLearnerText, nativeLanguage);
        participantRoomByTarget[participantId] = roomName;
        const learnerName = rememberLearnerName(learnerNamesByRoom, roomName, participantId, body.display_name);
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-private-message-" + Date.now(),
          type: "participant_message",
          source: "web",
          privacy_scope: "private_participant_ai",
          actor: {
            actor_type: "participant",
            participant_id: participantId
          },
          payload: {
            message_id: "message-user-" + Date.now(),
            text: learnerText,
            language: "en",
            original_text: originalText,
            original_language: nativeLanguage
          }
        }));
        runtime.recordPrivateMessage({
          message_id: "message-learner-" + Date.now(),
          target_id: participantId,
          sender: "learner",
          text: originalText,
          language: nativeLanguage,
          created_at: new Date().toISOString()
        });
        if (isLikelyUnintelligible(originalText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-clarify-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: "I'm sorry, I don't understand. Could you say that again?",
            provider: "intelligibility-guard",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (/\b(leader.?s? bud|leader bud|participant bud|learner bud|which bud|who are you)\b/i.test(learnerText)) {
          const identityText = nativeLanguage === "zh"
            ? "我是你的 Learner Bud（学习伙伴），可以帮助你理解工作坊材料并解答你自己的问题。Leader 有另一个独立的 Bud，用于协助整个工作坊。"
            : "I am your Learner Bud, here to help you with the workshop material and your own questions. The Leader has a separate Bud for the wider workshop.";
          runtime.recordPrivateMessage({
            message_id: "message-bud-identity-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: identityText,
            provider: "bud-identity",
            language: nativeLanguage === "zh" ? "zh" : "en",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (asksLearnerName(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-name-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerName ? "Your name is " + learnerName + "." : "I do not have your display name yet. Please reconnect with your name set, and I will use it here.",
            provider: "learner-identity-context",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksRootProblemMeaning(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-root-problem-definition-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: ROOT_PROBLEM_DEFINITION,
            provider: "learner-root-problem-definition",
            language: "en",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (asksLearnerUrgentSafetySupport(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-safety-support-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerUrgentSafetyReply(),
            provider: "learner-safety-support",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLearnerEmotionalSupport(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-emotional-support-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerEmotionalSupportReply(),
            provider: "learner-emotional-support",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (isLearnerOffTaskQuestion(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-off-task-boundary-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerOffTaskReply(),
            provider: "learner-off-task-boundary",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksGroupMates(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-group-mates-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: groupMatesReply(roomDirectory, roomName, participantId, learnerName),
            provider: "breakout-allocation-context",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLearnerLocationQuestion(learnerText) && !asksLearnerNextStep(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-location-boundary-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerLocationBoundaryReply(learnerText),
            provider: "learner-location-boundary",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLearnerNextStep(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-next-step-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerNextStepReply(sourcePackStore, roomDirectory, roomName, participantId, learnerName, learnerText),
            provider: "learner-next-step-context",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLearnerUncertainty(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-uncertainty-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerUncertaintyReply(sourcePackStore, roomName),
            provider: "learner-uncertainty-context",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLearnerProgressStatus(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-progress-status-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerProgressStatusReply(runtime.getStateSnapshot(), roomName, participantId),
            provider: "learner-self-checkin-context",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (asksLearnerEvidenceBasis(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-evidence-basis-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: learnerEvidenceBasisReply(runtime.getStateSnapshot(), roomName, participantId),
            provider: "learner-evidence-basis",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (asksCurrentLesson(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-lesson-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: currentLessonReply(sourcePackStore, roomName),
            provider: "learner-workshop-context",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (isCasualLearnerMessage(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-casual-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: casualLearnerReply(learnerText),
            provider: "learner-bud-casual",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        const escalationRequested = result.decision.decision_type === "CREATE_FACILITATOR_SIGNAL";
        const sourceContext = learnerSourceContext(sourcePackStore, roomName, learnerText);
        const sourcePages = sourcePackStore.pages(roomName);
        const personalContext = isLearnerPersonalContext(learnerText);
        if (!escalationRequested && !personalContext && !hasAuthoritativeLearnerEvidence(sourceContext, sourcePages)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-no-authoritative-source-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: "I cannot answer that from the current workshop evidence yet. I can help once the active material or task is available, or you can tell me which task or sentence you mean.",
            provider: "learner-authoritative-source-required",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        if (!escalationRequested && asksAboutDocumentAccess(learnerText)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-document-access-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: documentAccessReply(sourcePackStore.pages(roomName)),
            provider: "source-pack-access",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
          });
        }
        const learnerGroupId = resolveParticipantGroup(roomDirectory, roomName, participantId);
        const scopedMemoryContext = cognition.learnerRetrieval(roomName, participantId, learnerGroupId, learnerText);
        const privateMemory = budMemoryStore.context(roomName, participantId);
        const learnerContext = learnerBudContext(runtime.getStateSnapshot(), sourcePackStore, roomName, participantId, learnerGroupId);
        const responseBrief = buildLearnerResponseBrief({
          question: learnerText,
          source_available: personalContext ? false : Boolean(sourceContext.text),
          group_id: learnerGroupId,
          personal_context: personalContext
        });
        const directSourceAnswer = !personalContext && Boolean(sourceContext.text);
        const localReply = escalationRequested ? null : await askLocalBud({
          workshopPrompt: currentPrompt(runtime.getStateSnapshot()),
          question: directSourceAnswer
            ? responseBrief
            : responseBrief + "\n\n[AUTHORITATIVE LEARNER WORKSHOP CONTEXT]\n" + learnerContext + "\n\n[SCOPED LEARNER BUD CONTEXTUAL MEMORY]\n" + scopedMemoryContext + "\n\n[PRIVATE LEARNER BUD MEMORY]\n" + privateMemory,
          sourceContext: personalContext ? privateMemorySourceContext(privateMemory) : sourceContext,
          source_context_chars: 2200,
          question_chars: 1600,
          max_tokens: Math.min(LEARNER_BUD_BEHAVIOR.max_tokens, 140),
          persona_name: "Learner Bud",
          timeout_ms: 90000,
          system: directSourceAnswer
            ? learnerSourceAnswerSystem(nativeLanguage)
            : LEARNER_BUD_BEHAVIOR.system + " You are speaking privately with one learner. Stay in Learner Bud voice. Before answering, identify the supplied source, task state, or permitted learner context that supports the answer. If none supports a workshop-specific answer, say what cannot be confirmed instead of guessing. Never start with a generic greeting unless the learner greeted you. Write the final answer in English; the application will translate it into the learner's selected native language.",
          audience: "learner"
        });
        budMemoryStore.append(roomName, participantId, "learner", learnerMemoryText(originalText, learnerText, nativeLanguage));
        if (escalationRequested) {
          runtime.recordPrivateMessage({
            message_id: "message-escalation-confirmation-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: "I've notified the facilitator that you requested help. Your private message was not shared.",
            created_at: new Date().toISOString()
          });
        }
        if (localReply && isUsableLearnerBudReply(localReply.text)) {
          const normalizedReply = personalContext && asksUnknownPersonalFact(learnerText) && !hasUnknownPersonalFactBoundary(localReply.text)
            ? unknownPersonalFactReply(learnerText, currentPrompt(runtime.getStateSnapshot()))
            : normalizeLearnerBudReply(localReply.text);
          const replyText = directSourceAnswer && nativeLanguage === "zh"
            ? normalizeChineseBudReply(normalizedReply)
            : normalizedReply;
          budMemoryStore.append(roomName, participantId, "bud", replyText);
          runtime.recordPrivateMessage({
            message_id: "message-qwen-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: replyText,
            provider: localReply.provider,
            latency_ms: localReply.latency_ms,
            language: directSourceAnswer && nativeLanguage === "zh" ? "zh" : "en",
            created_at: new Date().toISOString()
          });
        } else {
          runtime.recordPrivateMessage({
            message_id: "message-bud-grounding-fallback-" + Date.now(),
            scope: "private_participant_ai",
            target_id: participantId,
            sender: "bud",
            text: learnerGroundingFallbackReply(sourcePages, currentPrompt(runtime.getStateSnapshot())),
            provider: "learner-source-grounding-fallback",
            created_at: new Date().toISOString()
          });
        }
        sendJson(res, {
          result: summarizeResult(result),
          state: await localizeBudState(learnerState(runtime, participantId, roomName), nativeLanguage, budReplyTranslations)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/participant-summary") {
      return readJson(req, res, async function (body) {
        const participantId = String(body.participant_id || config.participant_id).trim();
        return sendJson(res, {
          summary: { sent: false, reason: "support-is-signal-driven" },
          state: learnerState(runtime, participantId, cleanRoomName(body.room_name || DEFAULT_ROOM))
        });
        /* Legacy periodic-summary implementation retained below for reference only.
        const now = Date.now();
        const lastSent = summaryLastSentAt[participantId] || 0;
        if (now - lastSent < 90 * 1000) {
          return sendJson(res, {
            summary: { sent: false, reason: "cooldown" },
            state: learnerState(runtime, participantId)
          });
        }

        const snapshot = runtime.getStateSnapshot();
        const recentSharedContext = snapshot.workshop.evidence_index
          .filter(function (item) {
            return item.scope !== "private_participant_ai" && item.text;
          })
          .slice(-5)
          .map(function (item) { return item.text; });
        const contextNote = recentSharedContext.length
          ? "Recent shared workshop context:\n- " + recentSharedContext.join("\n- ")
          : "There is no recent shared workshop context beyond the current prompt.";
        const localReply = await askLocalBud({
          workshopPrompt: currentPrompt(snapshot),
          question: "Give the learner a brief private progress summary for a periodic check-in. " +
            "Use only the current workshop prompt and recent shared context. Mention the current focus, " +
            "one concrete next step, and invite green, yellow, or red self-reporting. Keep it to two short sentences.\n\n" +
            contextNote,
          sourceContext: sourcePackStore.context(body.room_name || DEFAULT_ROOM, currentPrompt(snapshot)),
          max_tokens: LEARNER_BUD_BEHAVIOR.max_tokens,
          system: LEARNER_BUD_BEHAVIOR.system
        });
        const fallbackText = "Quick check-in: the workshop is currently focused on " +
          (currentPrompt(snapshot) || "the current activity") +
          ". Keep working on that focus, and use the buttons or your private message if anything feels unclear.";
        summaryLastSentAt[participantId] = now;
        runtime.recordPrivateMessage({
          message_id: "message-periodic-summary-" + now,
          target_id: participantId,
          sender: "bud",
          message_type: "periodic_summary",
          text: localReply ? localReply.text : fallbackText,
          provider: localReply ? localReply.provider : "fallback",
          latency_ms: localReply ? localReply.latency_ms : null,
          created_at: new Date().toISOString()
        });
        sendJson(res, {
          summary: { sent: true, message_type: "periodic_summary" },
          state: learnerState(runtime, participantId)
        });
        */
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator-message") {
      return readJson(req, res, async function (body) {
        const text = String(body.text || "").trim();
        if (!text) return sendJson(res, { error: "Message text is required" }, 400);
        const leaderName = String(body.leader_name || "Leader").trim() || "Leader";
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        const nativeLanguage = normalizeLanguage(body.native_language) || "en";
        facilitatorRoomByTarget["facilitator-1"] = roomName;
        runtime.activeFacilitatorRoom = roomName;
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-facil-bud-message-" + Date.now(),
          type: "participant_message",
          source: "facilitator-web",
          privacy_scope: "private_facilitator_ai",
          actor: { actor_type: "facilitator", participant_id: "facilitator-1" },
          payload: {
            message_id: "message-facil-bud-user-" + Date.now(),
            text: text,
            language: nativeLanguage
          }
        }));
        runtime.recordPrivateMessage({
          message_id: "message-facil-bud-user-" + Date.now(),
          scope: "private_facilitator_ai",
          target_id: "facilitator-1",
          sender: "facilitator",
          text: text,
          created_at: new Date().toISOString()
        });
        if (isLikelyUnintelligible(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-clarify-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: "I'm sorry, I don't understand. Could you say that again?",
            provider: "intelligibility-guard",
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (/\b(which bud|what bud|are you the leader|leader bud|facil(?:-| )bud|facilitator bud)\b/i.test(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-leader-bud-identity-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "leader-bud",
            text: "I am Leader Bud, " + leaderName + "'s private workshop partner.",
            provider: "leader-bud-identity",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLeaderName(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-leader-bud-name-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: leaderName === "Leader" ? "I do not have your name yet. Add it in the Leader setup and I will use it here." : "Your name is " + leaderName + ".",
            provider: "leader-identity-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (/\b(are you online|are you there|you online|is bud online|bud online|can you hear me)\b/i.test(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-status-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: "Yes, I am online and ready to help.",
            provider: "bud-status",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksSensitiveDemographicCount(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-sensitive-demographic-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: "I can't identify or count learners by sensitive personal attributes. I can help with attendance, participation signals, or who may need support instead.",
            provider: "privacy-guard",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksPersonalSensitiveIdentity(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-personal-identity-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: personalSensitiveIdentityReply(text),
            provider: "personal-identity-guard",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksRecentLeaderQuestion(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-recent-question-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: recentLeaderQuestionReply(runtime.getStateSnapshot()),
            provider: "leader-chat-recall",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksUnsupportedMindReading(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-mind-reading-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: unsupportedMindReadingReply(text),
            provider: "evidence-boundary",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksNegativeLearnerLabel(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-learner-label-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: negativeLearnerLabelReply(text),
            provider: "learner-dignity-guard",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksBullyingOrHostileAction(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-hostility-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: bullyingOrHostileActionReply(text),
            provider: "hostility-guard",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (isFrustratedAtBud(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-frustration-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: "Fair. I may be missing the mark. Tell me what you wanted, or give me one concrete task and I'll tighten up.",
            provider: "leader-frustration",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLeaderDistressOrSelfDoubt(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-leader-support-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: leaderDistressOrSelfDoubtReply(text),
            provider: "leader-support",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksLeaderNextStep(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-next-step-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: leaderNextStepReply(sourcePackStore, roomName),
            provider: "leader-next-step",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksSchedule(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-schedule-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: scheduleReply(sourcePackStore, roomName),
            provider: "schedule-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (isCasualLeaderMessage(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-casual-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: casualLeaderReply(text),
            provider: "leader-bud-casual",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        const attendance = rememberAttendanceContext(attendanceByRoom, roomName, body.attendance_context);
        if (asksAttendanceQuestion(text, runtime.getStateSnapshot())) {
          const attendanceReply = attendance ? attendanceCountReply(attendance) : attendanceUnavailableReply();
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-attendance-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: attendanceReply,
            provider: "attendance-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksNamedAttendance(text)) {
          const peopleMemory = cognition.peopleRetrieval(roomName, text);
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-named-attendance-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: attendance ? namedAttendanceReply(text, attendance, peopleMemory) : attendanceUnavailableReply(),
            provider: "attendance-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksNamedBreakoutAssignment(text, runtime.getStateSnapshot())) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-breakout-assignment-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: namedBreakoutAssignmentReply(roomDirectory, roomName, text, runtime.getStateSnapshot()),
            provider: "breakout-allocation-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksNamedLearnerWellbeing(text)) {
          const peopleMemory = cognition.peopleRetrieval(roomName, text);
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-learner-status-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: attendance ? namedLearnerWellbeingReply(text, attendance, runtime.getStateSnapshot(), peopleMemory) : attendanceUnavailableReply(),
            provider: "learner-status-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksRoomLearnerStatus(text) || asksRoomLearnerStatusFollowup(text, runtime.getStateSnapshot())) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-room-status-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: roomLearnerStatusReply(runtime.getStateSnapshot(), roomName, attendance),
            provider: "room-status-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksEvidenceBasis(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-evidence-basis-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: evidenceBasisReply(runtime.getStateSnapshot(), attendance),
            provider: "evidence-basis",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksCurrentLesson(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-lesson-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: currentLessonReply(sourcePackStore, roomName),
            provider: "workshop-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksToExplainPrevious(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-followup-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: explainPreviousLeaderContext(runtime.getStateSnapshot(), sourcePackStore, roomName),
            provider: "leader-followup-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        if (asksSharedChat(text)) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-shared-chat-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: sharedChatReply(text, runtime.getStateSnapshot(), roomName),
            provider: "shared-chat-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        const sourceContext = leaderSourceContext(sourcePackStore, roomName, text);
        const roomContext = leaderBudContext(runtime.getStateSnapshot(), roomDirectory, sourcePackStore, roomName);
        const memoryContext = cognition.leaderRetrieval(roomName, text);
        const sourcePages = sourcePackStore.pages(roomName);
        const personalContext = isLearnerPersonalContext(text);
        const privateLeaderMemory = budMemoryStore.context(roomName, "leader");
        if (!personalContext && !hasAuthoritativeLeaderEvidence(sourceContext, sourcePages)) {
          runtime.recordPrivateMessage({
            message_id: "message-leader-bud-no-authoritative-source-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "leader-bud",
            text: "I cannot confirm that from the current workshop sources. I can use the attendance record, uploaded materials, learning plan, shared chat, or live presence once the relevant source is available.",
            provider: "authoritative-source-required",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations) });
        }
        const responseBrief = buildLeaderResponseBrief({
          question: text,
          source_status: sourceContext.status,
          has_plan: Boolean(String(sourcePages.learning_plan || "").trim()),
          personal_context: personalContext
        });
        const directSourceAnswer = !personalContext && Boolean(sourceContext.text);
        const localReply = await askLocalBud({
          workshopPrompt: currentPrompt(runtime.getStateSnapshot()),
          question: directSourceAnswer
            ? responseBrief
            : responseBrief + "\n\nAUTHORITATIVE WORKSHOP CONTEXT:\n[" + sourceContext.label.toUpperCase() + " IS SUPPLIED ABOVE BY THE APPLICATION]\n" + roomContext + "\n" + attendanceEvidence(attendance) + "\n[STRUCTURED CONTEXTUAL MEMORY RETRIEVAL]\n" + memoryContext + "\n\n[PRIVATE LEADER BUD MEMORY]\n" + privateLeaderMemory,
          sourceContext: personalContext ? privateMemorySourceContext(privateLeaderMemory) : sourceContext,
          source_context_chars: 2200,
          question_chars: 1800,
          max_tokens: LEADER_BUD_BEHAVIOR.max_tokens,
          persona_name: "Leader Bud",
          timeout_ms: 90000,
          system: directSourceAnswer
            ? leaderSourceAnswerSystem(leaderName, sourceContext.status)
            : LEADER_BUD_BEHAVIOR.system + " You are speaking privately with Leader " + leaderName + ". Stay in the Leader Bud voice even when source material is written to learners. If asked who you are, identify yourself exactly as Leader Bud, the Leader's private workshop partner. Before answering, silently identify which supplied evidence supports the answer. If no supplied evidence supports a workshop-specific answer, say briefly what cannot be confirmed instead of guessing. Write the final answer in English; the application will translate it into the Leader's selected native language."
        });
        budMemoryStore.append(roomName, "leader", "leader", text);
        if (localReply) {
          const replyText = personalContext && asksUnknownPersonalFact(text) && !hasUnknownPersonalFactBoundary(localReply.text)
            ? unknownPersonalFactLeaderReply(text)
            : normalizeLeaderBudReply(localReply.text);
          budMemoryStore.append(roomName, "leader", "bud", replyText);
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: replyText,
            provider: localReply.provider,
            latency_ms: localReply.latency_ms,
            created_at: new Date().toISOString()
          });
        } else {
          runtime.recordPrivateMessage({
            message_id: "message-leader-bud-grounding-fallback-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "leader-bud",
            text: "I couldn't retrieve a grounded answer from the current workshop context. Please try again or point me to the relevant document section.",
            provider: "source-grounding-fallback",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
        }
        sendJson(res, {
          result: summarizeResult(result),
          state: await localizeBudState(facilitatorState(runtime, roomName), nativeLanguage, budReplyTranslations)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator-invite") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || "").trim();
        const displayName = String(body.display_name || participantId).trim();
        if (!participantId) return sendJson(res, { error: "participant_id is required" }, 400);
        runtime.recordPrivateMessage({
          message_id: "message-facilitator-invite-" + Date.now(),
          target_id: participantId,
          sender: "facilitator",
          text: "Please come to me when you can. I would like to help.",
          created_at: new Date().toISOString()
        });
        runtime.recordFacilitatorSignal({
          signal_id: "signal-facilitator-invite-" + Date.now(),
          participant_id: participantId,
          type: "support_needed",
          summary: "Facilitator invited " + displayName + " to come for help.",
          severity: "low",
          evidence_refs: [],
          created_at: new Date().toISOString()
        });
        sendJson(res, { state: facilitatorState(runtime) });
      });
    }

    if (req.method === "POST" && req.url === "/api/group-message") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        participantRoomByTarget[participantId] = roomName;
        rememberLearnerName(learnerNamesByRoom, roomName, participantId, body.sender_display_name);
        const text = String(body.text || "").trim();
        if (!text) {
          return sendJson(res, { error: "Message text is required" }, 400);
        }
        const requestedGroupId = String(body.group_id || "group-main");
        const assignedGroupId = resolveParticipantGroup(roomDirectory, roomName, participantId);
        const groupId = requestedGroupId === "group-main"
          ? "group-main"
          : assignedGroupId === "group-main"
            ? "group-main"
            : assignedGroupId;
        const messageScope = groupId === "group-main" ? "public_shared" : "group_shared";
        const event = baseEvent({
          event_id: "ui-group-message-" + Date.now(),
          type: "participant_message",
          source: "web",
          privacy_scope: messageScope,
          actor: { actor_type: "participant", participant_id: participantId },
          payload: {
            message_id: "message-group-" + Date.now(),
            group_id: groupId,
            text: text,
            language: body.language || "en"
          }
        });
        const result = runtime.handleEvent(event);
        runtime.recordSharedMessage({
          message_id: event.payload.message_id,
          scope: messageScope,
          target_id: event.payload.group_id,
          room_name: roomName,
          sender_id: participantId,
          sender_display_name: String(body.sender_display_name || participantId),
          text: text,
          language: event.payload.language,
          created_at: event.occurred_at
        });
        sendJson(res, {
          event: event,
          result: summarizeResult(result),
          state: learnerState(runtime, participantId, roomName)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/dm") {
      return readJson(req, res, function (body) {
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        const senderId = String(body.sender_id || body.participant_id || "").trim();
        const recipientId = String(body.recipient_id || "").trim();
        const text = String(body.text || "").trim();
        if (!senderId || !recipientId || !text) {
          return sendJson(res, { error: "sender_id, recipient_id, and text are required" }, 400);
        }
        runtime.recordPrivateMessage({
          message_id: "message-dm-" + Date.now(),
          scope: "private_dm",
          room_name: roomName,
          sender_id: senderId,
          recipient_id: recipientId,
          sender_display_name: String(body.sender_display_name || senderId),
          recipient_display_name: String(body.recipient_display_name || recipientId),
          text: text,
          language: String(body.language || "en"),
          created_at: new Date().toISOString()
        });
        sendJson(res, { ok: true, room_name: roomName, messages: runtime.getStateSnapshot().messages.filter(function (message) {
          return message.scope === "private_dm" && message.room_name === roomName &&
            ((message.sender_id === senderId && message.recipient_id === recipientId) ||
             (message.sender_id === recipientId && message.recipient_id === senderId));
        }).slice(-100) });
      });
    }

    if (req.method === "POST" && req.url === "/api/comprehension-response") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-comprehension-" + Date.now(),
          type: "comprehension_check_response",
          source: "web",
          privacy_scope: "private_participant_ai",
          actor: { actor_type: "participant", participant_id: participantId },
          payload: {
            checkin_id: "ui-recap-001",
            recap_point_id: body.page_id || "ui-facilitator-prompt-001",
            response: body.response
          }
        }));
        sendJson(res, { result: summarizeResult(result), state: learnerState(runtime, participantId) });
      });
    }

    if (req.method === "POST" && req.url === "/api/task-comprehension-response") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || config.participant_id).trim();
        const roomName = cleanRoomName(body.room_name || DEFAULT_ROOM);
        participantRoomByTarget[participantId] = roomName;
        rememberLearnerName(learnerNamesByRoom, roomName, participantId, body.display_name);
        const taskId = String(body.task_id || "").trim();
        const response = String(body.response || "").trim();
        if (!taskId || !["green", "yellow", "red"].includes(response)) {
          return sendJson(res, { error: "Task id and response are required" }, 400);
        }
        const previousResponse = learnerTaskResponses(runtime.getStateSnapshot(), roomName, participantId)[taskId];
        const taskText = String(body.task_text || "").trim() || "Current task";
        runtime.recordTaskResponse({
          room_name: roomName,
          task_id: taskId,
          task_index: Number.isFinite(Number(body.task_index)) ? Number(body.task_index) : null,
          task_text: taskText,
          section: String(body.section || "").trim(),
          participant_id: participantId,
          display_name: String(body.display_name || participantId).trim(),
          response: response,
          updated_at: new Date().toISOString()
        });
        if (response === "yellow" || response === "red") {
          budMemoryStore.recordSupport(roomName, participantId, {
            status: "open",
            task: taskText,
            signal: response === "red" ? "marked as needing help" : "marked as somewhat clear"
          });
          if (previousResponse !== response) {
            runtime.recordPrivateMessage({
              message_id: "message-bud-support-signal-" + Date.now(),
              target_id: participantId,
              sender: "bud",
              text: response === "red"
                ? "I saw you marked \"" + taskText + "\" as needing help. Want a short explanation or a smaller first step?"
                : "I saw \"" + taskText + "\" is only somewhat clear. Which part would you like to make clearer?",
              provider: "support-signal-checkin",
              created_at: new Date().toISOString()
            });
          }
        } else if ((previousResponse === "yellow" || previousResponse === "red") && response === "green") {
          budMemoryStore.recordSupport(roomName, participantId, {
            status: "resolved",
            task: taskText,
            signal: "learner later marked the task as clear"
          });
        }
        sendJson(res, { ok: true, state: learnerState(runtime, participantId, roomName) });
      });
    }

    if (req.method === "POST" && req.url === "/api/task-complete") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-task-completed-" + Date.now(),
          type: "task_completed",
          source: "web",
          privacy_scope: "private_participant_ai",
          actor: { actor_type: "participant", participant_id: participantId },
          payload: { task_id: String(body.task_id || ""), page_id: String(body.page_id || "") }
        }));
        sendJson(res, { result: summarizeResult(result), state: learnerState(runtime, participantId) });
      });
    }

    if (req.method === "POST" && req.url === "/api/observe") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const results = runtime.observeParticipation({
          now: new Date().toISOString(),
          window_seconds: 600
        });
        sendJson(res, {
          observations: results.map(summarizeResult),
          state: learnerState(runtime, participantId)
        });
      });
    }

    if (req.method === "GET") {
      return serveStatic(req, res);
    }

    sendJson(res, { error: "Not found" }, 404);
  });

  return server;
}

function cleanRoomName(value) {
  const name = String(value || "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(name) ? name : "";
}

function cleanGroupId(value) {
  const groupId = String(value || "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(groupId) ? groupId : "";
}

function captionRoomName(roomName, groupId) {
  const baseRoom = cleanRoomName(roomName) || DEFAULT_ROOM;
  const group = cleanGroupId(groupId) || "group-main";
  return group === "group-main" ? baseRoom : baseRoom + "::" + group;
}

function mainRoomName(captionScope) {
  return String(captionScope || DEFAULT_ROOM).split("::")[0] || DEFAULT_ROOM;
}

function checkinRecipients(diagnostics, roomDirectory, captionScope) {
  const scopeParts = String(captionScope || DEFAULT_ROOM).split("::");
  const roomName = cleanRoomName(scopeParts[0]) || DEFAULT_ROOM;
  const groupId = cleanGroupId(scopeParts[1]) || "group-main";
  const connections = diagnostics && diagnostics.connections || {};

  return Object.keys(connections).map(function (participantId) {
    return connections[participantId];
  }).filter(function (connection) {
    if (!connection || connection.role === "facilitator" || connection.room_name !== roomName) return false;
    return groupId === "group-main" ||
      resolveParticipantGroup(roomDirectory, roomName, connection.participant_id) === groupId;
  });
}

const CAPTION_TRANSLATION_ATTEMPTS = 3;

function captionEntries(entries, targetLanguage, inFlight, callback) {
  if (!entries.length) return callback([], 0);

  let nextAfter = 0;
  let stillResolving = false;

  const rows = entries.map(function (entry) {
    const resolved = captionTranslation(entry, targetLanguage, inFlight);
    if (!resolved.pending && !stillResolving) {
      nextAfter = entry.sequence;
    } else {
      stillResolving = true;
    }
    return {
      sequence: entry.sequence,
      entry_id: entry.entry_id,
      participant_id: entry.participant_id,
      display_name: entry.display_name,
      role: entry.role,
      original_text: entry.original_text,
      original_language: entry.original_language,
      translated_text: resolved.text || null,
      target_language: resolved.text ? targetLanguage : null,
      translation_pending: resolved.pending,
      created_at: entry.created_at
    };
  });

  callback(rows, nextAfter);
}

function captionTranslation(entry, targetLanguage, inFlight) {
  if (!targetLanguage || targetLanguage === entry.original_language) {
    return { text: null, pending: false };
  }
  if (entry.target_language === targetLanguage && entry.translated_text) {
    return { text: entry.translated_text, pending: false };
  }
  if (entry.translations[targetLanguage]) {
    return { text: entry.translations[targetLanguage], pending: false };
  }

  entry.translation_attempts = entry.translation_attempts || {};
  const attempts = entry.translation_attempts[targetLanguage] || 0;
  if (attempts >= CAPTION_TRANSLATION_ATTEMPTS) {
    return { text: null, pending: false };
  }

  const key = entry.entry_id + "|" + targetLanguage;
  if (!inFlight[key]) {
    entry.translation_attempts[targetLanguage] = attempts + 1;
    inFlight[key] = true;
    translateText(entry.original_text, entry.original_language || "en", targetLanguage, {}, function (error, translation) {
      if (!error && translation && translation.translated_text) {
        entry.translations[targetLanguage] = translation.translated_text;
      }
      delete inFlight[key];
    });
  }
  return { text: null, pending: true };
}

function attendanceEvidence(attendance) {
  if (!attendance || typeof attendance !== "object") {
    return "Room attendance evidence: unavailable. Do not infer attendance.";
  }
  const registeredPresent = Number(attendance.registered_present);
  const registeredAbsent = Number(attendance.registered_absent);
  const guestsPresent = Number(attendance.guests_present);
  const values = [registeredPresent, registeredAbsent, guestsPresent];
  if (values.some(function (value) { return !Number.isFinite(value) || value < 0; })) {
    return "Room attendance evidence: unavailable or incomplete. Do not infer attendance.";
  }
  return "Room attendance evidence: " + registeredPresent +
    " registered learners present, " + registeredAbsent +
    " registered learners absent, and " + guestsPresent +
    " guests present.";
}

function rememberAttendanceContext(attendanceByRoom, roomName, candidate) {
  if (!candidate || typeof candidate !== "object") {
    return attendanceByRoom[roomName] || null;
  }
  const registeredPresent = Number(candidate.registered_present);
  const registeredAbsent = Number(candidate.registered_absent);
  const guestsPresent = Number(candidate.guests_present);
  if ([registeredPresent, registeredAbsent, guestsPresent].some(function (value) {
    return !Number.isFinite(value) || value < 0;
  })) {
    return attendanceByRoom[roomName] || null;
  }
  attendanceByRoom[roomName] = Object.assign({}, candidate, {
    registered_present: registeredPresent,
    registered_absent: registeredAbsent,
    guests_present: guestsPresent,
    updated_at: new Date().toISOString()
  });
  return attendanceByRoom[roomName];
}

function asksAttendanceQuestion(question, snapshot) {
  const text = String(question || "").toLowerCase();
  const asksForCount = /\b(how many|number of|count of|how much)\b/.test(text);
  const mentionsAttendance =
    /\b(attendance|present|absent|learner|learners|student|students|participant|participants|guest|guests|roster)\b/.test(text) ||
    /\bparticip[a-z]{2,8}\b/.test(text);
  if (asksForCount && mentionsAttendance) return true;
  return asksForCount && /\b(now|there|currently|right now)\b/.test(text) &&
    lastLeaderBudProvider(snapshot) === "attendance-context";
}

function lastLeaderBudProvider(snapshot) {
  const messages = (snapshot && snapshot.messages || []).filter(function (message) {
    return message.scope === "private_facilitator_ai" &&
      (message.sender === "facil-bud" || message.sender === "leader-bud");
  });
  return messages.length ? messages[messages.length - 1].provider || "" : "";
}

function attendanceCountReply(attendance) {
  const registeredPresent = Number(attendance.registered_present) || 0;
  const registeredAbsent = Number(attendance.registered_absent) || 0;
  const guestsPresent = Number(attendance.guests_present) || 0;
  const presentTotal = registeredPresent + guestsPresent;
  return "There are currently " + presentTotal + " learners present: " + registeredPresent +
    " registered learners and " + guestsPresent + " guests." +
    (registeredAbsent ? " " + registeredAbsent + " registered learners are absent." : "");
}

function attendanceUnavailableReply() {
  return "I do not have a current attendance record for this room, so I cannot confirm the count. Refresh or provide the attendance list and I will use that source.";
}

function asksSensitiveDemographicCount(value) {
  const text = String(value || "").toLowerCase();
  return /\b(how many|number of|count of|which|who)\b/.test(text) &&
    /\b(gay|straight|lesbian|bisexual|transgender|trans|queer|religion|muslim|christian|hindu|buddhist|race|ethnicity|disabled|disability)\b/.test(text);
}

function asksPersonalSensitiveIdentity(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?]+$/g, "");
  return /\b(am i|do i seem|could i be|what if i am|i think i might be)\b/.test(text) &&
    /\b(gay|straight|lesbian|bisexual|bi|transgender|trans|queer|religious|muslim|christian|hindu|buddhist|disabled|autistic|neurodivergent|depressed|anxious|adhd)\b/.test(text);
}

function personalSensitiveIdentityReply(value) {
  const text = String(value || "").toLowerCase();
  if (/\b(gay|straight|lesbian|bisexual|bi|queer)\b/.test(text)) {
    return "I can't decide that for you. If you're wondering about it, that's okay; take your time with what feels true and safe for you.";
  }
  if (/\b(transgender|trans)\b/.test(text)) {
    return "I can't decide that for you. If you're exploring your gender, it's okay to take your time and talk it through with someone you trust.";
  }
  if (/\b(depressed|anxious|adhd|autistic|neurodivergent)\b/.test(text)) {
    return "I can't diagnose that for you. If it's weighing on you, it may be worth talking with someone qualified or someone you trust.";
  }
  return "I can't decide a personal identity for you. I can listen, reflect back what you share, and keep the workshop support steady.";
}

function asksRecentLeaderQuestion(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?]+$/g, "");
  return /\b(what did i just ask|what was my last question|what did i say|what was i asking)\b/.test(text);
}

function recentLeaderQuestionReply(snapshot) {
  const last = recentLeaderQuestion(snapshot);
  if (!last) return "I don't have an earlier Leader question in this chat yet.";
  return "You just asked: \"" + compactText(last, 180) + "\"";
}

function recentLeaderQuestion(snapshot) {
  const messages = Array.isArray(snapshot && snapshot.messages) ? snapshot.messages : [];
  let skippedCurrent = false;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.scope !== "private_facilitator_ai" || message.sender !== "facilitator") continue;
    const text = String(message.text || "").trim();
    if (!text) continue;
    if (!skippedCurrent) {
      skippedCurrent = true;
      continue;
    }
    return text;
  }
  return "";
}

function asksUnsupportedMindReading(value) {
  const text = String(value || "").toLowerCase();
  return /\b(what|why|how)\b/.test(text) &&
    /\b(thinking|feeling|intending|planning|believes|wants|hiding)\b/.test(text);
}

function unsupportedMindReadingReply(value) {
  const name = extractPersonSubject(value) || "that learner";
  return "I can't know what " + name + " is thinking. I can help you look at observable signals, messages, attendance, or support requests instead.";
}

function asksNegativeLearnerLabel(value) {
  const text = String(value || "").toLowerCase();
  if (/^\s*this\s+is\b/.test(text)) return false;
  return /\b(who|which|is|are|tell me|show me)\b/.test(text) &&
    /\b(lazy|weak|dumb|stupid|bad|worst|problem learner|slow)\b/.test(text);
}

function negativeLearnerLabelReply(value) {
  const name = extractPersonSubject(value);
  if (name) {
    return "I wouldn't label " + name + " that way. I can help you look for concrete support signals, confusion, missing work, or participation patterns.";
  }
  return "I wouldn't rank or label learners that way. I can help identify who may need support using observable signals and workshop evidence.";
}

function asksBullyingOrHostileAction(value) {
  const text = String(value || "").toLowerCase();
  return /\b(help me|i want to|let's|can you|tell me how to|make them)\b/.test(text) &&
    /\b(bully|humiliate|shame|harass|mock|insult|punish|hurt|target|embarrass)\b/.test(text);
}

function bullyingOrHostileActionReply() {
  return "I can't help target or humiliate anyone. I can help you de-escalate, set a firm boundary, or turn this into a support plan.";
}

function isFrustratedAtBud(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[.!?]+$/g, "");
  return /^(you suck|this sucks|bad bot|bad bud|not helpful|useless|you are useless|you're useless|that was useless)$/.test(text);
}

function asksLeaderDistressOrSelfDoubt(value) {
  const text = String(value || "").toLowerCase();
  return /\b(i am|i'm|i feel|i hate|i want|this is|am i|do i seem)\b/.test(text) &&
    /\b(bored|overwhelmed|stuck|lost|dumb|stupid|bad at this|hate this workshop|quit|give up|depressed|anxious|panic)\b/.test(text);
}

function leaderDistressOrSelfDoubtReply(value) {
  const text = String(value || "").toLowerCase();
  if (/\bthis is stupid\b/.test(text)) {
    return "Yeah, this may feel clunky. Give me one part to untangle, or ask me to turn it into a clearer next step.";
  }
  if (/\b(dumb|stupid|bad at this)\b/.test(text)) {
    return "You are not dumb. This is just a messy moment; give me one concrete thing to untangle, or ask me to simplify the next step.";
  }
  if (/\b(overwhelmed|panic|anxious|lost|stuck)\b/.test(text)) {
    return "Let's slow it down. Pick one thing: lesson plan, learner signals, or source material, and I'll help you make the next move.";
  }
  if (/\b(quit|give up|hate this workshop|bored)\b/.test(text)) {
    return "Fair. Let's make it smaller: I can turn the current lesson into one clear next action or check what learners need right now.";
  }
  if (/\b(depressed|anxious)\b/.test(text)) {
    return "I'm sorry you're feeling that. I can't diagnose it, but we can make the next few minutes smaller: pause, breathe, and pick one concrete thing for me to help with.";
  }
  return "I hear you. Tell me the part that feels messy, and I'll help make it smaller.";
}

function extractPersonSubject(value) {
  const text = String(value || "").trim();
  const match = text.match(/\b(?:is|are|what is|what's|why is|how is)\s+([a-z][a-z' -]{1,40}?)\s+(?:thinking|feeling|intending|planning|hiding|lazy|weak|dumb|stupid|bad|slow)\b/i);
  return match && match[1] ? titleCaseName(match[1]) : "";
}

function asksLeaderNextStep(value) {
  const text = String(value || "").toLowerCase();
  return /\b(what should i do next|what now|next step|where do i start|help me move forward)\b/.test(text);
}

function leaderNextStepReply(sourcePackStore, roomName) {
  const material = sourcePackStore.pages(roomName);
  if (String(material.learning_plan || "").trim()) {
    return "Start with the first learner task in the locked plan, then check whether anyone is stuck before moving on.";
  }
  if (material.pages && material.pages.length) {
    return "Start by turning the uploaded source material into one learner task and one quick comprehension check.";
  }
  return "Start by uploading or locking the source material, then I can help turn it into a learner task and a quick check.";
}

function asksSchedule(value) {
  const text = String(value || "").toLowerCase();
  return /\b(schedule|timeline|agenda|timing|time plan)\b/.test(text);
}

function scheduleReply(sourcePackStore, roomName) {
  const material = sourcePackStore.pages(roomName);
  const plan = String(material.learning_plan || "").trim();
  if (plan && /\bestimated time\b/i.test(plan)) {
    return "I can see timing inside the locked learning plan. It looks like the lesson is broken into short sections with estimated times, but I don't see a separate full schedule.";
  }
  return "I don't see a separate schedule yet. I can help build one from the lesson plan or uploaded material.";
}

function isCasualLeaderMessage(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?]+$/g, "");
  if (!text) return false;
  if (/^(hi|hello|hey|yo|thanks|thank you|ok|okay|cool|great|nice|got it|alright|lol ok|haha ok|sure|yep|yes)$/.test(text)) return true;
  if (/^(hi|hello|hey|yo)(?:\s+(?:there|yo|bud|everyone|all))?$/.test(text)) return true;
  if (/^(how'?s it going|how are you|you good|all good|how is bud|how are things)$/.test(text)) return true;
  if (/^(what are you doing|are you alive|are you real|you there|still there)$/.test(text)) return true;
  return text.length <= 100 &&
    /\b(coffee|tea|snack|lunch|keys|phone|water bottle|notes|notebook)\b/.test(text) &&
    !/\b(learner|student|participant|lesson|workshop|source|material|plan|attendance|task)\b/.test(text);
}

function casualLeaderReply(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[’‘]/g, "'");
  if (/^(hi|hello|hey|yo)(?:\s+(?:there|yo|bud|everyone|all))?[.!?]*$/.test(text)) {
    return "Hey, I'm here. What do you want to look at?";
  }
  if (/^(lol ok|haha ok|ok|okay|cool|great|nice|got it|alright|sure|yep|yes)$/.test(text)) {
    return "Got it. I'm here when you want the next move.";
  }
  if (/^(thanks|thank you)\b/.test(text)) {
    return "You are welcome. I am here with the workshop context when you need me.";
  }
  if (/\b(how'?s it going|how are you|you good|all good|how is bud|how are things)\b/.test(text)) {
    return "I'm here and ready. Want me to check the learner signals, clean up the lesson plan, or look at the workshop context?";
  }
  if (/\b(what are you doing|are you alive|are you real|you there|still there)\b/.test(text)) {
    return "I'm here with you. I can read the room, check the lesson plan, or help decide the next move.";
  }
  if (/\bcoffee\b/.test(text)) {
    return "I wish I knew. I can keep the workshop thread warm while you hunt it down.";
  }
  if (/\b(tea|snack|lunch|keys|phone|water bottle)\b/.test(text)) {
    return "I don't know where that is, but I can hold the workshop thread while you check.";
  }
  if (/\b(notes|notebook)\b/.test(text)) {
    return "I don't know where your notes are. I can help reconstruct the thread from the uploaded material and lesson plan.";
  }
  return "Hi, I am Leader Bud, here to help with your workshop context and learners.";
}

function asksNamedAttendance(value) {
  const text = String(value || "").trim().toLowerCase();
  return /\b(is|are|was|were|has|have|did)\b/.test(text) &&
    /\b(in|inside|attending|present|here|joined|join|workshop|room|class|session)\b/.test(text) &&
    extractLikelyPersonName(text);
}

function namedAttendanceReply(question, attendance, peopleMemory) {
  const name = extractLikelyPersonName(question);
  const presentNames = namesFromAttendance(attendance.registered_present_names).concat(namesFromAttendance(attendance.guest_present_names));
  const absentNames = namesFromAttendance(attendance.registered_absent_names);
  const presentMatch = findNameMatch(name, presentNames);
  if (presentMatch) return presentMatch + " is marked present in the workshop attendance list.";
  const absentMatch = findNameMatch(name, absentNames);
  if (absentMatch) return absentMatch + " is on the registered list but is currently marked absent.";
  const ledgerMatch = findLedgerPresenceMatch(name, peopleMemory);
  if (ledgerMatch) return ledgerMatch + " appears in the live presence ledger for this workshop.";
  if (presentNames.length || absentNames.length) {
    return "I do not see " + name + " in the current attendance list. I can only answer from the roster and live presence data supplied to Leader Bud.";
  }
  return "I only have attendance counts right now, not participant names, so I cannot confirm whether " + name + " is in the workshop.";
}

function asksNamedBreakoutAssignment(question, snapshot) {
  const text = String(question || "").toLowerCase();
  if (!/\b(breakout|group|room)\b/.test(text)) return false;
  if (extractLikelyPersonName(question)) return true;
  if (!/\b(which|what|where|yes|and)\b/.test(text)) return false;
  const previous = mostRecentLeaderBudMessage(snapshot);
  return Boolean(previous && previous.provider === "attendance-context" && namedPersonFromAttendanceReply(previous.text));
}

function namedBreakoutAssignmentReply(roomDirectory, roomName, question, snapshot) {
  const previous = mostRecentLeaderBudMessage(snapshot);
  const name = extractLikelyPersonName(question) || namedPersonFromAttendanceReply(previous && previous.text);
  if (!name) return "Which learner do you mean? I can check the current breakout allocation once you name them.";
  const room = roomDirectory.rooms[roomName] || {};
  const assignment = (room.breakout_assignments || []).find(function (item) {
    return (item.members || []).some(function (member) {
      return normalizeName(member.display_name) === normalizeName(name) ||
        normalizeName(member.participant_id) === normalizeName(name);
    });
  });
  if (!assignment) return name + " is not assigned to a breakout room yet.";
  const label = String(assignment.group_id || "breakout room").replace(/-/g, " ");
  return name + " is assigned to " + label + ".";
}

function namedPersonFromAttendanceReply(value) {
  const match = String(value || "").match(/^(.+?) is marked (?:present|absent) in the workshop attendance list\./i);
  return match && match[1] ? titleCaseName(match[1]) : "";
}

function asksNamedLearnerWellbeing(value) {
  const text = String(value || "").trim().toLowerCase();
  return /\b(is|are|how is|how are)\b/.test(text) &&
    /\b(ok|okay|alright|doing|coping|fine|progress|stuck|struggling|understanding)\b/.test(text) &&
    extractLikelyLearnerStatusName(text);
}

function namedLearnerWellbeingReply(question, attendance, snapshot, peopleMemory) {
  const name = extractLikelyLearnerStatusName(question);
  const presentNames = namesFromAttendance(attendance.registered_present_names).concat(namesFromAttendance(attendance.guest_present_names));
  const absentNames = namesFromAttendance(attendance.registered_absent_names);
  const presentMatch = findNameMatch(name, presentNames);
  const absentMatch = findNameMatch(name, absentNames);
  const ledgerMatch = findLedgerPresenceMatch(name, peopleMemory);
  if (absentMatch) return absentMatch + " is currently marked absent, so I do not have live workshop progress evidence for them.";
  if (!presentMatch && !ledgerMatch) return "I do not see " + name + " in the current attendance or presence context, so I cannot assess how they are doing.";
  const signals = (snapshot.workshop && snapshot.workshop.facilitator_signals || []).filter(function (signal) {
    return normalizeName(signal.participant_id).indexOf(normalizeName(name)) !== -1 ||
      normalizeName(signal.summary).indexOf(normalizeName(name)) !== -1;
  }).slice(-2);
  if (signals.length) {
    return (presentMatch || ledgerMatch) + " is marked present. I see this public support signal: " + compactText(signals.map(function (signal) { return signal.summary; }).join(" "), 220);
  }
  return (presentMatch || ledgerMatch) + " is marked present, but I do not have enough public comprehension or participation evidence yet to say whether they are doing ok.";
}

function asksRoomLearnerStatus(value) {
  const text = String(value || "").toLowerCase();
  return /\b(how are|how's|are|is)\b/.test(text) &&
    /\b(students?|learners?|participants?|class|everyone|the room)\b/.test(text) &&
    /\b(today|doing|ok|okay|alright|coping|progress|engaged|understanding|going)\b/.test(text);
}

function roomLearnerStatusReply(snapshot, roomName, attendance) {
  const insights = taskInsightSummary(snapshot, roomName);
  const responses = insights.reduce(function (sum, task) { return sum + task.total; }, 0);
  const difficulty = insights.reduce(function (sum, task) { return sum + task.difficulty_count; }, 0);
  const clear = insights.reduce(function (sum, task) { return sum + task.counts.green; }, 0);
  const somewhatClear = insights.reduce(function (sum, task) { return sum + task.counts.yellow; }, 0);
  const needHelp = insights.reduce(function (sum, task) { return sum + task.counts.red; }, 0);
  const supportNames = namedTaskSupport(insights);
  const supportSignals = (snapshot.workshop && snapshot.workshop.facilitator_signals || []).filter(function (signal) {
    return signal && signal.severity !== "resolved";
  });
  const recentChat = roomChatStatus(snapshot, roomName);
  const attendanceNote = attendance && attendanceEvidence(attendance).indexOf("unavailable") === -1
    ? attendanceCountReply(attendance)
    : "";
  if (!responses) {
    return [
      attendanceNote,
      "I do not have task self-reports yet, so I cannot make a reliable whole-room judgement.",
      recentChat || "There are no recent public or breakout chat messages to add context.",
      "Quiet learners should remain unknown rather than assumed to be fine."
    ].filter(Boolean).join(" ");
  }
  return [
    attendanceNote,
    "Room insights show " + responses + " task check-in" + (responses === 1 ? "" : "s") + ": " +
      clear + " clear, " + somewhatClear + " somewhat clear, and " + needHelp + " needing help.",
    difficulty ? difficulty + " check-in" + (difficulty === 1 ? " indicates" : "s indicate") + " uncertainty or a need for support." : "No task check-in currently signals difficulty.",
    supportNames.length ? "Learners who explicitly requested support: " + supportNames.join(", ") + "." : "",
    supportSignals.length ? supportSignals.length + " public support signal" + (supportSignals.length === 1 ? " is" : "s are") + " open." : "No public support signals are open.",
    recentChat,
    "These are task and chat signals, not a judgement about every learner; anyone without a check-in remains unknown."
  ].filter(Boolean).join(" ");
}

function namedTaskSupport(insights) {
  const seen = {};
  return insights.reduce(function (names, task) {
    return names.concat((task.needs_support || []).map(function (item) {
      const key = item.participant_id + "|" + item.response + "|" + task.task_id;
      if (seen[key]) return "";
      seen[key] = true;
      return item.display_name + " (" + (item.response === "red" ? "needs help" : "somewhat clear") + " on " + compactText(task.task_text || "this task", 72) + ")";
    }).filter(Boolean));
  }, []);
}

function roomChatStatus(snapshot, roomName) {
  const messages = (snapshot.messages || []).filter(function (message) {
    return message.text && (message.scope === "public_shared" || message.scope === "group_shared") &&
      String(message.room_name || DEFAULT_ROOM) === roomName;
  });
  const recent = deduplicateSharedChatMessages(messages).slice(-2);
  if (!recent.length) return "";
  return "Recent shared chat: " + recent.map(function (message) {
    const speaker = message.sender_display_name || message.sender_id || "A participant";
    const location = message.target_id && message.target_id !== "group-main" ? " in " + message.target_id : " in the workshop chat";
    return speaker + location + " said, \"" + compactText(message.text, 150) + "\"";
  }).join(" ");
}

function asksRoomLearnerStatusFollowup(value, snapshot) {
  const text = String(value || "").toLowerCase();
  if (!/\bhow (?:are|r)\b/.test(text) || !/\b(they|them|students?|learners?|participants?|everyone)\b/.test(text) ||
      !/\b(doing|going|ok|okay|alright|coping|progress|engaged|understanding)\b/.test(text)) return false;
  const previous = mostRecentLeaderBudMessage(snapshot);
  return Boolean(previous && previous.provider === "room-status-context");
}

function asksEvidenceBasis(value) {
  const text = String(value || "").toLowerCase().trim();
  return /\b(how do you know|what makes you say that|what are you basing|what evidence|source for that)\b/.test(text);
}

function evidenceBasisReply(snapshot, attendance) {
  const messages = (snapshot && snapshot.messages || []).filter(function (message) {
    return message.scope === "private_facilitator_ai" &&
      (message.sender === "facil-bud" || message.sender === "leader-bud");
  });
  const previous = messages.length ? messages[messages.length - 1] : null;
  if (!previous) return "I do not have a previous claim to support. I can only use attendance, public task signals, shared chat, and the uploaded workshop materials.";
  if (previous.provider === "attendance-context") return "I used the current attendance record supplied to Leader Bud: registered learners present and absent, plus guests present.";
  if (previous.provider === "shared-chat-context") return "I used the recent public and breakout chat messages available to Leader Bud. I did not use private learner Bud conversations.";
  if (previous.provider === "room-status-context" || previous.provider === "learner-status-context") return "I used only current attendance and public task or support signals. I did not infer private feelings or assume that quiet learners are disengaged.";
  if (previous.provider && previous.provider.indexOf("qwen") !== -1) return "I do not have a reliable workshop source for that overall claim. I should not present it as a fact; I can check attendance, public task signals, or room chat instead.";
  return "I can support workshop claims only with the current attendance record, public task signals, shared chat, or uploaded materials. I do not infer a learner's state from the lesson document alone.";
}

function findLedgerPresenceMatch(name, peopleMemory) {
  const needle = normalizeName(name);
  if (!needle || !peopleMemory || /no relevant permitted ledger entries/i.test(peopleMemory)) return "";
  const lines = String(peopleMemory || "").split("\n");
  const match = lines.find(function (line) {
    return normalizeName(line).indexOf(needle) !== -1 && /\bconnected\b/i.test(line);
  });
  if (!match) return "";
  const nameMatch = match.match(/\|\s*([^|]+?)\s*\|[^|]*\|\s*[^|]*currently connected/i) ||
    match.match(/summary:\s*([^|.]+?)\s+is currently connected/i);
  return titleCaseName(nameMatch && nameMatch[1] ? nameMatch[1].trim() : name);
}

function extractLikelyLearnerStatusName(value) {
  const text = String(value || "").trim();
  const patterns = [
    /\bis\s+([a-z][a-z' -]{1,40}?)\s+(?:doing|ok|okay|alright|fine|stuck|struggling|understanding|making)\b/i,
    /\bhow\s+is\s+([a-z][a-z' -]{1,40}?)(?:\s+doing|\s+coping|\s+progressing|\s*$|\?)/i
  ];
  for (let index = 0; index < patterns.length; index += 1) {
    const match = text.match(patterns[index]);
    if (match && match[1]) return titleCaseName(match[1]);
  }
  return "";
}

function namesFromAttendance(value) {
  return Array.isArray(value)
    ? value.map(function (name) { return String(name || "").trim(); }).filter(Boolean).slice(0, 80)
    : [];
}

function findNameMatch(name, names) {
  const needle = normalizeName(name);
  return names.find(function (candidate) {
    const normalized = normalizeName(candidate);
    return normalized === needle || normalized.split(/\s+/).indexOf(needle) !== -1;
  }) || "";
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractLikelyPersonName(value) {
  const text = String(value || "").trim();
  const patterns = [
    /\bis\s+([a-z][a-z' -]{1,40}?)\s+(?:in|inside|attending|present|here|joined|joining|part of)\b/i,
    /\bhas\s+([a-z][a-z' -]{1,40}?)\s+(?:joined|arrived|come)\b/i,
    /\bdid\s+([a-z][a-z' -]{1,40}?)\s+(?:join|arrive|come)\b/i
  ];
  for (let index = 0; index < patterns.length; index += 1) {
    const match = text.match(patterns[index]);
    if (match && match[1]) return titleCaseName(match[1]);
  }
  return "";
}

function titleCaseName(value) {
  return String(value || "").replace(/\b[a-z]/gi, function (letter) { return letter.toUpperCase(); }).trim();
}

function asksCurrentLesson(value) {
  const text = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  return (
    /\b(?:what(?:'s| is)?|which)\s+(?:is\s+)?(?:today(?:'s)?|the\s+current|this)\s+(?:lesson|topic|learning plan|workshop)(?:\s+about)?\b/.test(text) ||
    /\b(?:what(?:'s| is)?|which)\s+(?:lesson|topic|learning plan|workshop)\s+(?:are we|is|are|comes)\b/.test(text) ||
    /\b(?:tell me about|summari[sz]e|recap)\s+(?:today(?:'s)?|the\s+current|this)?\s*(?:lesson|topic|learning plan|workshop|workshop material|source material)\b/.test(text)
  );
}

function currentLessonReply(sourcePackStore, roomName) {
  const material = sourcePackStore.pages(roomName);
  const plan = String(material.learning_plan || "").trim();
  const sourceText = material.pages && material.pages.length
    ? material.pages.map(function (page) { return page.text; }).filter(Boolean).join("\n\n")
    : "";
  const sourceFocus = workshopFocusFromMaterial(sourceText);
  if (sourceFocus) {
    return sourceFocus + (plan
      ? " The locked plan turns that into reading the material, asking about unclear parts, completing the task, and checking in."
      : "");
  }
  if (plan) {
    return "Today's locked learning plan is: " + compactText(plan, 520);
  }
  if (material.pages && material.pages.length) {
    const filenames = unique(material.pages.map(function (page) { return page.filename; }).filter(Boolean));
    const firstText = material.pages.map(function (page) { return page.text; }).filter(Boolean).join("\n\n");
    return "Today's source material is " + filenames.join(", ") + ". It focuses on: " + compactText(firstText, 420);
  }
  const draftContext = sourcePackStore.context(roomName, "current lesson topic learning plan workshop material", { include_draft: true, all_chunks: true });
  if (draftContext.text) {
    return "A draft source material upload is available but has not been locked yet. It focuses on: " + compactText(draftContext.text, 420);
  }
  return "No lesson material or learning plan has been uploaded for this room yet.";
}

function workshopFocusFromMaterial(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/\bbounded agency\b|\bmore than a tool\b/i.test(text)) {
    return "Today's workshop is about Bud as a workshop partner, not just a tool that waits for instructions. It covers how Bud follows the learner's task, page, questions, and recorded progress, offers timely help, and keeps privacy and human judgment in place.";
  }
  return "Today's source material focuses on: " + compactText(text, 360);
}

function asksToExplainPrevious(value) {
  const text = String(value || "").toLowerCase();
  return /\b(make sense|explain|clarify|simplif(?:y|ied)|break\s+it\s+down|help me understand|what does (?:this|that|it) mean)\b/.test(text) &&
    /\b(this|that|it|first|above|previous|earlier)\b/.test(text);
}

function explainPreviousLeaderContext(snapshot, sourcePackStore, roomName) {
  const lastBudText = recentLeaderBudText(snapshot);
  const material = sourcePackStore.pages(roomName);
  const plan = String(material.learning_plan || "").trim();
  if (plan && /learning plan|lesson|section|learner task|completion|source material/i.test(lastBudText + "\n" + plan)) {
    return "In plain terms, today's lesson is asking learners to work through the current material, identify the main idea, ask Bud when something is unclear, and complete a short reflection/check. The plan is grounded in the locked lesson plan, but the wording still looks quite generic, so it may need a clearer Leader-edited version before running live.";
  }
  if (lastBudText) {
    return "I was referring to my previous answer: " + compactText(lastBudText, 420);
  }
  return "I do not have enough previous chat context to know what 'this' refers to. Which lesson section or message should I explain first?";
}

function recentLeaderBudText(snapshot) {
  const message = mostRecentLeaderBudMessage(snapshot);
  return message ? String(message.text || "").trim() : "";
}

function mostRecentLeaderBudMessage(snapshot) {
  const messages = Array.isArray(snapshot && snapshot.messages) ? snapshot.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message && message.scope === "private_facilitator_ai" &&
      (message.sender === "facil-bud" || message.sender === "leader-bud")) return message;
  }
  return null;
}

function asksSharedChat(value) {
  const text = String(value || "").toLowerCase();
  return /\b(what|summari[sz]e|recap|show|tell)\b/.test(text) &&
    /\b(chat|said|say|message|messages|breakout|room)\b/.test(text);
}

function sharedChatReply(question, snapshot, roomName) {
  const requestedGroup = requestedChatGroup(question);
  const requestedSpeaker = requestedChatSpeaker(question);
  const wantsAllBreakouts = !requestedGroup && /\bbreakout(?:\s+rooms?)?\b/i.test(String(question || ""));
  let messages = (snapshot.messages || []).filter(function (message) {
    return message.text &&
      (message.scope === "public_shared" || message.scope === "group_shared") &&
      (!message.room_name || message.room_name === roomName);
  });
  if (requestedGroup) {
    messages = messages.filter(function (message) { return message.target_id === requestedGroup; });
  } else if (wantsAllBreakouts) {
    messages = messages.filter(function (message) { return /^breakout-room-\d+$/.test(String(message.target_id || "")); });
  }
  if (requestedSpeaker) {
    const speaker = normalizeName(requestedSpeaker);
    messages = messages.filter(function (message) {
      return normalizeName(message.sender_display_name || message.sender_id || message.sender).indexOf(speaker) !== -1;
    });
  }
  // Replayed chat events can appear more than once in the runtime snapshot.
  // Keep distinct contributions, but never make the Leader read the same message twice.
  messages = deduplicateSharedChatMessages(messages).slice(-5);
  if (!messages.length) {
    const scope = requestedGroup ? requestedGroup : requestedSpeaker ? requestedSpeaker : "the shared workshop chat";
    return "I do not have any recent public or breakout chat messages for " + scope + ".";
  }
  return "Recent shared chat: " + messages.map(function (message) {
    const sender = message.sender_display_name || message.sender_id || "Participant";
    const target = message.target_id && message.target_id !== "group-main" ? " in " + message.target_id : "";
    return sender + target + " said, \"" + compactText(message.text, 180) + "\"";
  }).join(" ");
}

function deduplicateSharedChatMessages(messages) {
  const seen = new Set();
  return messages.filter(function (message) {
    const key = [
      message.scope || "",
      message.target_id || "",
      message.sender_id || message.sender_display_name || message.sender || "",
      String(message.text || "").trim().replace(/\s+/g, " ").toLowerCase()
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function requestedChatGroup(value) {
  const text = String(value || "").toLowerCase();
  const breakout = text.match(/\bbreakout(?:\s+room)?\s*(\d+)\b/);
  if (breakout) return "breakout-room-" + breakout[1];
  if (/\b(main|workshop|public)\s+(chat|room)\b/.test(text)) return "group-main";
  return "";
}

function requestedChatSpeaker(value) {
  const text = String(value || "").trim();
  const patterns = [
    /\bwhat\s+did\s+([a-z][a-z' -]{1,40}?)\s+(?:say|write|message)\b/i,
    /\bwhat\s+was\s+([a-z][a-z' -]{1,40}?)\s+saying\b/i
  ];
  for (let index = 0; index < patterns.length; index += 1) {
    const match = text.match(patterns[index]);
    if (match && match[1] && !isGenericChatSubject(match[1])) return titleCaseName(match[1]);
  }
  return "";
}

function isGenericChatSubject(value) {
  return /\b(the\s+)?(breakout\s+rooms?|main\s+room|workshop\s+room|public\s+chat|shared\s+chat|group|groups|room|rooms)\b/i.test(String(value || "").trim());
}

function compactText(value, maxCharacters) {
  const text = String(value || "").replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= maxCharacters) return text;
  return text.slice(0, maxCharacters).replace(/\s+\S*$/, "") + "...";
}

function unique(values) {
  return values.filter(function (value, index) { return values.indexOf(value) === index; });
}

function isLikelyUnintelligible(value) {
  const text = String(value || "").trim();
  if (text.length < 6 || /\s/.test(text) || !/^[a-zA-Z]+$/.test(text)) {
    return false;
  }
  const vowels = (text.match(/[aeiouy]/gi) || []).length;
  const keyboardMash = /(asdf|sdfg|qwer|wert|zxcv|xcvb|hjkl)/i.test(text);
  const repeatedChunk = /([a-z]{2,4})\1/i.test(text);
  return keyboardMash || repeatedChunk || (vowels === 0 && text.length >= 8);
}

function asksAboutDocumentAccess(value) {
  const text = String(value || "").toLowerCase();
  return /\b(do you|can you|could you|are you able to|have you)\b/.test(text) &&
    /\b(access|see|read|view|open|use)\b/.test(text) &&
    /\b(document|documents|docs|source|sources|material|materials|workshop)\b/.test(text);
}

function isCasualLearnerMessage(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[.!?]+$/g, "");
  if (!text) return false;
  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|thanks|thank you|ok|okay|cool|great|nice|got it|alright)$/.test(text)) {
    return true;
  }
  return text.length <= 80 &&
    /^(hi|hello|hey|thanks|thank you)\b/.test(text) &&
    !/\b(task|document|docs|material|lesson|workshop|page|explain|help|confused|stuck|understand)\b/.test(text);
}

function asksLearnerUrgentSafetySupport(value) {
  return /\b(kill myself|hurt myself|end my life|want to die|suicid(?:e|al)|beat up|hurt (?:him|her|them|someone)|attack|stab|shoot)\b/i.test(String(value || ""));
}

function learnerUrgentSafetyReply() {
  return "I am glad you said something. If you might hurt yourself or someone else, please contact local emergency services now or tell a trusted person nearby right away. You can also tell the facilitator you need support; I can help you write that message.";
}

function asksLearnerEmotionalSupport(value) {
  return /\b(i (?:do not|don't) like myself|i hate myself|i feel worthless|i am worthless|i feel useless|i am useless)\b/i.test(String(value || ""));
}

function learnerEmotionalSupportReply() {
  return "I am sorry you are feeling that way. You do not have to carry it alone; consider telling a trusted person or the facilitator that you are having a hard time. We can pause the task and take one small step when you are ready.";
}

function isLearnerOffTaskQuestion(value) {
  return /\b(weather|football|soccer|sports? team|joke|movie|celebrity|politics|election)\b/i.test(String(value || ""));
}

function learnerOffTaskReply() {
  return "I do not have a reliable answer to that, and I do not want to guess. Let us come back to the workshop: what part of the current task or material would you like help with?";
}

function isLearnerPersonalContext(value) {
  const text = String(value || "").toLowerCase();
  return /\b(my|our)\s+(sister|brother|mother|father|mum|mom|dad|parent|partner|spouse|wife|husband|child|daughter|son|friend)\b/.test(text);
}

function asksUnknownPersonalFact(value) {
  const text = String(value || "").toLowerCase();
  return isLearnerPersonalContext(text) && /\b(what'?s|what is|who is|who's|tell me|do you know)\b/.test(text);
}

function privateMemorySourceContext(memory) {
  return {
    label: "Private learner Bud memory",
    version: "private-memory",
    text: String(memory || "No private Bud memory has been recorded yet.")
  };
}

function hasUnknownPersonalFactBoundary(value) {
  return /\b(not introduced|haven'?t introduced|have not introduced|haven'?t told|have not told|don'?t know|do not know|no information|not in (?:my|the) memory)\b/i.test(String(value || ""));
}

function unknownPersonalFactReply(question, workshopPrompt) {
  const relation = (String(question || "").match(/\b(?:my|our)\s+([a-z]+)/i) || [])[1] || "that person";
  const task = String(workshopPrompt || "the current workshop task").replace(/\s+/g, " ").trim();
  return "I do not think you have introduced your " + relation + " to me yet, so I should not guess. Let us get back to " + (task || "the current workshop task") + ".";
}

function unknownPersonalFactLeaderReply(question) {
  const relation = (String(question || "").match(/\b(?:my|our)\s+([a-z]+)/i) || [])[1] || "that person";
  return "I do not think you have introduced your " + relation + " to me yet, so I should not guess. Let us get back to the workshop.";
}

function casualLearnerReply(value) {
  const text = String(value || "").trim().toLowerCase();
  if (/^(thanks|thank you)\b/.test(text)) {
    return "You are welcome. I am here if you want to talk through the document, the current task, or anything that feels unclear.";
  }
  if (/^(ok|okay|cool|great|nice|got it|alright)\b/.test(text)) {
    return "Got it. Keep going, and ask me when you want help with the task or workshop material.";
  }
  return "Hi, I am here with you. Ask me about the document, the current task, or anything that feels unclear.";
}

function rememberLearnerName(namesByRoom, roomName, participantId, displayName) {
  const id = String(participantId || "").trim();
  const name = String(displayName || "").trim();
  if (!id) return "";
  if (!namesByRoom[roomName]) namesByRoom[roomName] = {};
  if (name && name.toLowerCase() !== "learner") namesByRoom[roomName][id] = name;
  return namesByRoom[roomName][id] || "";
}

function asksLearnerName(value) {
  return /\b(what'?s|what is|tell me)\s+my\s+name\b/i.test(String(value || ""));
}

function asksRootProblemMeaning(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[?.!]+$/, "").trim();
  return text === "what does the root of the problem mean";
}

function asksLeaderName(value) {
  return asksLearnerName(value);
}

function asksGroupMates(value) {
  const text = String(value || "").toLowerCase();
  return /\b(who|which people|what people)\b/.test(text) &&
    /\b(group mates?|groupmates|team mates?|teammates|breakout (group|room)|my group|my team)\b/.test(text);
}

function groupMatesReply(roomDirectory, roomName, participantId, learnerName) {
  const room = roomDirectory.rooms[roomName] || {};
  const assignment = (room.breakout_assignments || []).find(function (item) {
    return (item.members || []).some(function (member) {
      return String(member.participant_id || "").trim() === String(participantId || "").trim() ||
        (learnerName && String(member.display_name || "").trim().toLowerCase() === learnerName.toLowerCase());
    });
  });
  if (!assignment) return "You have not been assigned to a breakout group yet. Once the Leader assigns one, I can tell you who is in your group.";
  const mates = (assignment.members || []).filter(function (member) {
    return String(member.participant_id || "").trim() !== String(participantId || "").trim() &&
      (!learnerName || String(member.display_name || "").trim().toLowerCase() !== learnerName.toLowerCase());
  }).map(function (member) {
    return String(member.display_name || member.participant_id || "").trim();
  }).filter(Boolean);
  if (!mates.length) return "You are the only person assigned to this breakout group right now.";
  return "Your breakout group includes " + mates.join(", ") + ".";
}

function asksLearnerNextStep(value) {
  return /\b(what should i do next|what do i do next|what now|next step|where do i start|what(?:'s| is) next)\b/i.test(String(value || ""));
}

function learnerNextStepReply(sourcePackStore, roomDirectory, roomName, participantId, learnerName, question) {
  const material = sourcePackStore.pages(roomName);
  const task = firstLearningPlanTask(material.learning_plan);
  const nextStep = task
    ? "Start with this: " + task
    : material.pages && material.pages.length
      ? "Start by reading the current workshop material and finding its main idea."
      : "Open the current workshop material and take the first task one small part at a time.";
  const person = namedLocationQuestion(question);
  return person ? nextStep + " I do not have a live location for " + person + "; I only know the membership of your assigned breakout group." : nextStep;
}

function asksLearnerUncertainty(value) {
  return /\b(i (?:really )?(?:do not|don't) know|i(?:'m| am) not sure|no idea|i(?:'m| am) unsure)\b/i.test(String(value || ""));
}

function learnerUncertaintyReply(sourcePackStore, roomName) {
  const material = sourcePackStore.pages(roomName);
  const task = firstLearningPlanTask(material.learning_plan);
  if (task) return "That is okay. Let us make it smaller: " + task + " Which word, sentence, or part should we unpack first?";
  if (material.pages && material.pages.length) return "That is okay. Start with the first paragraph and tell me the one sentence that feels unclear; we can work through it together.";
  return "That is okay. Tell me what you can see on the current task, even just a few words, and we will work out the next step together.";
}

function firstLearningPlanTask(value) {
  const lines = String(value || "").split("\n").map(function (line) { return line.replace(/^\s*[-*#\d.)]+\s*/, "").trim(); }).filter(Boolean);
  const labelled = lines.find(function (line) { return /^learner task\s*:/i.test(line); });
  if (labelled) return compactText(labelled.replace(/^learner task\s*:\s*/i, ""), 240);
  const task = lines.find(function (line) { return /^task\s*\d+\s*[:.-]/i.test(line); });
  return task ? compactText(task.replace(/^task\s*\d+\s*[:.-]\s*/i, ""), 240) : "";
}

function namedLocationQuestion(value) {
  const match = String(value || "").match(/\bwhere(?:'s| is)\s+([a-z][a-z' -]{1,40}?)(?:[?!.]|$)/i);
  return match && match[1] ? titleCaseName(match[1]) : "";
}

function asksLearnerLocationQuestion(value) {
  return Boolean(namedLocationQuestion(value));
}

function learnerLocationBoundaryReply(question) {
  const name = namedLocationQuestion(question);
  return "I do not have a live location for " + name + ". I can only use your own group membership and the shared workshop material, not track other learners.";
}

function isUsableLearnerBudReply(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return !/^(?:hello|hi)\b[\s\S]{0,80}\b(?:i(?:'m| am) here|let me check|current context|how can i help)/i.test(text) &&
    !/\b(?:let me check|search through|look through)\b[\s\S]{0,80}\b(?:context|document|material)/i.test(text) &&
    !/\b(?:i(?:'m| am) bud, your workshop buddy|i am here to support your learning)\b/i.test(text);
}

function learnerGroundingFallbackReply(sourcePages, workshopPrompt) {
  const task = firstLearningPlanTask(sourcePages && sourcePages.learning_plan);
  if (task) return "I cannot give a reliable answer to that from the available context. The next task I can confirm is: " + task + " What part should we work through?";
  if (sourcePages && sourcePages.pages && sourcePages.pages.length) return "I cannot confirm that from the current material. Point me to the sentence or task you mean, and I will help with that.";
  if (workshopPrompt) return "I cannot confirm that from the current workshop evidence. The active workshop focus is: " + compactText(workshopPrompt, 220) + ". Which part should we work through?";
  return "I cannot confirm that from the current workshop evidence. Tell me which task or sentence you mean, and I will help from there.";
}

function asksLearnerProgressStatus(value) {
  const text = String(value || "").toLowerCase();
  return /\b(how am i doing|how'?s my progress|am i doing (okay|ok|alright|well)|am i making progress|do i understand|do you think i understand)\b/.test(text);
}

function learnerProgressStatusReply(snapshot, roomName, participantId) {
  const responses = learnerTaskResponses(snapshot, roomName, participantId);
  const values = Object.keys(responses).map(function (taskId) { return responses[taskId]; });
  const green = values.filter(function (value) { return value === "green"; }).length;
  const yellow = values.filter(function (value) { return value === "yellow"; }).length;
  const red = values.filter(function (value) { return value === "red"; }).length;
  if (!values.length) {
    return "I do not have a task check-in from you yet, so I cannot tell how the work is going for you. You can mark a task as clear, somewhat clear, or needing help, or tell me which part feels difficult.";
  }
  if (red) {
    return "You marked " + red + " task" + (red === 1 ? "" : "s") + " as needing help. That tells me where you want support; it does not say anything negative about your ability. Let us take the next unclear part one step at a time.";
  }
  if (yellow) {
    return "You marked " + yellow + " task" + (yellow === 1 ? "" : "s") + " as somewhat clear, and " + green + " as clear. That is a useful check-in, not a test result. Tell me which point you want to make clearer.";
  }
  return "You marked " + green + " task" + (green === 1 ? "" : "s") + " as clear. That is your own check-in, not proof that every detail is settled. I can still help you test an idea or explain a tricky part.";
}

function asksLearnerEvidenceBasis(value) {
  const text = String(value || "").toLowerCase().trim();
  return /\b(how do you know|what makes you say that|what are you basing|what evidence|source for that)\b/.test(text);
}

function learnerEvidenceBasisReply(snapshot, roomName, participantId) {
  const messages = (snapshot && snapshot.messages || []).filter(function (message) {
    return message.scope === "private_participant_ai" &&
      message.target_id === participantId &&
      String(message.room_name || DEFAULT_ROOM) === roomName &&
      message.sender === "bud";
  });
  const previous = messages.length ? messages[messages.length - 1] : null;
  if (!previous) return "I do not have a previous answer to support. I can use the active workshop material, your own task check-ins, and your private conversation with me.";
  if (previous.provider === "learner-self-checkin-context") {
    const checkinCount = Object.keys(learnerTaskResponses(snapshot, roomName, participantId)).length;
    return checkinCount
      ? "I used only your own task check-ins in this workshop. I did not compare you with other learners or infer anything from silence."
      : "I checked your task check-ins for this workshop. None have been recorded yet, so I could not assess how the work is going for you.";
  }
  if (previous.provider === "source-pack-access") return "I used the active workshop material published for this room. I did not use another learner's private chat.";
  if (previous.provider === "source-grounding-guard") return "I checked whether active workshop material was available for this room. It was not, so I did not try to fill in the gaps.";
  if (previous.provider && previous.provider.indexOf("qwen") !== -1) return "I based that on the active workshop material and your permitted private context. I should not treat anything outside those sources as a fact, and I never use another learner's private chat.";
  if (previous.provider === "learner-bud-casual") return "That was just a greeting, not a claim about your learning or the workshop.";
  return "I can support answers with the active workshop material, your own task check-ins, and your private conversation with me. I do not have access to another learner's private chat.";
}

function documentAccessReply(material) {
  const pages = material && Array.isArray(material.pages) ? material.pages : [];
  if (!pages.length) {
    return "I do not have an active workshop document yet. Please ask the Leader to publish the workshop material.";
  }
  const filenames = [];
  pages.forEach(function (page) {
    if (page.filename && filenames.indexOf(page.filename) === -1) filenames.push(page.filename);
  });
  const planNote = material.learning_plan ? " I also have the locked learning plan tasks for this workshop." : "";
  return "Yes. I have access to the active workshop material for this room: " +
    filenames.join(", ") + " (" + pages.length + " document " + (pages.length === 1 ? "section" : "sections") + ")." +
    planNote + " Ask me about a specific page, task, or part that feels unclear.";
}

function normalizeLanguage(value) {
  const language = String(value || "").trim().toLowerCase();
  return ["en", "es", "zh", "my", "fr", "th", "ms"].indexOf(language) === -1 ? "" : language;
}

function recordTranscriptionDiagnostic(diagnostics, participantId, timings, providerError) {
  diagnostics.metrics.transcriptions += 1;
  diagnostics.metrics.last_stt_ms = timings.stt;
  diagnostics.metrics.last_translation_ms = timings.translation;
  diagnostics.metrics.last_total_ms = timings.total;
  if (providerError) diagnostics.metrics.provider_errors += 1;
  diagnostics.events.unshift({
    type: providerError ? "translation_error" : "transcription_completed",
    participant_id: participantId,
    total_ms: timings.total,
    created_at: new Date().toISOString()
  });
  diagnostics.events = diagnostics.events.slice(0, 30);
}

function checkHttpHealth(name, target, allowAnyResponse) {
  const started = Date.now();
  return new Promise(function (resolve) {
    const request = http.get({
      hostname: target.hostname,
      port: target.port,
      path: target.path,
      timeout: 1500
    }, function (response) {
      response.resume();
      response.on("end", function () {
        const healthy = allowAnyResponse ? response.statusCode < 500 : response.statusCode === 200;
        resolve({
          name: name,
          status: healthy ? "healthy" : "unhealthy",
          latency_ms: Date.now() - started,
          detail: healthy ? "ready" : "HTTP " + response.statusCode
        });
      });
    });
    request.on("timeout", function () { request.destroy(new Error("health check timed out")); });
    request.on("error", function (error) {
      resolve({ name: name, status: "unhealthy", latency_ms: Date.now() - started, detail: error.message });
    });
  });
}

function serviceTarget(host, port, path) {
  return { hostname: host || "127.0.0.1", port: Number(port), path: path };
}

function collectServiceHealth() {
  const livekitUrl = new URL(process.env.LIVEKIT_SERVER_URL || process.env.LIVEKIT_URL || "http://127.0.0.1:7880");
  return Promise.all([
    { name: "bud", result: Promise.resolve({ name: "bud", status: "healthy", latency_ms: 0, detail: "ready" }) },
    { name: "livekit", result: checkHttpHealth("livekit", serviceTarget(livekitUrl.hostname, livekitUrl.port || 80, "/"), true) },
    { name: "whisper", result: checkHttpHealth("whisper", serviceTarget(process.env.STT_HOST, process.env.STT_PORT || 8787, "/health"), false) },
    { name: "translation", result: checkHttpHealth("translation", serviceTarget(process.env.TRANSLATION_HOST, process.env.TRANSLATION_PORT || 8788, "/health"), false) },
    { name: "qwen", result: checkHttpHealth("qwen", serviceTarget(process.env.LLM_HOST, process.env.LLM_PORT || 8790, "/health"), false) }
  ].map(function (service) { return service.result; })).then(function (results) {
    return results.reduce(function (health, result) {
      health[result.name] = result;
      return health;
    }, {});
  });
}

function topviewState(diagnostics, roomDirectory, health) {
  const participants = Object.keys(diagnostics.connections).map(function (participantId) {
    return diagnostics.connections[participantId];
  });
  const rooms = listRooms(roomDirectory).map(function (room) {
    return Object.assign({}, room, {
      connected_participants: participants.filter(function (participant) {
        return participant.room_name === room.room_name;
      }).length
    });
  });
  return {
    generated_at: new Date().toISOString(),
    rooms: rooms,
    participants: participants,
    metrics: diagnostics.metrics,
    providers: {
      livekit: Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
      whisper: Boolean(process.env.STT_HOST || process.env.STT_PORT),
      translation: Boolean(process.env.TRANSLATION_HOST || process.env.TRANSLATION_PORT),
      qwen: Boolean(process.env.LLM_HOST || process.env.LLM_PORT)
    },
    services: health || {},
    events: diagnostics.events
  };
}

function timerSnapshot(control) {
  if (control.status === "running" && control.started_at) {
    control.elapsed_seconds = Math.min(control.duration_seconds,
      Math.floor((Date.now() - Date.parse(control.started_at)) / 1000));
    if (control.elapsed_seconds >= control.duration_seconds) control.status = "ended";
  }
  return {
    duration_seconds: control.duration_seconds,
    elapsed_seconds: control.elapsed_seconds,
    remaining_seconds: Math.max(0, control.duration_seconds - control.elapsed_seconds),
    status: control.status,
    started_at: control.started_at,
    updated_at: control.updated_at
  };
}

function listRooms(roomDirectory) {
  return Object.keys(roomDirectory.rooms).map(function (roomName) {
    const room = roomDirectory.rooms[roomName];
    return {
      room_name: room.room_name,
      ready: Boolean(room.ready),
      allocations: Object.keys(room.allocations).map(function (participantId) {
        return room.allocations[participantId];
      }),
      breakout_assignments: room.breakout_assignments || []
    };
  });
}

function defaultRoomDirectory() {
  return {
    rooms: {
      [DEFAULT_ROOM]: {
        room_name: DEFAULT_ROOM,
        allocations: {},
        breakout_assignments: [],
        participant_screen_share_enabled: false,
        ready: false,
        learning_plan_draft: "",
        learning_plan: ""
      }
    }
  };
}

function loadRoomDirectory(filePath) {
  const fallback = defaultRoomDirectory();
  try {
    const stored = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!stored || typeof stored !== "object" || !stored.rooms || typeof stored.rooms !== "object") return fallback;
    Object.keys(stored.rooms).forEach(function (roomName) {
      const room = stored.rooms[roomName] || {};
      stored.rooms[roomName] = Object.assign({}, fallback.rooms[DEFAULT_ROOM], room, {
        room_name: room.room_name || roomName,
        allocations: room.allocations || {},
        breakout_assignments: Array.isArray(room.breakout_assignments) ? room.breakout_assignments : []
      });
    });
    if (!stored.rooms[DEFAULT_ROOM]) stored.rooms[DEFAULT_ROOM] = fallback.rooms[DEFAULT_ROOM];
    return stored;
  } catch (error) {
    return fallback;
  }
}

function saveRoomDirectory(filePath, roomDirectory) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(roomDirectory, null, 2));
  } catch (error) {
    // The active process can continue if durable storage is temporarily unavailable.
  }
}

function resolveParticipantGroup(roomDirectory, roomName, participantId) {
  const room = roomDirectory.rooms[roomName] || {};
  const assignments = room.breakout_assignments || [];
  const participantKey = String(participantId || "").trim().toLowerCase();
  const match = assignments.find(function (assignment) {
    return (assignment.members || []).some(function (member) {
      return String(member.participant_id || "").trim().toLowerCase() === participantKey;
    });
  });
  return match ? match.group_id : "group-main";
}

function learnerMemoryText(originalText, learnerText, nativeLanguage) {
  if (nativeLanguage === "en" || originalText.trim() === learnerText.trim()) return learnerText;
  return [
    "Original learner message (" + nativeLanguage + "): " + originalText,
    "English translation used for workshop reasoning: " + learnerText
  ].join("\n");
}

async function localizeBudState(state, targetLanguage, cache) {
  if (!targetLanguage || targetLanguage === "en") return state;
  const budSenders = ["bud", "facil-bud", "leader-bud"];
  const collections = ["private_messages", "facil_bud_messages"];
  const replies = [];
  state = Object.assign({}, state);
  collections.forEach(function (collection) {
    state[collection] = (state[collection] || []).map(function (message) {
      return Object.assign({}, message);
    });
    state[collection].forEach(function (message) {
      if (budSenders.indexOf(message.sender) !== -1 && message.text) replies.push(message);
    });
  });
  await Promise.all(replies.map(async function (message) {
    if (message.language === targetLanguage) return;
    const key = String(message.message_id || message.text) + "|" + targetLanguage;
    if (!cache[key]) {
      cache[key] = translateBudReply(message.text, targetLanguage);
    }
    const localized = await cache[key];
    message.text = localized.text;
    message.language = localized.language;
  }));
  return state;
}

function translateBudReply(text, targetLanguage) {
  return new Promise(function (resolve) {
    translateText(text, "en", targetLanguage, {}, function (error, translation) {
      if (error || !translation || !translation.translated_text) {
        return resolve({ text: text, language: "en" });
      }
      resolve({ text: translation.translated_text, language: targetLanguage });
    });
  });
}

function normalizeLearnerReasoningText(value, nativeLanguage) {
  const text = String(value || "");
  if (nativeLanguage !== "zh") return text;
  return text.replace(/\bco-?ordinators?\b/gi, function (match) {
    return /s$/i.test(match) ? "facilitators" : "facilitator";
  });
}

function normalizeChineseBudReply(value) {
  return String(value || "")
    .replace(/^\s*(?:主持人|Learner Bud|学习伙伴)\s*[：:]\s*/i, "")
    .replace(/\bfacilitators?\b/gi, "主持人")
    .replace(/[“"']?\bno\s+is\s+final\b[”"']?/gi, "“拒绝即为最终决定”")
    .replace(/\s*主持人\s*/g, "主持人")
    .trim();
}

function learnerState(runtime, participantId, roomName) {
  const state = runtime.getStateSnapshot();
  const activeRoomName = roomName || DEFAULT_ROOM;
  const groupId = resolveParticipantGroup(runtime.roomDirectory || { rooms: {} }, activeRoomName, participantId);
  return {
    participant_id: participantId,
    workshop: {
      title: state.workshop.title,
      phase: state.workshop.phase,
      prompt: currentPrompt(state)
    },
    private_messages: state.messages.filter(function (message) {
      return message.scope === "private_participant_ai" && message.target_id === participantId &&
        String(message.room_name || DEFAULT_ROOM) === activeRoomName;
    }),
    // These collections are deliberately separate so a client cannot render
    // another breakout room in the workshop-wide chat by mistake.
    public_messages: state.messages.filter(function (message) {
      return message.scope === "public_shared" && String(message.room_name || DEFAULT_ROOM) === activeRoomName;
    }),
    group_messages: state.messages.filter(function (message) {
      return message.scope === "group_shared" && message.target_id === groupId &&
        String(message.room_name || DEFAULT_ROOM) === activeRoomName;
    }),
    participant: state.participants[participantId] || null,
    task_responses: learnerTaskResponses(state, activeRoomName, participantId),
    workshop_control: timerSnapshot(runtime.workshopControl),
    tool_results: state.tool_results.slice(-8)
  };
}

function learnerTaskResponses(state, roomName, participantId) {
  const roomResponses = state.task_responses && state.task_responses[roomName] || {};
  return Object.keys(roomResponses).reduce(function (result, taskId) {
    const taskResponse = roomResponses[taskId].responses && roomResponses[taskId].responses[participantId];
    if (taskResponse) result[taskId] = taskResponse.response;
    return result;
  }, {});
}

function facilitatorState(runtime, roomName) {
  const state = runtime.getStateSnapshot();
  const activeRoomName = roomName || runtime.activeFacilitatorRoom || DEFAULT_ROOM;
  const participants = Object.keys(state.participants).map(function (participantId) {
    const participant = state.participants[participantId];
    return {
      participant_id: participantId,
      display_name: participant.display_name,
      role: participant.role,
      participation: participant.participation && participant.participation.status || "unknown",
      comprehension: participant.comprehension && participant.comprehension.status || "unknown",
      comprehension_recap_point_id: participant.comprehension && participant.comprehension.recap_point_id || null,
      updated_at: participant.updated_at
    };
  }).filter(function (participant) {
    return participant.role !== "facilitator";
  });
  const rollup = { green: 0, yellow: 0, red: 0, unknown: 0 };
  const difficultPoints = {};
  participants.forEach(function (participant) {
    const status = rollup[participant.comprehension] === undefined ? "unknown" : participant.comprehension;
    rollup[status] += 1;
    if ((status === "yellow" || status === "red") && participant.comprehension_recap_point_id) {
      difficultPoints[participant.comprehension_recap_point_id] = (difficultPoints[participant.comprehension_recap_point_id] || 0) + 1;
    }
  });
  const topRecapPoint = Object.keys(difficultPoints).sort(function (left, right) {
    return difficultPoints[right] - difficultPoints[left];
  })[0] || null;
  const responded = rollup.green + rollup.yellow + rollup.red;
  const total = responded + rollup.unknown;
  return {
    workshop: {
      title: state.workshop.title,
      phase: state.workshop.phase,
      prompt: currentPrompt(state),
      supported_languages: state.workshop.supported_languages
    },
    workshop_control: timerSnapshot(runtime.workshopControl),
    participants,
    rollup: Object.assign({}, rollup, {
      most_flagged_recap_point: topRecapPoint,
      most_flagged_count: topRecapPoint ? difficultPoints[topRecapPoint] : 0
    }),
    room_report: {
      generated_at: new Date().toISOString(),
      total_participants: total,
      responded: responded,
      text: total
        ? "Room report: " + responded + " of " + total + " learners reported comprehension - " +
          rollup.green + " green, " + rollup.yellow + " yellow, " + rollup.red + " red, " + rollup.unknown + " unknown." +
          (topRecapPoint ? " Most yellow/red reports cluster around " + topRecapPoint + "." : "")
        : "Room report: no learner comprehension responses have been recorded yet."
    },
    task_insights: taskInsightSummary(state, activeRoomName),
    groups: Object.keys(state.groups).map(function (groupId) {
      const group = state.groups[groupId];
      return {
        group_id: groupId,
        participant_count: group.participant_ids.length,
        shared_meaning: group.shared_meaning.status,
        meaning_gap_count: group.meaning_gaps.length
      };
    }),
    facilitator_signals: state.workshop.facilitator_signals.slice(-12),
    evidence_summary: {
      total: state.workshop.evidence_index.length,
      public_shared: state.workshop.evidence_index.filter(function (item) {
        return item.scope === "public_shared";
      }).length,
      private_withheld: state.workshop.evidence_index.filter(function (item) {
        return item.scope === "private_participant_ai";
      }).length
    },
    privacy: {
      private_bud_content_included: false,
      projection: "minimum_necessary_operational_summary"
    },
    facil_bud_messages: state.messages.filter(function (message) {
      return message.scope === "private_facilitator_ai" && message.target_id === "facilitator-1" &&
        String(message.room_name || DEFAULT_ROOM) === activeRoomName;
    }),
    public_messages: state.messages.filter(function (message) {
      return message.scope === "public_shared" && (!message.room_name || message.room_name === activeRoomName);
    }),
    group_messages: state.messages.filter(function (message) {
      return message.scope === "group_shared" && (!message.room_name || message.room_name === activeRoomName);
    })
  };
}

function taskInsightSummary(state, roomName) {
  const roomResponses = state.task_responses && state.task_responses[roomName] || {};
  return Object.keys(roomResponses).map(function (taskId) {
    const task = roomResponses[taskId];
    const counts = { green: 0, yellow: 0, red: 0, unknown: 0 };
    const needsSupport = [];
    Object.keys(task.responses || {}).forEach(function (participantId) {
      const taskResponse = task.responses[participantId];
      const response = taskResponse.response;
      if (counts[response] === undefined) counts.unknown += 1;
      else {
        counts[response] += 1;
        if (response === "yellow" || response === "red") {
          needsSupport.push({
            participant_id: participantId,
            display_name: taskResponse.display_name || participantId,
            response: response
          });
        }
      }
    });
    const total = counts.green + counts.yellow + counts.red + counts.unknown;
    const difficulty = counts.yellow + counts.red;
    return {
      task_id: taskId,
      task_index: task.task_index,
      task_text: task.task_text,
      section: task.section,
      counts: counts,
      needs_support: needsSupport,
      total: total,
      difficulty_count: difficulty,
      difficulty_ratio: total ? difficulty / total : 0
    };
  }).sort(function (left, right) {
    const leftIndex = Number.isFinite(Number(left.task_index)) ? Number(left.task_index) : 9999;
    const rightIndex = Number.isFinite(Number(right.task_index)) ? Number(right.task_index) : 9999;
    return leftIndex - rightIndex;
  });
}

function currentPrompt(state) {
  const prompts = state.workshop.evidence_index.filter(function (item) {
    return item.event_type === "facilitator_instruction" && item.text;
  });
  return prompts.length ? prompts[prompts.length - 1].text : "";
}

function leaderSourceContext(sourcePackStore, roomName, question) {
  const activeContext = sourcePackStore.context(roomName, question, { all_chunks: true });
  if (activeContext.text) {
    return Object.assign({}, activeContext, {
      label: "Active Workshop Source Pack",
      status: "active"
    });
  }
  const draftContext = sourcePackStore.context(roomName, question, { all_chunks: true, include_draft: true });
  if (draftContext.text) {
    return Object.assign({}, draftContext, {
      label: "Draft Uploaded Source Material",
      status: "draft"
    });
  }
  return Object.assign({}, activeContext, {
    label: "Workshop Source Pack",
    status: "none"
  });
}

function learnerSourceContext(sourcePackStore, roomName, question) {
  const activeContext = sourcePackStore.context(roomName, question, { all_chunks: true });
  return Object.assign({}, activeContext, {
    label: "Active Workshop Source Pack",
    status: activeContext.text ? "active" : "none"
  });
}

function leaderSourceAnswerSystem(leaderName, status) {
  return [
    "You are Leader Bud, the private workshop partner for Leader " + leaderName + ".",
    "Answer the Leader's question using only the supplied source excerpts and application-authored response brief.",
    status === "draft" ? "The source is draft; call it draft when that distinction matters." : "The source is active workshop material.",
    "Preserve exact conditions, negations, comparisons, and recommendations. Never reverse what may be trimmed and what must be retained.",
    "Do not invent filenames, slide ranges, numbers, exercises, or requirements.",
    "If the excerpts do not support the answer, say what cannot be confirmed.",
    "Answer directly in concise English. Never reveal private learner conversations."
  ].join(" ");
}

function learnerSourceAnswerSystem(outputLanguage) {
  return [
    "You are Learner Bud, one learner's private workshop buddy.",
    "Answer the learner's question using only the supplied active source excerpts and application-authored response brief.",
    "Preserve exact conditions, negations, comparisons, permissions, and requirements. Do not reverse or weaken them.",
    "Do not invent filenames, slide ranges, numbers, exercises, or requirements.",
    "If the excerpts do not support the answer, say what cannot be confirmed.",
    outputLanguage === "zh"
      ? "请直接使用自然、简洁的简体中文回答，并使用“主持人”表示 facilitator。最终答案不得包含英文单词或英文引文；请用中文转述证据，不要添加说话人标签。证据已经支持答案时，不要再说无法确认。不要透露其他学习者的私人内容。"
      : "Answer directly in plain, concise English. Never reveal another learner's private content."
  ].join(" ");
}

function hasAuthoritativeLearnerEvidence(sourceContext, sourcePages) {
  return Boolean(
    sourceContext && String(sourceContext.text || "").trim() ||
    sourcePages && String(sourcePages.learning_plan || "").trim()
  );
}

function learnerBudContext(snapshot, sourcePackStore, roomName, participantId, groupId) {
  const material = sourcePackStore.pages(roomName);
  const taskResponses = learnerTaskResponses(snapshot, roomName, participantId);
  const taskCount = Object.keys(taskResponses).length;
  const plan = String(material.learning_plan || "").trim();
  const scope = groupId && groupId !== "group-main" ? "assigned breakout group " + groupId : "shared workshop room";
  return [
    "Learner identity: private Learner Bud for this learner only.",
    "Permitted group scope: " + scope + ".",
    plan ? "Locked learning plan:\n" + plan : "Locked learning plan: none available.",
    "Source categories available to Bud are labelled slides, curriculum, and teaching_notes. Only slides are learner-visible in the workshop document box; curriculum and teaching notes are supporting AI context.",
    "This learner's recorded task check-ins: " + (taskCount ? Object.keys(taskResponses).map(function (taskId) { return taskId + "=" + taskResponses[taskId]; }).join(", ") : "none yet") + ".",
    "Do not infer another learner's private state, location, or chat from this context."
  ].join("\n");
}

function hasAuthoritativeLeaderEvidence(sourceContext, sourcePages) {
  return Boolean(
    sourceContext && String(sourceContext.text || "").trim() ||
    sourcePages && (String(sourcePages.learning_plan || "").trim() || String(sourcePages.learning_plan_draft || "").trim())
  );
}

function leaderBudContext(snapshot, roomDirectory, sourcePackStore, roomName) {
  const room = roomDirectory.rooms[roomName] || {};
  const sections = [];
  const persistedPlan = sourcePackStore.learningPlan(roomName);
  const lockedPlan = String(persistedPlan.locked || room.learning_plan || "").trim();
  const draftPlan = String(persistedPlan.draft || room.learning_plan_draft || "").trim();
  if (lockedPlan) {
    sections.push("\n\nLocked workshop learning plan (Leader-approved; use as the workshop structure):\n" + lockedPlan);
  } else if (draftPlan) {
    sections.push("\n\nDraft generated learning plan (not locked yet; use only for leader-private preparation support and say it is draft):\n" + draftPlan);
  } else {
    sections.push("\n\nWorkshop learning plan: none generated or locked yet.");
  }

  const sharedMessages = (snapshot.messages || [])
    .filter(function (message) {
      if (!message.text || (message.scope !== "public_shared" && message.scope !== "group_shared")) return false;
      return !message.room_name || message.room_name === roomName;
    })
    .slice(-24)
    .map(function (message) {
      const group = message.target_id ? " [" + message.target_id + "]" : "";
      const sender = message.sender_id || message.sender || "workshop participant";
      return "- " + sender + group + ": " + String(message.text).replace(/\s+/g, " ").trim();
    });
  sections.push(sharedMessages.length
    ? "\n\nPermitted shared workshop chat context (main and breakout group messages; private chats excluded):\n" + sharedMessages.join("\n")
    : "\n\nPermitted shared workshop chat context: none recorded yet.");

  const evidence = (snapshot.workshop && snapshot.workshop.evidence_index || [])
    .filter(function (item) {
      return item.status !== "disputed" && item.text && (item.scope === "public_shared" || item.scope === "group_shared");
    })
    .slice(-24)
    .map(function (item) {
      return "- " + (item.event_type || "workshop evidence") + ": " + String(item.text).replace(/\s+/g, " ").trim();
    });
  sections.push(evidence.length
    ? "\n\nPublic and group workshop evidence:\n" + evidence.join("\n")
    : "\n\nPublic and group workshop evidence: none recorded yet.");
  return sections.join("");
}

function privateBudMemory(snapshot, scope, targetId) {
  const messages = (snapshot.messages || [])
    .filter(function (message) {
      return message.scope === scope && message.target_id === targetId && message.text;
    })
    .slice(-16)
    .map(function (message) {
      const speaker = message.sender || (scope === "private_facilitator_ai" ? "Leader" : "Learner");
      return "- " + speaker + ": " + String(message.text).replace(/\s+/g, " ").trim();
    });
  return messages.length
    ? "\n\nPrivate Bud conversation memory (permitted only for this Bud and partner):\n" + messages.join("\n")
    : "\n\nPrivate Bud conversation memory: none recorded yet.";
}

function summarizeResult(result) {
  return {
    event_id: result.event.event_id,
    decision_type: result.decision.decision_type,
    surface: result.decision.surface,
    rationale: result.decision.rationale,
    tool_results: result.toolResults
  };
}

function readJson(req, res, callback, maxBytes) {
  let body = "";
  req.on("data", function (chunk) {
    body += chunk;
    if (body.length > (maxBytes || 100000)) {
      req.destroy();
    }
  });
  req.on("end", function () {
    let parsed;
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch (error) {
      sendJson(res, { error: "Invalid JSON" }, 400);
      return;
    }
    Promise.resolve(callback(parsed)).catch(function (error) {
      sendJson(res, { error: error.message || "Request failed" }, 500);
    });
  });
}

function readBinary(req, res, callback) {
  const chunks = [];
  let total = 0;
  req.on("data", function (chunk) {
    total += chunk.length;
    if (total > 10 * 1024 * 1024) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    callback(Buffer.concat(chunks), req.headers);
  });
}

function transcribeAudio(audio, headers, prompt, callback) {
  if (typeof prompt === "function") {
    callback = prompt;
    prompt = "";
  }
  const languageHint = normalizeLanguage(headers["x-native-language"]);
  const contentType = headers["content-type"] || "audio/webm";
  const preferGroq = String(process.env.STT_PROVIDER || "").toLowerCase() !== "local" && groqSttConfigured();

  if (!preferGroq) {
    return transcribeWithLocalWhisper(audio, contentType, languageHint, prompt, callback);
  }

  transcribeWithGroq(audio, contentType, languageHint, prompt)
    .then(function (transcript) { callback(null, transcript); })
    .catch(function (error) {
      console.warn("Groq STT failed, falling back to local Whisper:", error.message);
      transcribeWithLocalWhisper(audio, contentType, languageHint, prompt, callback);
    });
}

function transcribeWithLocalWhisper(audio, contentType, languageHint, prompt, callback) {
  const encodedPrompt = prompt ? Buffer.from(String(prompt), "utf8").toString("base64") : "";
  const request = http.request({
    hostname: process.env.STT_HOST || "127.0.0.1",
    port: Number(process.env.STT_PORT || 8787),
    path: "/transcribe",
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Content-Length": audio.length,
      "X-Language-Hint": languageHint,
      "X-Prompt": encodedPrompt
    }
  }, function (response) {
    let body = "";
    response.on("data", function (chunk) { body += chunk; });
    response.on("end", function () {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return callback(new Error("Whisper service returned HTTP " + response.statusCode));
      }
      try {
        callback(null, JSON.parse(body));
      } catch (error) {
        callback(error);
      }
    });
  });
  request.on("error", callback);
  request.end(audio);
}

function speakerRole(participantId) {
  return String(participantId || "").indexOf("facilitator") === 0 ? "facilitator" : "learner";
}

function speakerIdentity(diagnostics, message) {
  const participantId = message && message.sender_id;
  const connection = participantId && diagnostics.connections[participantId];
  if (connection) {
    return { display_name: connection.display_name || participantId, role: connection.role || speakerRole(participantId) };
  }
  return {
    display_name: message && message.sender_display_name || participantId || "Workshop",
    role: speakerRole(participantId)
  };
}

function sharedMessageRows(messages, targetLanguage, diagnostics, cache, callback) {
  if (!messages.length) return callback([]);
  const rows = new Array(messages.length);
  let outstanding = messages.length;

  messages.forEach(function (message, index) {
    const sourceLanguage = normalizeLanguage(message.language) || "en";
    const speaker = speakerIdentity(diagnostics, message);

    function finish(translatedText) {
      rows[index] = {
        message_id: message.message_id,
        scope: message.scope,
        target_id: message.target_id,
        sender_id: message.sender_id,
        display_name: speaker.display_name,
        role: speaker.role,
        original_text: message.text,
        original_language: sourceLanguage,
        translated_text: translatedText || null,
        target_language: translatedText ? targetLanguage : null,
        created_at: message.created_at
      };
      outstanding -= 1;
      if (outstanding === 0) callback(rows);
    }

    if (!targetLanguage || targetLanguage === sourceLanguage) return finish(null);

    const key = message.message_id + "|" + targetLanguage;
    if (!cache[key]) {
      cache[key] = new Promise(function (resolve) {
        translateText(message.text, sourceLanguage, targetLanguage, {}, function (error, translation) {
          if (!error && translation && translation.translated_text) {
            resolve(translation.translated_text);
          } else {
            delete cache[key];
            resolve(null);
          }
        });
      });
    }
    cache[key].then(finish);
  });
}

const MAX_REMEMBERED_UTTERANCES = 6;

function rememberUtterance(store, participantId, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  const turns = store[participantId] || (store[participantId] = []);
  turns.push(trimmed);
  if (turns.length > MAX_REMEMBERED_UTTERANCES) turns.shift();
}

function translateText(text, sourceLanguage, targetLanguage, context, callback) {
  if (typeof context === "function") {
    callback = context;
    context = {};
  }

  if (llmTranslateConfigured()) {
    return translateWithLlm({
      text: text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      workshopPrompt: context.workshopPrompt,
      recentTurns: context.recentTurns,
      sourceText: context.sourceText
    })
      .then(function (translation) { callback(null, translation); })
      .catch(function (error) {
        console.warn("LLM translation failed, falling back to NLLB:", error.message);
        translateWithNllb(text, sourceLanguage, targetLanguage, callback);
      });
  }

  return translateWithNllb(text, sourceLanguage, targetLanguage, callback);
}

function translateOrKeep(text, sourceLanguage, targetLanguage) {
  return new Promise(function (resolve) {
    translateText(text, sourceLanguage, targetLanguage, {}, function (error, translation) {
      if (error || !translation || !translation.translated_text) return resolve(text);
      resolve(translation.translated_text);
    });
  });
}

function translateWithNllb(text, sourceLanguage, targetLanguage, callback) {
  const body = Buffer.from(JSON.stringify({
    text,
    source_language: sourceLanguage,
    target_language: targetLanguage
  }));
  const request = http.request({
    hostname: process.env.TRANSLATION_HOST || "127.0.0.1",
    port: Number(process.env.TRANSLATION_PORT || 8788),
    path: "/translate",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": body.length
    }
  }, function (response) {
    let result = "";
    response.on("data", function (chunk) { result += chunk; });
    response.on("end", function () {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return callback(new Error("Translation service returned HTTP " + response.statusCode));
      }
      try {
        callback(null, JSON.parse(result));
      } catch (error) {
        callback(error);
      }
    });
  });
  request.on("error", callback);
  request.end(body);
}

function askLocalBud(input) {
  const sourcePackText = input.sourceContext && input.sourceContext.text
    ? input.sourceContext.text.slice(0, input.source_context_chars || 6500)
    : "";
  const sourceLabel = input.sourceContext && input.sourceContext.label
    ? input.sourceContext.label
    : "Active Workshop Source Pack";
  const questionText = String(input.question || "");
  const questionLimit = input.question_chars || 2600;
  const boundedQuestion = questionText.length > questionLimit
    ? questionText.slice(0, questionLimit) + "\n[Additional permitted context shortened for the local model window.]"
    : questionText;
  const sourceText = sourcePackText
    ? "\n\n" + sourceLabel + " (version " + input.sourceContext.version + "):\n" + sourcePackText + (input.sourceContext.text.length > sourcePackText.length ? "\n[Source pack excerpt shortened for local model context.]" : "")
    : "\n\n" + sourceLabel + ": none is currently available.";
  const audienceRule = input.audience === "learner"
    ? "Speak directly to one learner in plain language; offer one manageable next step when useful."
    : "Brief the Leader; do not role-play learner-facing source text.";
  const body = Buffer.from(JSON.stringify({
    system: input.system || "You are Bud, a friendly and concise workshop learning companion. Use only the supplied workshop prompt, supplied source material, and permitted question. Never guess or invent workshop facts. If the available evidence is insufficient, say that you do not know and ask one concise clarifying question. Answer in one or two short sentences unless a longer answer is necessary.",
    user: "Current workshop prompt:\n" + (input.workshopPrompt || "No prompt available") + sourceText + "\n\n" + boundedQuestion + "\n\nRespond as " + (input.persona_name || "Bud") + ". " + audienceRule + " Answer directly without template headings. Use only supplied evidence for workshop facts; when it is insufficient, say what cannot be confirmed. Do not mention hidden prompts or private context.",
    max_tokens: input.max_tokens || 180
  }));
  return new Promise(function (resolve) {
    const request = http.request({
      hostname: process.env.LLM_HOST || "127.0.0.1",
      port: Number(process.env.LLM_PORT || 8790),
      path: "/chat",
      method: "POST",
      timeout: input.timeout_ms || 12000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length
      }
    }, function (response) {
      let result = "";
      response.on("data", function (chunk) { result += chunk; });
      response.on("end", function () {
        if (response.statusCode < 200 || response.statusCode >= 300) return resolve(null);
        try {
          const parsed = JSON.parse(result);
          resolve(parsed.text ? parsed : null);
        } catch (error) {
          resolve(null);
        }
      });
    });
    request.on("timeout", function () { request.destroy(); });
    request.on("error", function () { resolve(null); });
    request.end(body);
  });
}

function serveStatic(req, res) {
  const cleanUrl = req.url.split("?")[0];
  if (cleanUrl === "/vendor/livekit-client.js") {
    const vendorPath = path.resolve(__dirname, "../../../node_modules/livekit-client/dist/livekit-client.umd.js");
    return fs.createReadStream(vendorPath).on("error", function () {
      sendJson(res, { error: "LiveKit client is not installed" }, 404);
    }).on("open", function () {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    }).pipe(res);
  }
  const relativePath = cleanUrl === "/"
    ? "index.html"
    : cleanUrl === "/v1"
      ? "index_v1.html"
      : cleanUrl === "/facilitator"
        ? "facilitator.html"
      : cleanUrl === "/facilitator_v1"
          ? "facilitator_v1.html"
          : cleanUrl === "/participant-setup"
            ? "learner.html"
          : cleanUrl === "/learner"
            ? "learner.html"
          : cleanUrl === "/leader"
            ? "leader.html"
      : cleanUrl === "/topview"
        ? "topview.html"
      : cleanUrl.slice(1);
  const filePath = path.resolve(WEB_ROOT, relativePath);

  if (filePath.indexOf(WEB_ROOT) !== 0) {
    return sendJson(res, { error: "Not found" }, 404);
  }

  fs.readFile(filePath, function (error, content) {
    if (error) {
      return sendJson(res, { error: "Not found" }, 404);
    }
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

function contentType(filePath) {
  if (filePath.indexOf(".css") !== -1) return "text/css; charset=utf-8";
  if (filePath.indexOf(".js") !== -1) return "application/javascript; charset=utf-8";
  return "text/html; charset=utf-8";
}

function sendJson(res, body, statusCode) {
  res.writeHead(statusCode || 200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function startServer() {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || "127.0.0.1";
  const server = createServer();
  server.listen(port, host, function () {
    console.log("Bud AI learner UI running at http://" + host + ":" + port);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  startServer,
  checkinRecipients,
  asksCurrentLesson,
  normalizeLearnerReasoningText,
  normalizeChineseBudReply
};
