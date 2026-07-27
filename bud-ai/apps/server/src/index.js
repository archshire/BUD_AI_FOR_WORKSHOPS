const fs = require("fs");
const http = require("http");
const path = require("path");
const { createBudRuntime } = require("./runtime");
const { createSourcePackStore } = require("./source-pack");
const { createTranscriptLog } = require("./transcript/transcript-log");
const { createSentenceBuffer } = require("./transcript/sentence-buffer");
const { createCheckinScheduler, formatEntries, parseVerdict } = require("./checkin/checkin-scheduler");
const { groqSttConfigured, transcribeWithGroq } = require("./providers/groq-stt");
const { cleanTranscript } = require("./providers/transcript-hygiene");
const { llmTranslateBackend, llmTranslateConfigured, translateWithLlm } = require("./providers/llm-translate");
const { baseEvent } = require("../../../packages/test-fixtures/src/demo-events");

const WEB_ROOT = path.resolve(__dirname, "../../web/src/app");

function createServer(options) {
  const runtime = createBudRuntime();
  const config = Object.assign({
    participant_id: "learner-1"
  }, options || {});
  const roomDirectory = {
    rooms: {
      "bud-demo-room": { room_name: "bud-demo-room", allocations: {}, participant_screen_share_enabled: false }
    }
  };
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
  const mediaState = {};
  const sourcePackStore = createSourcePackStore();
  // Everything spoken in the room, original plus translation, so Bud and Facil-Bud can
  // answer questions about what the facilitator or another learner actually said.
  const transcriptLog = createTranscriptLog();
  // Recent utterances per speaker, fed back into the translator so it can resolve
  // pronouns and keep terminology consistent across a chopped-up live transcript.
  const recentUtterances = {};
  // Holds transcript fragments until they form a whole sentence, so the translator is
  // never handed half a thought. See transcript/sentence-buffer.js.
  //
  // A sentence that ends in silence rather than in a full stop is released by the
  // buffer's own timer, when no request is in progress and there is nothing to reply
  // to, so the room and target language have to be remembered from the speaker's last
  // upload rather than read off the request that triggered the release.
  const speakerContext = {};
  const sentenceBuffer = createSentenceBuffer({
    onRelease: function (participantId, sentenceText) {
      const context = speakerContext[participantId];
      if (!context || !sentenceText) return;
      publishSentence(context, sentenceText, function () {});
    }
  });
  // Translates one assembled sentence, records it as an event, and writes it to the
  // room transcript, which is what makes it appear in everyone's caption panel. Three
  // paths reach here — a chunk that completed a sentence, the buffer's own timer when
  // the speaker simply went quiet, and the flush when they switch the microphone off —
  // and all three have to produce an identical transcript entry, so they share this.
  //
  // `callback` receives { translation, event, failed }; the timer path ignores it,
  // since by then there is no request left to answer.
  function publishSentence(context, sentenceText, callback) {
    const done = typeof callback === "function" ? callback : function () {};
    const text = String(sentenceText || "").trim();
    if (!context || !text) return done({ translation: null, event: null, failed: false });

    const participantId = context.participantId;
    const roomName = context.roomName || "bud-demo-room";
    const sourceLanguage = context.sourceLanguage || "en";
    const targetLanguage = context.targetLanguage || "es";
    const speaker = context.speaker || speakerIdentity(diagnostics, participantId);

    // The original words are logged whatever happens to the translation: they are still
    // what someone asking "what did they just say?" needs.
    function logOriginalOnly(createdAt) {
      logSpeech({
        room_name: roomName,
        participant_id: participantId,
        display_name: speaker.display_name,
        role: speaker.role,
        original_text: text,
        original_language: sourceLanguage,
        translated_text: null,
        target_language: null,
        created_at: createdAt
      });
    }

    rememberUtterance(recentUtterances, participantId, text);

    // Speakers send their own language as the target, so this is the common case rather
    // than an edge one. Translating a sentence into the language it is already in cost a
    // full round trip to the translator, sat in front of the transcript write, and the
    // result was discarded — every listener retranslates from the original anyway.
    if (sourceLanguage === targetLanguage) {
      logOriginalOnly(context.createdAt || new Date().toISOString());
      return done({ translation: null, event: null, failed: false });
    }

    const snapshot = runtime.getStateSnapshot();
    translateText(text, sourceLanguage, targetLanguage, {
      workshopPrompt: currentPrompt(snapshot),
      recentTurns: recentUtterances[participantId] || [],
      // Slide and document text for the current activity, used purely as a
      // terminology reference so domain words survive translation.
      sourceText: sourcePackStore.context(roomName, text).text
    }, function (translationError, translation) {
      if (translationError || !translation || !translation.translated_text) {
        logOriginalOnly(context.createdAt || new Date().toISOString());
        return done({ translation: null, event: null, failed: true });
      }
      const translationEvent = baseEvent({
        event_id: "translation-completed-" + Date.now(),
        type: "translation_completed",
        source: translation.provider,
        privacy_scope: "public_shared",
        language: targetLanguage,
        actor: { actor_type: "participant", participant_id: participantId },
        payload: {
          utterance_id: context.utteranceId || "utterance-" + Date.now(),
          original_text: text,
          original_language: sourceLanguage,
          translated_text: translation.translated_text,
          target_language: targetLanguage,
          provider: translation.provider,
          context_event_ids: context.contextEventIds || []
        }
      });
      runtime.handleEvent(translationEvent);
      logSpeech({
        room_name: roomName,
        participant_id: participantId,
        display_name: speaker.display_name,
        role: speaker.role,
        original_text: text,
        original_language: sourceLanguage,
        translated_text: translation.translated_text,
        target_language: targetLanguage,
        created_at: translationEvent.occurred_at
      });
      done({ translation: translation, event: translationEvent, failed: false });
    });
  }

  // In-flight caption translations keyed by "<entry_id>|<language>". Every participant
  // polls the same feed at the same time, so without this one turn would be sent to the
  // translator once per listener.
  const captionTranslations = {};
  // Shared workshop posts translated per reading language, keyed by
  // "<message_id>|<language>". The state snapshot is a deep copy, so the translation
  // cannot be cached on the message itself and is kept here instead. A pending entry
  // holds the promise so simultaneous pollers share one translator call.
  const sharedMessageTranslations = {};

  // Watches how much is being said in each live room and, every N words, asks the
  // local model whether the room has reached a point worth checking in on. See
  // checkin/checkin-scheduler.js for the rhythm; the three steps below are what it
  // calls out to.
  const checkinScheduler = createCheckinScheduler({
    transcriptLog: transcriptLog,
    wordInterval: Number(process.env.CHECKIN_WORD_INTERVAL || 500),
    judge: judgeCheckinNeeded,
    summarise: summariseForCheckin,
    deliver: deliverCheckin
  });

  // Step 2: the whole stored speech log goes to the model, which answers yes or no.
  async function judgeCheckinNeeded(input) {
    const reply = await callLocalModel({
      system: "You decide whether learners in a live workshop should receive a private check-in summary right now. " +
        "Answer with YES or NO on the first line, then at most one short sentence saying why. " +
        "Answer YES only when the recent speech has finished a topic, moved on to a new one, or made substantial points a learner could have missed. " +
        "Answer NO for greetings, logistics, small talk, unfinished explanations, or when the room is still in the middle of the same point.",
      user: "Full workshop speech so far:\n" + formatEntries(input.fullEntries) +
        "\n\nSpeech not yet covered by any check-in:\n" + formatEntries(input.newEntries) +
        "\n\nShould the learners get a check-in summary now? Answer YES or NO.",
      maxTokens: 60
    });
    if (!reply) return { needed: false, reason: "judge_unavailable" };
    return parseVerdict(reply.text);
  }

  // Step 3a: only the turns no earlier check-in covered are summarised.
  async function summariseForCheckin(input) {
    const snapshot = runtime.getStateSnapshot();
    const reply = await callLocalModel({
      system: "You are Bud, a friendly workshop learning companion writing a private check-in for one learner. " +
        "Summarise only what was actually said in the supplied speech. Do not invent workshop facts. " +
        "Write two or three short sentences in English: what the room just covered, one concrete next step, " +
        "and an invitation to self-report green, yellow, or red.",
      user: "Current workshop prompt:\n" + (currentPrompt(snapshot) || "No prompt available") +
        "\n\nSpeech to summarise:\n" + formatEntries(input.newEntries),
      maxTokens: 200
    });
    return reply ? reply.text : null;
  }

  // Step 3b: every connected learner in that room gets the check-in privately, in the
  // language they chose to read the workshop in.
  async function deliverCheckin(input) {
    const learners = Object.keys(diagnostics.connections)
      .map(function (participantId) { return diagnostics.connections[participantId]; })
      .filter(function (connection) {
        return connection.role !== "facilitator" && connection.room_name === input.roomName;
      });
    if (!learners.length) return { recipients: 0 };

    // One translator call per distinct reading language, shared by every learner
    // reading in it.
    const byLanguage = {};
    learners.forEach(function (learner) {
      const language = normalizeLanguage(learner.language) || "en";
      (byLanguage[language] || (byLanguage[language] = [])).push(learner);
    });
    const createdAt = new Date().toISOString();
    const stamp = Date.now();

    await Promise.all(Object.keys(byLanguage).map(async function (language) {
      const text = language === "en"
        ? input.summaryText
        : await translateOrKeep(input.summaryText, "en", language);
      byLanguage[language].forEach(function (learner, index) {
        runtime.recordPrivateMessage({
          message_id: "message-checkin-" + stamp + "-" + language + "-" + index,
          target_id: learner.participant_id,
          sender: "bud",
          message_type: "periodic_summary",
          text: text,
          language: language,
          provider: "local-llm",
          created_at: createdAt
        });
      });
    }));

    return { recipients: learners.length, languages: Object.keys(byLanguage) };
  }

  // Writes a spoken sentence to the transcript log and lets the check-in scheduler
  // count its words. Every transcript entry goes through here so no speech can reach
  // the log without being counted.
  function logSpeech(entry) {
    const stored = transcriptLog.record(entry);
    if (stored) checkinScheduler.noteSpeech(stored);
    return stored;
  }

  seedWorkshop(runtime);

  return http.createServer(function (req, res) {
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
        try {
          const { ensureRoom } = require("./livekit/livekit-adapter");
          const livekitRoom = await ensureRoom(roomName);
          if (!roomDirectory.rooms[roomName]) {
            roomDirectory.rooms[roomName] = { room_name: roomName, allocations: {}, participant_screen_share_enabled: false };
          }
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
        sendJson(res, { allocation: roomDirectory.rooms[roomName].allocations[participantId], rooms: listRooms(roomDirectory) });
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
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || "bud-demo-room";
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
        sendJson(res, { room_name: roomName, participant_screen_share_enabled: roomDirectory.rooms[roomName].participant_screen_share_enabled });
      });
    }

    if (req.method === "GET" && req.url.indexOf("/api/facilitator/source-pack") === 0) {
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || "bud-demo-room";
      return sendJson(res, sourcePackStore.get(roomName));
    }

    if (req.method === "POST" && req.url === "/api/facilitator/source-material") {
      return readJson(req, res, function (body) {
        try {
          const result = sourcePackStore.addMaterial(body);
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
          sendJson(res, { source_pack: sourcePackStore.activate(roomName, body.version) });
        } catch (error) {
          sendJson(res, { error: error.message }, 400);
        }
      });
    }

    if (req.method === "POST" && req.url === "/api/transcribe") {
      return readBinary(req, res, function (audio, headers) {
        const requestStartedAt = Date.now();
        // The sentence so far primes the transcriber so this chunk continues it rather
        // than being read as a fresh utterance, behind a punctuated sample that stops
        // the transcript from drifting into having no punctuation at all. See
        // transcriptionPrompt.
        const continuityPrompt = transcriptionPrompt(
          normalizeLanguage(headers["x-native-language"]),
          sentenceBuffer.pending(headers["x-participant-id"] || config.participant_id)
        );
        transcribeAudio(audio, headers, continuityPrompt, function (error, transcript) {
          if (error) {
            return sendJson(res, {
              error: error.message,
              code: "STT_UNAVAILABLE",
              speech_sequence: headers["x-speech-sequence"] || null,
              timings_ms: { total: Date.now() - requestStartedAt }
            }, 503);
          }
          const sttCompletedAt = Date.now();
          const participantId = headers["x-participant-id"] || config.participant_id;
          const nativeLanguage = normalizeLanguage(headers["x-native-language"]);
          const targetLanguage = headers["x-target-language"] || "es";
          const speechSequence = headers["x-speech-sequence"] || null;
          const roomName = cleanRoomName(headers["x-room-name"]) || "bud-demo-room";
          const speaker = speakerIdentity(diagnostics, participantId);
          // Whisper is told which language to expect, so its reported language is a
          // weak signal at best. A mismatch is no longer grounds for dropping the
          // utterance — doing that silently deleted a large share of real speech.
          if (nativeLanguage) transcript.language = nativeLanguage;
          // Kept so the sentence buffer can publish this speaker's words later, on its
          // own timer, without a request to read them from.
          speakerContext[participantId] = {
            participantId: participantId,
            roomName: roomName,
            sourceLanguage: transcript.language,
            targetLanguage: targetLanguage,
            speaker: speaker
          };
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
              is_final_fragment: true,
              stt_provider: transcript.provider,
              stt_confidence: transcript.language_probability
            }
          });
          const completedEvent = baseEvent({
            event_id: "stt-completed-" + Date.now(),
            type: "utterance_completed",
            source: "faster-whisper",
            privacy_scope: "public_shared",
            language: transcript.language,
            actor: { actor_type: "participant", participant_id: participantId },
            payload: {
              utterance_id: utteranceId,
              original_text: transcript.text,
              original_language: transcript.language,
              completion_reason: "timeout",
              source_event_ids: [sourceEvent.event_id]
            }
          });
          const partialResult = transcript.text ? runtime.handleEvent(sourceEvent) : null;
          const completedResult = transcript.text ? runtime.handleEvent(completedEvent) : null;
          // Audio is cut on pauses, which rarely coincide with sentence ends. Hold the
          // fragment until it completes a sentence so the translator sees a whole
          // thought; the original text above still goes back immediately.
          // The microphone reports when it stopped hearing this chunk and when it
          // started, as ages in milliseconds, so the buffer can measure the pause the
          // speaker actually left rather than the time transcription took.
          const speechEndedAt = requestStartedAt - headerAge(headers["x-speech-silence-ms"]);
          const assembled = sentenceBuffer.push(participantId, transcript.text, Date.now(), {
            speechStartedAt: requestStartedAt - headerAge(headers["x-speech-lead-ms"]),
            speechEndedAt: speechEndedAt,
            sequence: Number(speechSequence) || 0
          });
          if (!assembled.ready) {
            recordTranscriptionDiagnostic(diagnostics, participantId, {
              stt: sttCompletedAt - requestStartedAt,
              translation: 0,
              total: Date.now() - requestStartedAt
            }, false);
            return sendJson(res, {
              transcript,
              translation: null,
              pending_sentence: assembled.pending,
              speech_sequence: speechSequence,
              timings_ms: {
                stt: sttCompletedAt - requestStartedAt,
                translation: 0,
                total: Date.now() - requestStartedAt
              },
              events: [sourceEvent, completedEvent],
              result: completedResult ? summarizeResult(completedResult) : null,
              state: learnerState(runtime, participantId)
            });
          }
          // The assembled sentence, not this chunk, is what gets translated and logged.
          const sentenceText = assembled.ready;
          const translationStartedAt = Date.now();
          publishSentence(Object.assign({}, speakerContext[participantId], {
            utteranceId: utteranceId,
            contextEventIds: [completedEvent.event_id],
            createdAt: completedEvent.occurred_at
          }), sentenceText, function (published) {
            recordTranscriptionDiagnostic(diagnostics, participantId, {
              stt: sttCompletedAt - requestStartedAt,
              translation: Date.now() - translationStartedAt,
              total: Date.now() - requestStartedAt
            }, published.failed);
            sendJson(res, {
              transcript,
              sentence: sentenceText,
              translation: published.failed ? { unavailable: true } : published.translation,
              speech_sequence: speechSequence,
              timings_ms: {
                stt: sttCompletedAt - requestStartedAt,
                translation: Date.now() - translationStartedAt,
                total: Date.now() - requestStartedAt
              },
              events: published.event
                ? [sourceEvent, completedEvent, published.event]
                : [sourceEvent, completedEvent],
              result: completedResult ? summarizeResult(completedResult) : null,
              state: learnerState(runtime, participantId)
            });
          });
        });
      });
    }

    // Called when a speaker stops talking. Whatever is still held is translated as-is,
    // even without a closing full stop, so a trailing half-sentence is never lost.
    if (req.method === "POST" && req.url === "/api/transcribe/flush") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || config.participant_id);
        const targetLanguage = body.target_language || "es";
        const sourceLanguage = normalizeLanguage(body.native_language) || "en";
        const roomName = cleanRoomName(body.room_name) || "bud-demo-room";
        const speaker = speakerIdentity(diagnostics, participantId);
        const assembled = sentenceBuffer.flush(participantId);
        if (!assembled.ready) {
          return sendJson(res, { sentence: null, translation: null });
        }
        const sentenceText = assembled.ready;
        publishSentence({
          participantId: participantId,
          roomName: roomName,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          speaker: speaker,
          utteranceId: "utterance-flush-" + Date.now()
        }, sentenceText, function (published) {
          sendJson(res, {
            sentence: sentenceText,
            translation: published.failed ? { unavailable: true } : published.translation
          });
        });
      });
    }

    // The microphone has started recording a chunk it can hear speech in. This arrives
    // seconds before that chunk's audio has been transcribed, and it is the only way the
    // server can tell "gone quiet, publish what you are holding" apart from "still
    // talking, their words are queued behind the transcriber". Deliberately tiny: it is
    // sent once per utterance and must never sit behind anything slow.
    if (req.method === "POST" && req.url === "/api/transcribe/speaking") {
      return readJson(req, res, function (body) {
        sentenceBuffer.markSpeaking(
          String(body.participant_id || config.participant_id),
          Number(body.speech_sequence) || 0
        );
        sendJson(res, { ok: true });
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/state") {
      const stateUrl = new URL(req.url, "http://127.0.0.1");
      return sendJson(res, learnerState(runtime, stateUrl.searchParams.get("participant_id") || config.participant_id));
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/facilitator/state") {
      const facilitatorUrl = new URL(req.url, "http://127.0.0.1");
      return sendJson(res, facilitatorState(runtime, checkinScheduler, facilitatorUrl.searchParams.get("room")));
    }

    // Room-wide live captions. Every participant polls this, so the panel shows what
    // everyone said and who said it, not only the turns this browser's own microphone
    // produced. Each viewer asks for its own language and the turn is translated on
    // demand if it was not already translated that way for the speaker.
    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/transcript/live") {
      const liveUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(liveUrl.searchParams.get("room")) || "bud-demo-room";
      const afterSequence = Number(liveUrl.searchParams.get("after")) || 0;
      const targetLanguage = normalizeLanguage(liveUrl.searchParams.get("target"));
      const pending = transcriptLog.since(roomName, afterSequence, 25);
      // A client joining mid-session asks with after=0; give it the tail rather than
      // replaying and re-translating the whole workshop.
      const entries = afterSequence ? pending : pending.slice(-8);
      return captionEntries(entries, targetLanguage, captionTranslations, function (captions, nextAfter) {
        sendJson(res, {
          room_name: roomName,
          latest_sequence: transcriptLog.latestSequence(roomName),
          target_language: targetLanguage || null,
          // How far the client may advance its cursor. Rows past this are still
          // translating and will be sent again, with their translation, next poll.
          next_after: nextAfter || afterSequence,
          entries: captions
        });
      });
    }

    // The shared workshop discussion, rendered for one reader. Everyone sees the same
    // posts, but each viewer asks for its own language so a post written in Spanish is
    // shown in Spanish with the reader's own language underneath it.
    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/group-messages") {
      const groupUrl = new URL(req.url, "http://127.0.0.1");
      const targetLanguage = normalizeLanguage(groupUrl.searchParams.get("target"));
      const messages = learnerState(runtime, config.participant_id).group_messages.slice(-20);
      return sharedMessageRows(messages, targetLanguage, diagnostics, sharedMessageTranslations, function (rows) {
        sendJson(res, { target_language: targetLanguage || null, messages: rows });
      });
    }

    if (req.method === "GET" && req.url.indexOf("/api/transcript") === 0) {
      const transcriptUrl = new URL(req.url, "http://127.0.0.1");
      const roomName = cleanRoomName(transcriptUrl.searchParams.get("room")) || "bud-demo-room";
      const limit = Number(transcriptUrl.searchParams.get("limit")) || 20;
      return sendJson(res, {
        room_name: roomName,
        entries: transcriptLog.recent(roomName, Math.min(limit, 100))
      });
    }

    if (req.method === "GET" && req.url === "/api/topview/state") {
      return sendJson(res, topviewState(diagnostics, roomDirectory));
    }

    if (req.method === "POST" && req.url === "/api/topview/presence") {
      return readJson(req, res, function (body) {
        const participantId = String(body.participant_id || "").trim();
        if (!participantId) return sendJson(res, { error: "participant_id is required" }, 400);
        if (body.connected === false) {
          delete diagnostics.connections[participantId];
        } else {
          diagnostics.connections[participantId] = {
            participant_id: participantId,
            display_name: String(body.display_name || participantId),
            role: body.role === "facilitator" ? "facilitator" : "learner",
            room_name: String(body.room_name || "unknown"),
            language: String(body.language || "unknown"),
            microphone_active: Boolean(body.microphone_active),
            connected_at: diagnostics.connections[participantId] && diagnostics.connections[participantId].connected_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
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
          state: facilitatorState(runtime, checkinScheduler, body.room_name)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/help-stuck") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const sourcePackContext = sourcePackStore.context(body.room_name || "bud-demo-room", "current workshop material");
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
            text: String(body.text || ""),
            language: "en"
          }
        }));
        runtime.recordPrivateMessage({
          message_id: "message-learner-" + Date.now(),
          target_id: participantId,
          sender: "learner",
          text: String(body.text || ""),
          created_at: new Date().toISOString()
        });
        const escalationRequested = result.decision.decision_type === "CREATE_FACILITATOR_SIGNAL";
        const localReply = escalationRequested ? null : await askLocalBud({
          workshopPrompt: currentPrompt(runtime.getStateSnapshot()),
          question: String(body.text || ""),
          sourceContext: sourcePackStore.context(body.room_name || "bud-demo-room", String(body.text || "")),
          transcriptContext: transcriptLog.context(body.room_name || "bud-demo-room", String(body.text || ""))
        });
        if (escalationRequested) {
          runtime.recordPrivateMessage({
            message_id: "message-escalation-confirmation-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: "I've notified the facilitator that you requested help. Your private message was not shared.",
            created_at: new Date().toISOString()
          });
        }
        if (localReply) {
          runtime.recordPrivateMessage({
            message_id: "message-qwen-" + Date.now(),
            target_id: participantId,
            text: localReply.text,
            provider: localReply.provider,
            latency_ms: localReply.latency_ms,
            created_at: new Date().toISOString()
          });
        } else if (!escalationRequested) {
          // The local model is unreachable or has no model loaded. Say so instead of
          // leaving the learner staring at a chatbox that silently swallowed the turn.
          runtime.recordPrivateMessage({
            message_id: "message-unavailable-" + Date.now(),
            target_id: participantId,
            text: "I could not reach my local language model, so I have no answer for that yet. Your message was saved.",
            created_at: new Date().toISOString()
          });
        }
        sendJson(res, {
          result: summarizeResult(result),
          state: learnerState(runtime, participantId)
        });
      });
    }

    // What the check-in scheduler is doing per room: how much has been said since the
    // last judgement, how many check-ins have gone out, and why the last one did or
    // did not fire.
    if (req.method === "GET" && req.url.startsWith("/api/checkins")) {
      return sendJson(res, { word_interval: checkinScheduler.wordInterval, rooms: checkinScheduler.stats() });
    }

    if (req.method === "POST" && req.url === "/api/facilitator-message") {
      return readJson(req, res, async function (body) {
        const text = String(body.text || "").trim();
        if (!text) return sendJson(res, { error: "Message text is required" }, 400);
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-facil-bud-message-" + Date.now(),
          type: "participant_message",
          source: "facilitator-web",
          privacy_scope: "private_facilitator_ai",
          actor: { actor_type: "facilitator", participant_id: "facilitator-1" },
          payload: {
            message_id: "message-facil-bud-user-" + Date.now(),
            text: text,
            language: "en"
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
        const localReply = await askLocalBud({
          workshopPrompt: currentPrompt(runtime.getStateSnapshot()),
          question: text + "\nAnswer for the facilitator using room-level evidence and do not reveal private learner content.",
          sourceContext: sourcePackStore.context(body.room_name || "bud-demo-room", text),
          transcriptContext: transcriptLog.context(body.room_name || "bud-demo-room", text)
        });
        if (localReply) {
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: localReply.text,
            provider: localReply.provider,
            latency_ms: localReply.latency_ms,
            created_at: new Date().toISOString()
          });
        }
        sendJson(res, {
          result: summarizeResult(result),
          state: facilitatorState(runtime, checkinScheduler, body.room_name)
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
        sendJson(res, { state: facilitatorState(runtime, checkinScheduler, body.room_name) });
      });
    }

    if (req.method === "POST" && req.url === "/api/group-message") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const text = String(body.text || "").trim();
        if (!text) {
          return sendJson(res, { error: "Message text is required" }, 400);
        }
        const event = baseEvent({
          event_id: "ui-group-message-" + Date.now(),
          type: "participant_message",
          source: "web",
          privacy_scope: "group_shared",
          actor: { actor_type: "participant", participant_id: participantId },
          payload: {
            message_id: "message-group-" + Date.now(),
            group_id: body.group_id || "group-main",
            text: text,
            language: body.language || "en"
          }
        });
        const result = runtime.handleEvent(event);
        runtime.recordSharedMessage({
          message_id: event.payload.message_id,
          scope: "group_shared",
          target_id: event.payload.group_id,
          sender_id: participantId,
          text: text,
          language: event.payload.language,
          created_at: event.occurred_at
        });
        sendJson(res, {
          event: event,
          result: summarizeResult(result),
          state: learnerState(runtime, participantId)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/comprehension-response") {
      return readJson(req, res, function (body) {
        const participantId = body.participant_id || config.participant_id;
        const roomName = body.room_name || "bud-demo-room";
        // The check-in the learner is answering about. Everything they report is
        // filed under it, and one learner gets one answer per chapter.
        const chapter = checkinScheduler.currentChapter(roomName);
        const existing = comprehensionReportFor(runtime, participantId, chapter.chapter_id);
        // Tapping the same answer again is a no-op: it must not raise a second event,
        // send a second private message, or move any number in the room report.
        if (existing && existing.status === body.response) {
          return sendJson(res, {
            result: { unchanged: true, chapter_id: chapter.chapter_id },
            state: learnerState(runtime, participantId)
          });
        }
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-comprehension-" + Date.now(),
          type: "comprehension_check_response",
          source: "web",
          privacy_scope: "private_participant_ai",
          actor: { actor_type: "participant", participant_id: participantId },
          payload: {
            checkin_id: chapter.chapter_id,
            // The finest unit a learner can point at today is the whole chapter.
            // Once check-in summaries are broken into numbered points, this narrows
            // to the individual point they flagged.
            recap_point_id: chapter.chapter_id,
            chapter: chapter,
            response: body.response
          }
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
}

function seedWorkshop(runtime) {
  runtime.handleEvent(baseEvent({
    event_id: "ui-facilitator-prompt-001",
    type: "facilitator_instruction",
    source: "system",
    privacy_scope: "public_shared",
    actor: {
      actor_type: "facilitator",
      participant_id: "facilitator-1"
    },
    payload: {
      instruction_id: "ui-instruction-001",
      text: "Define success criteria for your prototype: name the user goal, describe what a good outcome looks like, and list the evidence that would prove it worked.",
      target: "room",
      language: "en"
    }
  }));
}

function cleanRoomName(value) {
  const name = String(value || "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(name) ? name : "";
}

// How many times one caption is offered to the translator before the room gives up and
// shows it in the original language. Without a ceiling a turn the translator cannot
// handle would be retried on every poll, by every listener, forever.
const CAPTION_TRANSLATION_ATTEMPTS = 3;

// Turns logged transcript entries into caption rows for one listener. The speaker's own
// translation is reused when it happens to match, otherwise the turn is translated into
// the listener's language once and cached on the entry for everyone else asking for it.
//
// This never waits for a translation. It used to: the response was held until every row
// in the batch had one, so a single slow turn kept every other caption — including ones
// already translated and sitting in memory — off the panel behind it. Now a row whose
// translation is not ready yet goes out immediately in the original language, its
// translation continues in the background, and the caller re-sends that row on a later
// poll once it lands.
//
// Calls back with (rows, nextAfter). `nextAfter` is the sequence number the client may
// safely advance its cursor to: the last row before the first one still translating.
// Everything from there on is re-sent next poll and updated in place, so a caption is
// never stuck showing the original once its translation exists.
function captionEntries(entries, targetLanguage, inFlight, callback) {
  if (!entries.length) return callback([], 0);

  let nextAfter = 0;
  let stillResolving = false;

  const rows = entries.map(function (entry) {
    const resolved = captionTranslation(entry, targetLanguage, inFlight);
    // The cursor may only advance across an unbroken run of finished rows. Stopping at
    // the first unfinished one is what guarantees it comes back.
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
      // Tells the client this row is worth replacing when a better one arrives, rather
      // than being a turn that simply needs no translation.
      translation_pending: resolved.pending,
      created_at: entry.created_at
    };
  });

  callback(rows, nextAfter);
}

// Returns { text, pending } for one caption without ever blocking. A miss starts the
// translation in the background so a later poll finds it cached on the entry.
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
    // Tried and failed often enough. The original is what this listener gets: a caption
    // nobody can read still beats a speaker silently missing from the panel.
    return { text: null, pending: false };
  }

  // One translation per turn per language however many people are polling for it.
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

// Turns shared workshop posts into rows for one reader: the post as it was written,
// plus the same post in the reader's language. A post already in that language gets no
// translation, so the reader sees a single line rather than the text twice.
function sharedMessageRows(messages, targetLanguage, diagnostics, cache, callback) {
  if (!messages.length) return callback([]);
  const rows = new Array(messages.length);
  let outstanding = messages.length;

  messages.forEach(function (message, index) {
    const sourceLanguage = normalizeLanguage(message.language) || "en";
    const speaker = speakerIdentity(diagnostics, message.sender_id);

    function finish(translatedText) {
      rows[index] = {
        message_id: message.message_id,
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
            // Show the post untranslated rather than dropping it, and forget the failure
            // so the next poll can try the translator again.
            delete cache[key];
            resolve(null);
          }
        });
      });
    }
    cache[key].then(finish);
  });
}

