const fs = require("fs");
const http = require("http");
const path = require("path");
const { createBudRuntime } = require("./runtime");
const { createSourcePackStore } = require("./source-pack");
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
  const summaryLastSentAt = {};
  const mediaState = {};
  const sourcePackStore = createSourcePackStore();

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
          if (nativeLanguage && transcript.language !== nativeLanguage) {
            recordTranscriptionDiagnostic(diagnostics, participantId, {
              stt: sttCompletedAt - requestStartedAt,
              translation: 0,
              total: Date.now() - requestStartedAt
            }, false);
            return sendJson(res, {
              transcript: Object.assign({}, transcript, {
                text: "",
                ignored: true,
                ignored_reason: "Detected language does not match the selected native language."
              }),
              native_language: nativeLanguage,
              translation: null,
              speech_sequence: speechSequence,
              events: [],
              result: null,
              state: learnerState(runtime, participantId)
            });
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
      return sendJson(res, learnerState(runtime, stateUrl.searchParams.get("participant_id") || config.participant_id));
    }

    if (req.method === "GET" && req.url === "/api/facilitator/state") {
      return sendJson(res, facilitatorState(runtime));
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
          state: facilitatorState(runtime)
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
          sourceContext: sourcePackStore.context(body.room_name || "bud-demo-room", String(body.text || ""))
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
          sourceContext: sourcePackStore.context(body.room_name || "bud-demo-room", currentPrompt(snapshot))
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
          sourceContext: sourcePackStore.context(body.room_name || "bud-demo-room", text)
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
        const result = runtime.handleEvent(baseEvent({
          event_id: "ui-comprehension-" + Date.now(),
          type: "comprehension_check_response",
          source: "web",
          privacy_scope: "private_participant_ai",
          actor: { actor_type: "participant", participant_id: participantId },
          payload: {
            checkin_id: "ui-recap-001",
            recap_point_id: "ui-facilitator-prompt-001",
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
      translation: Boolean(process.env.TRANSLATION_HOST || process.env.TRANSLATION_PORT),
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

function facilitatorState(runtime) {
  const state = runtime.getStateSnapshot();
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
  const request = http.request({
    hostname: process.env.STT_HOST || "127.0.0.1",
    port: Number(process.env.STT_PORT || 8787),
    path: "/transcribe",
    method: "POST",
    headers: {
      "Content-Type": headers["content-type"] || "audio/webm",
      "Content-Length": audio.length
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
  const sourceText = input.sourceContext && input.sourceContext.text
    ? "\n\nActive Workshop Source Pack (version " + input.sourceContext.version + "):\n" + input.sourceContext.text
    : "\n\nActive Workshop Source Pack: none is currently active.";
  const body = Buffer.from(JSON.stringify({
    system: "You are Bud, a friendly and concise workshop learning companion. Use only the supplied workshop prompt, active Workshop Source Pack, and permitted question. Do not invent workshop facts. If the supplied material is insufficient, say so and ask one clarifying question. When using source material, mention its filename and slide/page/section when practical. Answer in no more than three short sentences.",
    user: "Current workshop prompt:\n" + (input.workshopPrompt || "No prompt available") + sourceText + "\n\nLearner question:\n" + input.question,
    max_tokens: 180
  }));
  return new Promise(function (resolve) {
    const request = http.request({
      hostname: process.env.LLM_HOST || "127.0.0.1",
      port: Number(process.env.LLM_PORT || 8790),
      path: "/chat",
      method: "POST",
      timeout: 12000,
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
  startServer
};
