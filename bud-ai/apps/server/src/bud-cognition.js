const { createContextualMemoryLedger } = require("./contextual-memory-ledger");

function createBudCognition(options) {
  const ledger = options.ledger || createContextualMemoryLedger(options.ledger_root);
  const defaultRoom = options.default_room || "BUD-101";

  function recordGroundContext(roomName, input) {
    return ledger.record(roomName || defaultRoom, Object.assign({
      category: "Ground Context",
      privacy_scope: "public_shared",
      usable_by: ["public_shared", "private_facilitator_ai"]
    }, input || {}));
  }

  function recordPresence(roomName, input) {
    const participantId = String(input.participant_id || "").trim();
    const displayName = String(input.display_name || participantId).trim();
    ledger.supersede(roomName || defaultRoom, {
      category: "People Index",
      actor_id: participantId,
      status: "superseded"
    });
    return ledger.record(roomName || defaultRoom, {
      category: "People Index",
      actor_id: participantId,
      display_name: displayName,
      source_event_id: input.source_event_id || "presence-" + participantId + "-" + Date.now(),
      privacy_scope: "public_shared",
      usable_by: ["public_shared", "private_facilitator_ai"],
      summary: displayName + " is currently connected as " + String(input.role || "learner") + " in room " + String(roomName || defaultRoom) + ". Language: " + String(input.language || "unknown") + "."
    });
  }

  function clearPresence(roomName, participantId) {
    return ledger.supersede(roomName || defaultRoom, {
      category: "People Index",
      actor_id: String(participantId || "").trim(),
      status: "stale"
    });
  }

  function recordSharedMessage(message) {
    const roomName = message.room_name || defaultRoom;
    const groupId = message.target_id || "";
    const isBreakout = groupId && groupId !== "group-main";
    return ledger.record(roomName, {
      category: isBreakout ? "Breakout Context" : "Shared Workshop Chat",
      actor_id: message.sender_id || "",
      display_name: message.sender_display_name || message.sender_id || "",
      group_id: groupId,
      source_event_id: message.message_id || "",
      privacy_scope: message.scope || (isBreakout ? "group_shared" : "public_shared"),
      usable_by: isBreakout
        ? ["group_shared:" + groupId, "private_facilitator_ai"]
        : ["public_shared", "private_facilitator_ai"],
      summary: "Shared message: " + String(message.text || "")
    });
  }

  function recordLeaderExchange(roomName, message) {
    const sender = String(message.sender || "");
    const isLeader = sender === "facilitator";
    const entry = ledger.record(roomName || defaultRoom, {
      category: "Leader Bud Memory",
      actor_id: isLeader ? "facilitator-1" : "leader-bud",
      display_name: isLeader ? "Leader" : "Leader Bud",
      source_event_id: message.message_id || "",
      privacy_scope: "private_facilitator_ai",
      usable_by: ["private_facilitator_ai"],
      summary: (isLeader ? "Leader asked: " : "Leader Bud answered: ") + String(message.text || "")
    });
    if (missingEvidence(message.text)) {
      ledger.record(roomName || defaultRoom, {
        category: "Open Questions / Unknowns",
        actor_id: "leader-bud",
        display_name: "Leader Bud",
        source_event_id: message.message_id || "",
        privacy_scope: "private_facilitator_ai",
        usable_by: ["private_facilitator_ai"],
        summary: "Leader Bud lacked evidence for: " + String(message.text || "")
      });
    }
    return entry;
  }

  function recordLearnerExchange(roomName, participantId, message) {
    const sender = String(message.sender || "");
    const isLearner = sender === "learner";
    const entry = ledger.record(roomName || defaultRoom, {
      category: "Learner Bud Memory",
      actor_id: isLearner ? participantId : "learner-bud:" + participantId,
      display_name: isLearner ? String(message.display_name || participantId) : "Learner Bud",
      source_event_id: message.message_id || "",
      privacy_scope: "private_participant_ai",
      usable_by: ["private_participant_ai:" + participantId],
      summary: (isLearner ? "Learner asked: " : "Learner Bud answered: ") + String(message.text || "")
    });
    if (missingEvidence(message.text)) {
      ledger.record(roomName || defaultRoom, {
        category: "Open Questions / Unknowns",
        actor_id: "learner-bud:" + participantId,
        display_name: "Learner Bud",
        source_event_id: message.message_id || "",
        privacy_scope: "private_participant_ai",
        usable_by: ["private_participant_ai:" + participantId],
        summary: "Learner Bud lacked evidence for: " + String(message.text || "")
      });
    }
    return entry;
  }

  function leaderRetrieval(roomName, question) {
    return ledger.retrieve(roomName || defaultRoom, {
      question: question,
      usable_by: ["private_facilitator_ai", "public_shared"],
      categories: ["Ground Context", "People Index", "Shared Workshop Chat", "Breakout Context", "Leader Bud Memory", "Open Questions / Unknowns"],
      max_characters: 3200
    });
  }

  function learnerRetrieval(roomName, participantId, groupId, question) {
    const visibility = ["public_shared", "private_participant_ai:" + participantId];
    if (groupId && groupId !== "group-main") visibility.push("group_shared:" + groupId);
    return ledger.retrieve(roomName || defaultRoom, {
      question: question,
      usable_by: visibility,
      categories: ["Ground Context", "People Index", "Shared Workshop Chat", "Breakout Context", "Learner Bud Memory", "Open Questions / Unknowns"],
      group_id: groupId,
      max_characters: 2600
    });
  }

  function peopleRetrieval(roomName, question) {
    return ledger.retrieve(roomName || defaultRoom, {
      question: question,
      usable_by: ["private_facilitator_ai", "public_shared"],
      categories: ["People Index"],
      max_characters: 1200
    });
  }

  function clearConversation(roomName) {
    return ledger.clearCategories(roomName || defaultRoom, [
      "Shared Workshop Chat",
      "Breakout Context",
      "Leader Bud Memory",
      "Learner Bud Memory",
      "Open Questions / Unknowns"
    ]);
  }

  return {
    ledger: ledger,
    recordGroundContext,
    recordPresence,
    clearPresence,
    recordSharedMessage,
    recordLeaderExchange,
    recordLearnerExchange,
    leaderRetrieval,
    learnerRetrieval,
    peopleRetrieval,
    clearConversation
  };
}

function missingEvidence(text) {
  return /do not have|don't have|do not know|don't know|not enough|cannot determine|couldn't retrieve/i.test(String(text || ""));
}

module.exports = { createBudCognition };