// The transcribe request only carries a participant ID, so the readable name and the
// role come from the presence record the client already reports to the top view.
function speakerIdentity(diagnostics, participantId) {
  const connection = diagnostics.connections[participantId];
  if (connection) {
    return { display_name: connection.display_name || participantId, role: connection.role };
  }
  return {
    display_name: participantId,
    role: String(participantId).indexOf("facilitator") === 0 ? "facilitator" : "learner"
  };
}

// Whisper copies the style of whatever prompt it is given — spelling, casing and, most
// visibly here, punctuation. Priming it with the sentence so far keeps a chopped-up
// utterance reading as one sentence, but it also created a trap: the moment one
// fragment came back unpunctuated, that fragment became the prompt for the next chunk,
// which then matched its style and dropped punctuation too. Since the sentence buffer
// looks for terminal punctuation to decide a thought is finished, it then never saw
// one, so more unpunctuated text accumulated and primed the next chunk more strongly.
// A transcript that starts out punctuated loses punctuation entirely a few chunks in.
//
// These short punctuated samples go in front of the running sentence, so the style
// Whisper copies is always a punctuated one no matter what the last chunk returned.
const PUNCTUATION_PRIMERS = {
  en: "Right, let's begin. Before we start, I want to introduce something new.",
  es: "Bien, empecemos. Antes de comenzar, quiero presentar algo nuevo.",
  zh: "好，我们开始吧。在正式开始之前，我想先介绍一个新东西。",
  fr: "Bien, commençons. Avant de démarrer, je voudrais présenter quelque chose.",
  my: "ကောင်းပြီ၊ စတင်ကြရအောင်။ မစခင်မှာ အသစ်တစ်ခုကို မိတ်ဆက်ပေးချင်ပါတယ်။",
  th: "เอาล่ะ เรามาเริ่มกันเลย ก่อนเริ่ม ผมอยากแนะนำสิ่งใหม่"
};

