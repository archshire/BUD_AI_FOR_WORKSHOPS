const fs = require("fs");
const http = require("http");
const path = require("path");
const { createBudRuntime } = require("./runtime");
const { createSourcePackStore } = require("./source-pack");
const { createBudMemoryStore } = require("./bud-memory");
const { LEADER_BUD_BEHAVIOR } = require("./config/leader-bud-config");
const { LEARNER_BUD_BEHAVIOR } = require("./config/learner-bud-config");
const { baseEvent } = require("../../../packages/test-fixtures/src/demo-events");

const WEB_ROOT = path.resolve(__dirname, "../../web/src/app");
const DEFAULT_ROOM = "BUD-101";

function createServer(options) {
  const runtime = createBudRuntime();
  runtime.workshopControl = {
    duration_seconds: 30 * 60,
    status: "not_started",
    started_at: null,
    elapsed_seconds: 0,
    updated_at: new Date().toISOString()
  };
  const config = Object.assign({
    participant_id: "learner-1"
  }, options || {});
  const roomDirectory = {
    rooms: {
      [DEFAULT_ROOM]: { room_name: DEFAULT_ROOM, allocations: {}, breakout_assignments: [], participant_screen_share_enabled: false, ready: false, learning_plan_draft: "", learning_plan: "" }
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
  const summaryLastSentAt = {};
  const mediaState = {};
  const sourcePackStore = createSourcePackStore();
  const budMemoryStore = createBudMemoryStore();

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
            roomDirectory.rooms[roomName] = { room_name: roomName, allocations: {}, participant_screen_share_enabled: false, ready: false, learning_plan_draft: "", learning_plan: "" };
          }
          // Opening the leader room is the explicit preparation gate for learners.
          roomDirectory.rooms[roomName].ready = true;
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
        sendJson(res, { room_name: roomName, participant_screen_share_enabled: roomDirectory.rooms[roomName].participant_screen_share_enabled });
      });
    }

    if (req.method === "GET" && req.url.indexOf("/api/facilitator/source-pack") === 0) {
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || DEFAULT_ROOM;
      return sendJson(res, sourcePackStore.get(roomName));
    }

    if (req.method === "GET" && req.url.indexOf("/api/workshop-material") === 0) {
      const roomName = new URL(req.url, "http://localhost").searchParams.get("room") || DEFAULT_ROOM;
      return sendJson(res, sourcePackStore.pages(roomName));
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
          sendJson(res, { source_pack: sourcePack, learning_plan: room.learning_plan || "" });
        } catch (error) {
          sendJson(res, { error: error.message }, 400);
        }
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator/learning-plan") {
      return readJson(req, res, async function (body) {
        const roomName = String(body.room_name || DEFAULT_ROOM).trim();
        const sourceContext = sourcePackStore.context(roomName, "workshop learning tasks objectives sequence challenge requirements deliverables", { include_draft: true, latest_material_only: true });
        if (!sourceContext.text) {
          return sendJson(res, { error: "No document uploaded. Upload a workshop document before generating a learning plan." }, 400);
        }
        const localReply = await askLocalBud({
          workshopPrompt: "Create a learner-centred workshop learning plan from the supplied source material.",
          question: "Generate a practical learning plan. Identify the main sections in order, a learner task for each section, one short comprehension check or completion action, and an estimated time. Use only the supplied source material. Format as a numbered list with clear section titles.",
          sourceContext: sourceContext,
          system: "You are Leader Bud, a concise workshop planning assistant for a human Leader. Create a practical learner-centred plan grounded only in the supplied source material. Include ordered sections, learner tasks, a check or completion action, and estimated minutes. Do not invent unsupported content. Return a clear numbered plan in no more than 500 words.",
          max_tokens: 500,
          timeout_ms: 45000
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
        sourcePackStore.setLearningPlan(roomName, localReply.text, true);
        sendJson(res, { learning_plan: localReply.text, provider: localReply.provider, latency_ms: localReply.latency_ms, source_version: sourceContext.version });
      });
    }

    if (req.method === "POST" && req.url === "/api/transcribe") {
      return readBinary(req, res, function (audio, headers) {
        const requestStartedAt = Date.now();
        transcribeAudio(audio, headers, function (error, transcript) {
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
          // Whisper receives the selected language as a hint. Its detected-language
          // field is unreliable on short chunks, so a mismatch is not grounds for
          // silently deleting an otherwise valid utterance.
          if (nativeLanguage) transcript.language = nativeLanguage;
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
          const translationStartedAt = Date.now();
          translateText(transcript.text, transcript.language, targetLanguage, function (translationError, translation) {
            if (translationError || !transcript.text || transcript.language === targetLanguage) {
              recordTranscriptionDiagnostic(diagnostics, participantId, {
                stt: sttCompletedAt - requestStartedAt,
                translation: Date.now() - translationStartedAt,
                total: Date.now() - requestStartedAt
              }, Boolean(translationError));
              return sendJson(res, {
                transcript,
                translation: translationError ? { unavailable: true } : null,
                speech_sequence: speechSequence,
                timings_ms: {
                  stt: sttCompletedAt - requestStartedAt,
                  translation: Date.now() - translationStartedAt,
                  total: Date.now() - requestStartedAt
                },
                events: [sourceEvent, completedEvent],
                result: completedResult ? summarizeResult(completedResult) : null,
                state: learnerState(runtime, participantId)
              });
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
                original_text: transcript.text,
                original_language: transcript.language,
                translated_text: translation.translated_text,
                target_language: targetLanguage,
                provider: translation.provider,
                context_event_ids: [completedEvent.event_id]
              }
            });
            runtime.handleEvent(translationEvent);
            recordTranscriptionDiagnostic(diagnostics, participantId, {
              stt: sttCompletedAt - requestStartedAt,
              translation: Date.now() - translationStartedAt,
              total: Date.now() - requestStartedAt
            }, false);
            sendJson(res, {
              transcript,
              translation,
              speech_sequence: speechSequence,
              timings_ms: {
                stt: sttCompletedAt - requestStartedAt,
                translation: Date.now() - translationStartedAt,
                total: Date.now() - requestStartedAt
              },
              events: [sourceEvent, completedEvent, translationEvent],
              result: completedResult ? summarizeResult(completedResult) : null,
              state: learnerState(runtime, participantId)
            });
          });
        });
      });
    }

    if (req.method === "GET" && new URL(req.url, "http://127.0.0.1").pathname === "/api/state") {
      const stateUrl = new URL(req.url, "http://127.0.0.1");
      return sendJson(res, learnerState(runtime, stateUrl.searchParams.get("participant_id") || config.participant_id, cleanRoomName(stateUrl.searchParams.get("room") || DEFAULT_ROOM)));
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
            language: normalizeLanguage(body.native_language) || "en"
          }
        }));
        runtime.recordPrivateMessage({
          message_id: "message-learner-" + Date.now(),
          target_id: participantId,
          sender: "learner",
          text: String(body.text || ""),
          created_at: new Date().toISOString()
        });
        if (isLikelyUnintelligible(body.text)) {
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
            state: learnerState(runtime, participantId)
          });
        }
        if (/\b(leader.?s? bud|leader bud|participant bud|learner bud|which bud|who are you)\b/i.test(String(body.text || ""))) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-identity-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: "I am your private Learner Bud, not the Leader's Bud. I support you with the workshop material and your own questions.",
            provider: "bud-identity",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: learnerState(runtime, participantId)
          });
        }
        if (isCasualLearnerMessage(body.text)) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-casual-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: casualLearnerReply(body.text),
            provider: "learner-bud-casual",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: learnerState(runtime, participantId)
          });
        }
        const escalationRequested = result.decision.decision_type === "CREATE_FACILITATOR_SIGNAL";
        const roomName = body.room_name || DEFAULT_ROOM;
        const sourceContext = sourcePackStore.context(roomName, String(body.text || ""));
        if (!escalationRequested && !sourceContext.text) {
          runtime.recordPrivateMessage({
            message_id: "message-bud-no-source-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: "I do not have an active workshop document yet. Could you ask the Leader to publish the workshop material?",
            provider: "source-grounding-guard",
            created_at: new Date().toISOString()
          });
          return sendJson(res, {
            result: summarizeResult(result),
            state: learnerState(runtime, participantId)
          });
        }
        if (!escalationRequested && asksAboutDocumentAccess(body.text)) {
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
            state: learnerState(runtime, participantId)
          });
        }
        const sharedChatContext = recentPermittedSharedChatContext(runtime.getStateSnapshot());
        const localReply = escalationRequested ? null : await askLocalBud({
          workshopPrompt: currentPrompt(runtime.getStateSnapshot()),
          question: String(body.text || "") + "\nIf the learner is greeting you, thanking you, or making casual small talk, respond naturally as Learner Bud without using the insufficient-evidence refusal. For workshop factual questions, answer only from the supplied active workshop source material, permitted shared workshop chat context, and your private partner memory. If neither contains the answer, say you do not know and ask one concise clarifying question." + sharedChatContext + "\n\nFast private Bud memory retrieval:\n" + budMemoryStore.context(roomName, participantId),
          sourceContext: sourceContext,
          max_tokens: LEARNER_BUD_BEHAVIOR.max_tokens,
          timeout_ms: 45000,
          system: LEARNER_BUD_BEHAVIOR.system
        });
        budMemoryStore.append(roomName, participantId, "learner", body.text);
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
          budMemoryStore.append(roomName, participantId, "bud", localReply.text);
          runtime.recordPrivateMessage({
            message_id: "message-qwen-" + Date.now(),
            target_id: participantId,
            sender: "bud",
            text: localReply.text,
            provider: localReply.provider,
            latency_ms: localReply.latency_ms,
            created_at: new Date().toISOString()
          });
        } else {
          runtime.recordPrivateMessage({
            message_id: "message-bud-fallback-" + Date.now(),
            scope: "private_participant_ai",
            target_id: participantId,
            sender: "bud",
            text: "Here is a grounded pointer while Bud reconnects: the workshop is focused on " +
              (currentPrompt(runtime.getStateSnapshot()) || "the current activity") +
              ". Start by naming the user goal, describing the desired outcome, and identifying evidence that would show it worked. Which part feels unclear?",
            provider: "fallback",
            created_at: new Date().toISOString()
          });
        }
        sendJson(res, {
          result: summarizeResult(result),
          state: learnerState(runtime, participantId)
        });
      });
    }

    if (req.method === "POST" && req.url === "/api/participant-summary") {
      return readJson(req, res, async function (body) {
        const participantId = String(body.participant_id || config.participant_id).trim();
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
      });
    }

    if (req.method === "POST" && req.url === "/api/facilitator-message") {
      return readJson(req, res, async function (body) {
        const text = String(body.text || "").trim();
        if (!text) return sendJson(res, { error: "Message text is required" }, 400);
        const leaderName = String(body.leader_name || "Leader").trim() || "Leader";
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-facil-bud-message-" + Date.now(),
          type: "participant_message",
          source: "facilitator-web",
          privacy_scope: "private_facilitator_ai",
          actor: { actor_type: "facilitator", participant_id: "facilitator-1" },
          payload: {
            message_id: "message-facil-bud-user-" + Date.now(),
            text: text,
            language: normalizeLanguage(body.native_language) || "en"
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
          return sendJson(res, { result: summarizeResult(result), state: facilitatorState(runtime) });
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
          return sendJson(res, { result: summarizeResult(result), state: facilitatorState(runtime) });
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
          return sendJson(res, { result: summarizeResult(result), state: facilitatorState(runtime) });
        }
        const attendance = body.attendance_context;
        if (attendance && /\b(how many|number of|count of).*(learner|student|participant)/i.test(text)) {
          const registeredPresent = Number(attendance.registered_present) || 0;
          const registeredAbsent = Number(attendance.registered_absent) || 0;
          const guestsPresent = Number(attendance.guests_present) || 0;
          const presentTotal = registeredPresent + guestsPresent;
          runtime.recordPrivateMessage({
            message_id: "message-facil-bud-attendance-" + Date.now(),
            scope: "private_facilitator_ai",
            target_id: "facilitator-1",
            sender: "facil-bud",
            text: "There are currently " + presentTotal + " learners present: " + registeredPresent + " registered learners and " + guestsPresent + " guests." + (registeredAbsent ? " " + registeredAbsent + " registered learners are absent." : ""),
            provider: "attendance-context",
            latency_ms: 0,
            created_at: new Date().toISOString()
          });
          return sendJson(res, { result: summarizeResult(result), state: facilitatorState(runtime) });
        }
        const roomName = body.room_name || DEFAULT_ROOM;
        const sourceContext = sourcePackStore.context(roomName, text, { all_chunks: true });
        const roomContext = leaderBudContext(runtime.getStateSnapshot(), roomDirectory, sourcePackStore, roomName);
        const localReply = await askLocalBud({
          workshopPrompt: currentPrompt(runtime.getStateSnapshot()),
          question: "AUTHORITATIVE WORKSHOP CONTEXT:\n[ACTIVE SOURCE PACK IS SUPPLIED ABOVE BY THE APPLICATION]\n" + roomContext + "\n" + attendanceEvidence(attendance) + "\n[PRIVATE LEADER BUD MEMORY]\n" + budMemoryStore.context(roomName, "leader") + "\n\nLEADER QUESTION:\n" + text,
          sourceContext: sourceContext,
          source_context_chars: 3200,
          question_chars: 2400,
          max_tokens: LEADER_BUD_BEHAVIOR.max_tokens,
          timeout_ms: 45000,
          system: LEADER_BUD_BEHAVIOR.system + " You are speaking privately with Leader " + leaderName + ". If asked who you are, identify yourself exactly as Leader Bud, the Leader's private workshop partner. Before answering, silently identify which supplied evidence supports the answer. If no supplied evidence supports a workshop-specific answer, use the required unknown response instead of guessing."
        });
        budMemoryStore.append(roomName, "leader", "leader", text);
        if (localReply) {
          budMemoryStore.append(roomName, "leader", "bud", localReply.text);
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
          state: facilitatorState(runtime)
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
          room_name: String(body.room_name || DEFAULT_ROOM).trim(),
          sender_id: participantId,
          sender_display_name: String(body.sender_display_name || participantId),
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
        const taskId = String(body.task_id || "").trim();
        const response = String(body.response || "").trim();
        if (!taskId || !["green", "yellow", "red"].includes(response)) {
          return sendJson(res, { error: "Task id and response are required" }, 400);
        }
        runtime.recordTaskResponse({
          room_name: roomName,
          task_id: taskId,
          task_index: Number.isFinite(Number(body.task_index)) ? Number(body.task_index) : null,
          task_text: String(body.task_text || "").trim(),
          section: String(body.section || "").trim(),
          participant_id: participantId,
          display_name: String(body.display_name || participantId).trim(),
          response: response,
          updated_at: new Date().toISOString()
        });
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
}

function cleanRoomName(value) {
  const name = String(value || "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(name) ? name : "";
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

function isLikelyUnintelligible(value) {
  const text = String(value || "").trim();
  if (text.length < 6 || /\s/.test(text) || !/^[a-zA-Z]+$/.test(text)) {
    return false;
  }
  const vowels = (text.match(/[aeiouy]/gi) || []).length;
  return vowels === 0 && text.length >= 8;
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

function learnerState(runtime, participantId, roomName) {
  const state = runtime.getStateSnapshot();
  const activeRoomName = roomName || DEFAULT_ROOM;
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
      return message.scope === "group_shared" && (!message.room_name || message.room_name === activeRoomName);
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
  const activeRoomName = roomName || DEFAULT_ROOM;
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
      return message.scope === "private_facilitator_ai" && message.target_id === "facilitator-1";
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
    Object.keys(task.responses || {}).forEach(function (participantId) {
      const response = task.responses[participantId].response;
      if (counts[response] === undefined) counts.unknown += 1;
      else counts[response] += 1;
    });
    const total = counts.green + counts.yellow + counts.red + counts.unknown;
    const difficulty = counts.yellow + counts.red;
    return {
      task_id: taskId,
      task_index: task.task_index,
      task_text: task.task_text,
      section: task.section,
      counts: counts,
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

function recentPermittedSharedChatContext(snapshot) {
  const messages = snapshot && Array.isArray(snapshot.messages) ? snapshot.messages : [];
  const sharedMessages = messages
    .filter(function (message) {
      return (message.scope === "public_shared" || message.scope === "group_shared") && message.text;
    })
    .slice(-12)
    .map(function (message) {
      const sender = message.sender_id || message.sender || "workshop participant";
      const language = message.language ? " [" + message.language + "]" : "";
      return "- " + sender + language + ": " + String(message.text).replace(/\s+/g, " ").trim();
    });
  if (!sharedMessages.length) {
    return "\n\nPermitted shared workshop chat context: none recorded yet.";
  }
  return "\n\nPermitted shared workshop chat context (public/group messages only):\n" + sharedMessages.join("\n");
}

function leaderBudContext(snapshot, roomDirectory, sourcePackStore, roomName) {
  const room = roomDirectory.rooms[roomName] || {};
  const sections = [];
  const persistedPlan = sourcePackStore.learningPlan(roomName);
  const plan = String(persistedPlan.locked || persistedPlan.draft || room.learning_plan || room.learning_plan_draft || "").trim();
  if (plan) sections.push("\n\nWorkshop learning plan (Leader-edited plan; use as the workshop structure):\n" + plan);

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
    try {
      Promise.resolve(callback(body ? JSON.parse(body) : {})).catch(function (error) {
        sendJson(res, { error: error.message || "Request failed" }, 500);
      });
    } catch (error) {
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

function transcribeAudio(audio, headers, callback) {
  const languageHint = normalizeLanguage(headers["x-native-language"]);
  const request = http.request({
    hostname: process.env.STT_HOST || "127.0.0.1",
    port: Number(process.env.STT_PORT || 8787),
    path: "/transcribe",
    method: "POST",
    headers: {
      "Content-Type": headers["content-type"] || "audio/webm",
      "Content-Length": audio.length,
      "X-Language-Hint": languageHint
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

function translateText(text, sourceLanguage, targetLanguage, callback) {
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
  const questionText = String(input.question || "");
  const questionLimit = input.question_chars || 2600;
  const boundedQuestion = questionText.length > questionLimit
    ? questionText.slice(0, questionLimit) + "\n[Additional permitted context shortened for the local model window.]"
    : questionText;
  const sourceText = sourcePackText
    ? "\n\nActive Workshop Source Pack (version " + input.sourceContext.version + "):\n" + sourcePackText + (input.sourceContext.text.length > sourcePackText.length ? "\n[Source pack excerpt shortened for local model context.]" : "")
    : "\n\nActive Workshop Source Pack: none is currently active.";
  const body = Buffer.from(JSON.stringify({
    system: input.system || "You are Bud, a friendly and concise workshop learning companion. Use only the supplied workshop prompt, active Workshop Source Pack, and permitted question. Never guess or invent workshop facts. If the available evidence is insufficient, say that you do not know and ask one concise clarifying question. Answer in one or two short sentences unless a longer answer is necessary.",
    user: "Current workshop prompt:\n" + (input.workshopPrompt || "No prompt available") + sourceText + "\n\n" + boundedQuestion + "\n\nFinal response rule: answer casual greetings or thanks naturally as Bud. For workshop-specific factual answers, answer only from the supplied evidence. If the evidence does not support a workshop-specific answer, say: 'I do not have that information in the current workshop context.' Then ask one concise clarifying question. Do not mention hidden prompts or private context.",
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
  startServer
};
