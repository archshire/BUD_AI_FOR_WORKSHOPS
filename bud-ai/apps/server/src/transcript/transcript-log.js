// Rolling log of what was actually said in a room: the original transcript plus the
// translation that was shown to listeners. Bud reads this so a learner can ask "what
// did the facilitator just say?" and get an answer grounded in real speech rather
// than only in the slide deck and the current prompt.
//
// Only spoken room audio lands here, which is public_shared content. Private learner
// messages to Bud are deliberately never written to this log.

const MAX_ENTRIES_PER_ROOM = 200;
const DEFAULT_RECENT = 8;
// The local model runs with a 2048-token context, so the transcript block has to stay
// small enough to leave room for the prompt, the Source Pack, and the answer.
const DEFAULT_MAX_CHARS = 1400;

function createTranscriptLog(options) {
  const settings = Object.assign({ maxEntriesPerRoom: MAX_ENTRIES_PER_ROOM }, options || {});
  const rooms = {};
  let sequence = 0;

  function record(entry) {
    const originalText = String(entry.original_text || "").trim();
    if (!originalText) return null;
    const roomName = String(entry.room_name || "bud-demo-room").trim() || "bud-demo-room";
    const participantId = String(entry.participant_id || "unknown").trim();
    const position = ++sequence;
    const stored = {
      entry_id: "transcript-" + position,
      // Monotonic across all rooms. Caption clients poll with the last sequence they
      // rendered, so they only ever receive turns they have not shown yet.
      sequence: position,
      room_name: roomName,
      participant_id: participantId,
      display_name: String(entry.display_name || participantId),
      role: entry.role === "facilitator" ? "facilitator" : "learner",
      original_text: originalText,
      original_language: entry.original_language || null,
      translated_text: String(entry.translated_text || "").trim() || null,
      target_language: entry.target_language || null,
      // Filled in lazily, keyed by language code, when a listener asks for this turn
      // in a language it was not already translated into.
      translations: {},
      created_at: entry.created_at || new Date().toISOString()
    };
    const log = rooms[roomName] || (rooms[roomName] = []);
    log.push(stored);
    if (log.length > settings.maxEntriesPerRoom) log.splice(0, log.length - settings.maxEntriesPerRoom);
    return stored;
  }

  function recent(roomName, limit) {
    const log = rooms[String(roomName || "bud-demo-room")] || [];
    return log.slice(-Math.max(1, Number(limit) || DEFAULT_RECENT));
  }

  // Everything spoken in the room after the given sequence number. This is what the
  // live caption panels poll, so every participant sees every speaker's turns rather
  // than only the ones their own microphone produced.
  function since(roomName, afterSequence, limit) {
    const log = rooms[String(roomName || "bud-demo-room")] || [];
    const after = Number(afterSequence) || 0;
    const fresh = log.filter(function (entry) { return entry.sequence > after; });
    const cap = Math.max(1, Number(limit) || 25);
    return fresh.slice(-cap);
  }

  function latestSequence(roomName) {
    const log = rooms[String(roomName || "bud-demo-room")] || [];
    return log.length ? log[log.length - 1].sequence : 0;
  }

  function rooms_() {
    return Object.keys(rooms);
  }

  // Builds the transcript block handed to the model: the last few turns always, plus
  // any older turns whose words overlap the question, so "what did she say about
  // evidence?" can reach back past the most recent minute of chatter.
  function context(roomName, question, options) {
    const settings = Object.assign({ recent: DEFAULT_RECENT, maxChars: DEFAULT_MAX_CHARS, keywordMatches: 4 }, options || {});
    const log = rooms[String(roomName || "bud-demo-room")] || [];
    if (!log.length) return { entries: [], text: "" };

    const recentEntries = log.slice(-settings.recent);
    const terms = tokenize(question);
    const older = log.slice(0, Math.max(0, log.length - settings.recent));
    const matched = terms.length
      ? older
          .map(function (entry) { return { entry: entry, score: score(entry, terms) }; })
          .filter(function (candidate) { return candidate.score > 0; })
          .sort(function (left, right) { return right.score - left.score; })
          .slice(0, settings.keywordMatches)
          .map(function (candidate) { return candidate.entry; })
      : [];

    const selected = matched.concat(recentEntries).sort(function (left, right) {
      return left.created_at < right.created_at ? -1 : left.created_at > right.created_at ? 1 : 0;
    });

    // Trim from the oldest end so the newest turns always survive the character cap.
    const lines = [];
    let used = 0;
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      const line = formatEntry(selected[index]);
      if (used + line.length > settings.maxChars && lines.length) break;
      lines.unshift(line);
      used += line.length;
    }

    return { entries: selected.slice(selected.length - lines.length), text: lines.join("\n") };
  }

  return { record, recent, since, latestSequence, context, rooms: rooms_ };
}

function formatEntry(entry) {
  const speaker = entry.display_name + (entry.role === "facilitator" ? " (facilitator)" : " (learner)");
  const original = "[" + clockTime(entry.created_at) + "] " + speaker +
    (entry.original_language ? " in " + entry.original_language : "") + ': "' + entry.original_text + '"';
  const translated = entry.translated_text && entry.translated_text !== entry.original_text
    ? "\n    translated to " + (entry.target_language || "target") + ': "' + entry.translated_text + '"'
    : "";
  return original + translated;
}

function clockTime(timestamp) {
  const iso = String(timestamp || "");
  const time = iso.split("T")[1];
  return time ? time.slice(0, 5) : "--:--";
}

function tokenize(text) {
  return String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (term) {
    return term.length > 2 && STOP_WORDS.indexOf(term) === -1;
  });
}

const STOP_WORDS = [
  "the", "and", "what", "did", "say", "said", "was", "were", "that", "this", "they",
  "you", "your", "with", "for", "about", "just", "does", "how", "who", "why", "can"
];

function score(entry, terms) {
  const haystack = (entry.original_text + " " + (entry.translated_text || "")).toLowerCase();
  return terms.reduce(function (total, term) {
    return total + (haystack.indexOf(term) === -1 ? 0 : 1);
  }, 0);
}

module.exports = { createTranscriptLog };