// Both transcription providers keep only the tail of the prompt, so the running
// sentence is trimmed here rather than there — otherwise the primer, sitting at the
// front, would be the first thing dropped and would never reach the model at all.
const MAX_PENDING_PROMPT_CHARS = 250;

function transcriptionPrompt(language, pending) {
  const primer = PUNCTUATION_PRIMERS[String(language || "").toLowerCase()] || PUNCTUATION_PRIMERS.en;
  const sentenceSoFar = String(pending || "").trim().slice(-MAX_PENDING_PROMPT_CHARS);
  return sentenceSoFar ? primer + " " + sentenceSoFar : primer;
}

// The microphone reports its timings as ages ("this chunk fell silent 900ms ago")
// rather than as clock times, because the browser's clock and the server's need not
// agree and a few seconds of skew would wreck the pause measurement entirely.
// Anything missing or nonsensical reads as zero, i.e. "just now", which is the same
// behaviour as before these headers existed.
function headerAge(value) {
  const age = Number(value);
  if (!isFinite(age) || age < 0) return 0;
  // A minute-old chunk means a stuck client, not a minute-long pause.
  return Math.min(age, 60000);
}

function normalizeLanguage(value) {
  const language = String(value || "").trim().toLowerCase();
  return ["en", "es", "zh", "my", "fr", "th"].indexOf(language) === -1 ? "" : language;
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

function topviewState(diagnostics, roomDirectory) {
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
      groq_stt: groqSttConfigured(),
      translation: Boolean(process.env.TRANSLATION_HOST || process.env.TRANSLATION_PORT),
      llm_translation: llmTranslateConfigured() ? llmTranslateBackend() : false,
      qwen: Boolean(process.env.LLM_HOST || process.env.LLM_PORT)
    },
    events: diagnostics.events
  };
}

function listRooms(roomDirectory) {
  return Object.keys(roomDirectory.rooms).map(function (roomName) {
    const room = roomDirectory.rooms[roomName];
    return {
      room_name: room.room_name,
      allocations: Object.keys(room.allocations).map(function (participantId) {
        return room.allocations[participantId];
      })
    };
  });
}

function learnerState(runtime, participantId) {
  const state = runtime.getStateSnapshot();
  return {
    participant_id: participantId,
    workshop: {
      title: state.workshop.title,
      phase: state.workshop.phase,
      prompt: currentPrompt(state)
    },
    private_messages: state.messages.filter(function (message) {
      return message.scope === "private_participant_ai" && message.target_id === participantId;
    }),
    group_messages: state.messages.filter(function (message) {
      return message.scope === "group_shared";
    }),
    participant: state.participants[participantId] || null,
    tool_results: state.tool_results.slice(-8)
  };
}

// What one learner said about one chapter, or null if they have not answered for it.
function comprehensionReportFor(runtime, participantId, chapterId) {
  const participant = runtime.getStateSnapshot().participants[participantId];
  const reports = participant && participant.comprehension && participant.comprehension.reports;
  if (!Array.isArray(reports)) return null;
  return reports.filter(function (report) { return report.chapter_id === chapterId; })[0] || null;
}

function emptyChapterSummary(chapter, total) {
  return {
    chapter_id: chapter ? chapter.chapter_id : null,
    chapter_index: chapter ? chapter.index : null,
    label: chapter ? chapter.label : null,
    summary_text: chapter ? chapter.summary_text : null,
    green: 0,
    yellow: 0,
    red: 0,
    answered: 0,
    unanswered: total,
    total: total,
    flagged: 0,
    flagged_share: 0
  };
}

// One row per chapter: how many learners answered, and how many of those flagged
// trouble. Coverage is kept separate from confusion on purpose - silence is not a
// report, so it must never be counted as one.
function summariseChapterResponses(participants, deliveredChapters, currentChapter) {
  const order = [];
  const rows = {};
  function row(chapter) {
    if (!chapter || !chapter.chapter_id) return null;
    if (!rows[chapter.chapter_id]) {
      rows[chapter.chapter_id] = emptyChapterSummary(chapter, participants.length);
      order.push(chapter.chapter_id);
    }
    return rows[chapter.chapter_id];
  }
  deliveredChapters.forEach(row);
  // The opening chapter is not a delivered check-in, so it only appears once someone
  // has actually answered against it.
  if (currentChapter) row(currentChapter);

  participants.forEach(function (participant) {
    (participant.comprehension_reports || []).forEach(function (report) {
      const target = row({
        chapter_id: report.chapter_id,
        index: report.chapter_index,
        label: report.chapter_label,
        summary_text: report.chapter_summary
      });
      if (!target) return;
      if (target[report.status] === undefined) return;
      target[report.status] += 1;
      target.answered += 1;
    });
  });

  return order.map(function (chapterId) {
    const entry = rows[chapterId];
    entry.unanswered = Math.max(0, entry.total - entry.answered);
    entry.flagged = entry.yellow + entry.red;
    entry.flagged_share = entry.answered ? entry.flagged / entry.answered : 0;
    return entry;
  }).sort(function (left, right) {
    return (left.chapter_index || 0) - (right.chapter_index || 0);
  });
}

function chapterName(entry) {
  if (!entry) return null;
  if (entry.summary_text) return (entry.label || "a check-in") + ' - "' + firstSentence(entry.summary_text) + '"';
  return entry.label || entry.chapter_id;
}

function firstSentence(text) {
  const trimmed = String(text || "").trim().split(/(?<=[.!?])\s/)[0] || "";
  return trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed;
}

function roomReportText(current, hardest) {
  if (!current || !current.total) {
    return "Room report: no learners are connected yet.";
  }
  const heading = current.label ? "Room report for " + current.label + ": " : "Room report: ";
  if (!current.answered) {
    return heading + "none of " + current.total + " learners have answered yet.";
  }
  const percent = Math.round(current.flagged_share * 100);
  return heading + current.answered + " of " + current.total + " answered, " +
    current.flagged + " flagged trouble (" + percent + "% of those who answered)." +
    (hardest && hardest.chapter_id !== current.chapter_id
      ? " Hardest so far: " + chapterName(hardest) + "."
      : "");
}

function facilitatorState(runtime, checkinScheduler, roomName) {
  const state = runtime.getStateSnapshot();
  const room = roomName || "bud-demo-room";
  // The chapter learners are currently answering about, and every chapter so far.
  const currentChapter = checkinScheduler ? checkinScheduler.currentChapter(room) : null;
  const deliveredChapters = checkinScheduler ? checkinScheduler.chapters(room) : [];
  const participants = Object.keys(state.participants).map(function (participantId) {
    const participant = state.participants[participantId];
    const comprehension = participant.comprehension || {};
    const reports = Array.isArray(comprehension.reports) ? comprehension.reports : [];
    const currentReport = currentChapter ? reports.filter(function (report) {
      return report.chapter_id === currentChapter.chapter_id;
    })[0] : null;
    return {
      participant_id: participantId,
      display_name: participant.display_name,
      role: participant.role,
      participation: participant.participation && participant.participation.status || "unknown",
      // What they said about the chapter that is live now, not whatever they last
      // said at any point in the session. An answer from three chapters ago is not
      // evidence about the material the room is on.
      comprehension: currentReport ? currentReport.status : "unknown",
      comprehension_all_time: comprehension.status || "unknown",
      comprehension_chapter_id: currentReport ? currentReport.chapter_id : null,
      comprehension_reports: reports,
      updated_at: participant.updated_at
    };
  }).filter(function (participant) {
    return participant.role !== "facilitator";
  });

  const chapterSummaries = summariseChapterResponses(participants, deliveredChapters, currentChapter);
  const currentSummary = chapterSummaries.filter(function (entry) {
    return currentChapter && entry.chapter_id === currentChapter.chapter_id;
  })[0] || emptyChapterSummary(currentChapter, participants.length);
  // Ranked by the share of answers that flagged trouble, not by raw count: four of
  // six struggling is a worse chapter than five of twenty.
  const hardestChapter = chapterSummaries.filter(function (entry) {
    return entry.flagged > 0;
  }).sort(function (left, right) {
    return right.flagged_share - left.flagged_share || right.flagged - left.flagged;
  })[0] || null;

  const rollup = {
    green: currentSummary.green,
    yellow: currentSummary.yellow,
    red: currentSummary.red,
    unknown: currentSummary.unanswered
  };
  const responded = currentSummary.answered;
  const total = currentSummary.total;
  return {
    workshop: {
      title: state.workshop.title,
      phase: state.workshop.phase,
      prompt: currentPrompt(state),
      supported_languages: state.workshop.supported_languages
    },
    participants,
    current_chapter: currentSummary,
    chapter_breakdown: chapterSummaries,
    rollup: Object.assign({}, rollup, {
      most_flagged_recap_point: hardestChapter ? chapterName(hardestChapter) : null,
      most_flagged_count: hardestChapter ? hardestChapter.flagged : 0
    }),
    room_report: {
      generated_at: new Date().toISOString(),
      total_participants: total,
      responded: responded,
      chapter_id: currentSummary.chapter_id,
      text: roomReportText(currentSummary, hardestChapter)
    },
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
      return message.scope === "private_facilitator_ai" && message.target_id === "facilitator-1";
    })
  };
}

function currentPrompt(state) {
  const prompts = state.workshop.evidence_index.filter(function (item) {
    return item.event_type === "facilitator_instruction" && item.text;
  });
  return prompts.length ? prompts[prompts.length - 1].text : "";
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
    try {
      Promise.resolve(callback(body ? JSON.parse(body) : {})).catch(function (error) {
        sendJson(res, { error: error.message || "Request failed" }, 500);
      });
    } catch (error) {
      if (process.env.BUD_DEBUG_ERRORS) console.error(error);
      sendJson(res, { error: "Invalid JSON" }, 400);
    }
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

// Routes to hosted Groq when a key is present, otherwise to the local Whisper
// container. A Groq failure (no quota, network, bad key) falls back to local rather
// than dropping the utterance, so a demo never dies on a missing API key.
// `prompt` carries the sentence so far. Both providers use it to keep spelling,
// casing and punctuation continuous across chunk boundaries instead of restarting
// cold on every fragment — the boundary is arbitrary, so the words either side of it
// belong to one sentence.
function transcribeAudio(audio, headers, prompt, callback) {
  if (typeof prompt === "function") {
    callback = prompt;
    prompt = "";
  }
  const languageHint = normalizeLanguage(headers["x-native-language"]);
  const contentType = headers["content-type"] || "audio/webm";
  const preferGroq = String(process.env.STT_PROVIDER || "").toLowerCase() !== "local" && groqSttConfigured();

  // Both providers hand back invented subtitle text when the audio was background
  // noise, so the filter sits on the shared path out rather than in either provider.
  // A dropped utterance leaves an empty transcript, which the caller already treats as
  // "nothing was said" — no event is published and nothing is translated.
  const done = function (error, transcript) {
    if (error || !transcript) return callback(error, transcript);
    const cleaned = cleanTranscript(transcript.text, {
      participantId: headers["x-participant-id"] || "unknown"
    });
    if (cleaned.dropped) {
      console.log("Dropped hallucinated transcript (" + cleaned.reason + ")");
    }
    transcript.text = cleaned.text;
    callback(null, transcript);
  };

  if (!preferGroq) {
    return transcribeWithLocalWhisper(audio, contentType, languageHint, prompt, done);
  }

  transcribeWithGroq(audio, contentType, languageHint, prompt)
    .then(function (transcript) { done(null, transcript); })
    .catch(function (error) {
      console.warn("Groq STT failed, falling back to local Whisper:", error.message);
      transcribeWithLocalWhisper(audio, contentType, languageHint, prompt, done);
    });
}

function transcribeWithLocalWhisper(audio, contentType, languageHint, prompt, callback) {
  if (typeof prompt === "function") {
    callback = prompt;
    prompt = "";
  }
  const request = http.request({
    hostname: process.env.STT_HOST || "127.0.0.1",
    port: Number(process.env.STT_PORT || 8787),
    path: "/transcribe",
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Content-Length": audio.length,
      // Pinning the language stops Whisper re-guessing it on every short chunk,
      // which is where Burmese in particular gets misread as a neighbouring script.
      "X-Language-Hint": languageHint,
      // Header values must be latin-1, so non-ASCII prompts (Burmese, Chinese) are
      // base64-encoded and decoded on the Python side.
      "X-Prompt": Buffer.from(String(prompt || ""), "utf8").toString("base64")
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

const MAX_REMEMBERED_UTTERANCES = 6;

function rememberUtterance(store, participantId, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  const turns = store[participantId] || (store[participantId] = []);
  turns.push(trimmed);
  if (turns.length > MAX_REMEMBERED_UTTERANCES) turns.shift();
}

// Routes to the context-aware LLM translator when one is configured, falling back to
// the local NLLB container if it errors so a failed call never loses the utterance.
function translateText(text, sourceLanguage, targetLanguage, context, callback) {
  if (typeof context === "function") {
    callback = context;
    context = {};
  }

  if (!llmTranslateConfigured()) {
    return translateWithNllb(text, sourceLanguage, targetLanguage, callback);
  }

  translateWithLlm({
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

// Promise wrapper for one-off translations, used for check-in summaries. A failed
// translation returns the original text rather than nothing: a learner reading a
// check-in in English is better served than a learner receiving silence.
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
  const sourceText = input.sourceContext && input.sourceContext.text
    ? "\n\nActive Workshop Source Pack (version " + input.sourceContext.version + "):\n" + input.sourceContext.text
    : "\n\nActive Workshop Source Pack: none is currently active.";
  const transcriptText = input.transcriptContext && input.transcriptContext.text
    ? "\n\nLive room transcript (what was spoken aloud, with translations):\n" + input.transcriptContext.text
    : "\n\nLive room transcript: nothing has been spoken aloud yet.";
  return callLocalModel({
    system: "You are Bud, a friendly and concise workshop learning companion. Use only the supplied workshop prompt, active Workshop Source Pack, live room transcript, and permitted question. Do not invent workshop facts. The transcript is machine transcribed and machine translated, so quote it as what was said rather than as exact wording, and name the speaker when you use it. If the supplied material is insufficient, say so and ask one clarifying question. When using source material, mention its filename and slide/page/section when practical. Answer in no more than three short sentences.",
    user: "Current workshop prompt:\n" + (input.workshopPrompt || "No prompt available") + sourceText + transcriptText + "\n\nLearner question:\n" + input.question,
    maxTokens: 180
  });
}

// One request to the local Qwen server. Every caller gets the same failure shape: a
// null result rather than a thrown error, because a missing model must never take
// down a live workshop.
function callLocalModel(input) {
  const body = Buffer.from(JSON.stringify({
    system: input.system,
    user: input.user,
    max_tokens: input.maxTokens || 180
  }));
  return new Promise(function (resolve) {
    const request = http.request({
      hostname: process.env.LLM_HOST || "127.0.0.1",
      port: Number(process.env.LLM_PORT || 8790),
      path: "/chat",
      method: "POST",
      timeout: input.timeoutMs || 12000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length
      }
    }, function (response) {
      let result = "";
      response.on("data", function (chunk) { result += chunk; });
      response.on("end", function () {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          console.warn("Local Bud model returned HTTP " + response.statusCode + ": " + result.slice(0, 200));
          return resolve(null);
        }
        try {
          const parsed = JSON.parse(result);
          if (!parsed.text) console.warn("Local Bud model returned no text: " + result.slice(0, 200));
          resolve(parsed.text ? parsed : null);
        } catch (error) {
          console.warn("Local Bud model returned unparseable response: " + result.slice(0, 200));
          resolve(null);
        }
      });
    });
    request.on("timeout", function () {
      console.warn("Local Bud model timed out after 12s");
      request.destroy();
    });
    request.on("error", function (error) {
      console.warn("Local Bud model unreachable: " + error.message);
      resolve(null);
    });
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
    : cleanUrl === "/facilitator"
      ? "facilitator.html"
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
      "Content-Type": contentType(filePath)
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
    "Content-Type": "application/json; charset=utf-8"
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
  // Exported so the room report can be tested against a stubbed set of chapters,
  // without having to speak 500 words at a live server first.
  facilitatorState
};
