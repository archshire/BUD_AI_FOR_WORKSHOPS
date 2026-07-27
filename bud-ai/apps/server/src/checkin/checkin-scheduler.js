// Decides, per live workshop room, when the learners should get a check-in summary.
//
// The rhythm is driven by how much has actually been spoken, not by a clock:
//
//   1. Every sentence that lands in the transcript log adds its words to a per-room
//      counter.
//   2. Each time that counter passes the word interval (500 by default), the whole
//      stored speech log for the room is sent to the local Qwen model, which answers
//      one question: has the topic moved on or have substantial points been made, so
//      a check-in is warranted?
//   3. If it answers no, nothing is sent and nothing is marked as summarised. The
//      counter resets, so the next 500 words trigger the next judgement — and that
//      judgement still covers everything not yet summarised, including the speech it
//      previously passed over.
//   4. If it answers yes, only the turns not covered by an earlier check-in are sent
//      back to the model to be summarised, the summary is delivered to the learners
//      in their own languages, and the covered range is marked as summarised.
//
// The model calls are injected (judge / summarise / deliver) so this logic is
// testable without a running model.

const DEFAULT_WORD_INTERVAL = 500;

function createCheckinScheduler(options) {
  const settings = Object.assign({
    wordInterval: DEFAULT_WORD_INTERVAL,
    // Most turns worth handing the model in one go. The local model has a small
    // context window, so both the judge and the summariser work from a trimmed tail.
    maxJudgeEntries: 60,
    maxSummaryEntries: 60,
    onError: function (error) { console.warn("Check-in scheduler failed: " + error.message); }
  }, options || {});

  const transcriptLog = settings.transcriptLog;
  const rooms = {};

  function roomState(roomName) {
    const key = String(roomName || "bud-demo-room");
    return rooms[key] || (rooms[key] = {
      room_name: key,
      // Words spoken since the last time the model was asked to judge.
      wordsSinceJudge: 0,
      // Highest transcript sequence already covered by a delivered check-in. Speech
      // the model judged "no check-in needed" is deliberately left uncovered so the
      // next accepted summary still includes it.
      lastSummarisedSequence: 0,
      judgements: 0,
      checkins: 0,
      running: false,
      lastReason: null,
      lastCheckinAt: null,
      // Every delivered check-in becomes a chapter: a named stretch of the session
      // with a summary of what was said in it. Comprehension responses are stamped
      // with the chapter that was live when the learner answered, so "which part of
      // the session was hard?" has a real answer instead of one fixed label.
      chapters: []
    });
  }

  // The chapter a comprehension response should be attached to right now: the most
  // recently delivered check-in, because that is the summary the learner is looking
  // at when they answer. Before the first check-in there is nothing specific to point
  // at, so responses collect against an opening chapter.
  function currentChapter(roomName) {
    const room = roomState(roomName);
    if (room.chapters.length) return room.chapters[room.chapters.length - 1];
    return {
      chapter_id: "chapter-" + room.room_name + "-opening",
      room_name: room.room_name,
      index: 0,
      label: "Before the first check-in",
      summary_text: null,
      covers_from_sequence: 0,
      covers_to_sequence: null,
      delivered_at: null
    };
  }

  function chapters(roomName) {
    return roomState(roomName).chapters.slice();
  }

  function openChapter(room, summaryText, entries) {
    const index = room.chapters.length + 1;
    const chapter = {
      chapter_id: "chapter-" + room.room_name + "-" + index,
      room_name: room.room_name,
      index: index,
      label: "Check-in " + index,
      summary_text: summaryText,
      covers_from_sequence: entries.length ? entries[0].sequence : room.lastSummarisedSequence,
      covers_to_sequence: entries.length ? entries[entries.length - 1].sequence : room.lastSummarisedSequence,
      delivered_at: new Date().toISOString()
    };
    room.chapters.push(chapter);
    return chapter;
  }

  // Called for every sentence written to the transcript log. Returns the promise for
  // the evaluation when this sentence tipped the counter over the interval, so tests
  // and callers can await it; the live server does not.
  function noteSpeech(entry) {
    if (!entry || !entry.original_text) return null;
    const room = roomState(entry.room_name);
    room.wordsSinceJudge += countWords(entry.original_text);
    if (room.wordsSinceJudge < settings.wordInterval) return null;
    if (room.running) return null;
    return evaluateRoom(room.room_name);
  }

  // Asks the model whether a check-in is warranted, and sends one if it says yes.
  async function evaluateRoom(roomName) {
    const room = roomState(roomName);
    if (room.running) return { skipped: "already_running" };
    room.running = true;
    // Reset before the model call: speech that arrives while the model is thinking
    // counts towards the next judgement rather than being lost or double counted.
    const wordsConsidered = room.wordsSinceJudge;
    room.wordsSinceJudge = 0;

    try {
      const pending = transcriptLog.since(room.room_name, room.lastSummarisedSequence, settings.maxSummaryEntries);
      if (!pending.length) {
        room.lastReason = "nothing_new";
        return { checked: false, reason: "nothing_new" };
      }

      room.judgements += 1;
      const verdict = await settings.judge({
        roomName: room.room_name,
        // The whole stored speech log, so the model can see the topic it is being
        // asked to compare against, not only the newest turns.
        fullEntries: transcriptLog.recent(room.room_name, settings.maxJudgeEntries),
        newEntries: pending,
        wordsConsidered: wordsConsidered
      });

      if (!verdict || !verdict.needed) {
        room.lastReason = (verdict && verdict.reason) || "model_says_no_checkin_needed";
        return { checked: true, needed: false, reason: room.lastReason, words_considered: wordsConsidered };
      }

      const summaryText = await settings.summarise({
        roomName: room.room_name,
        // Only the turns no earlier check-in has covered.
        newEntries: pending,
        reason: verdict.reason
      });
      if (!summaryText) {
        // The summariser failed. Leave the range uncovered so the next accepted
        // judgement tries again on the same material.
        room.lastReason = "summariser_unavailable";
        return { checked: true, needed: true, delivered: false, reason: "summariser_unavailable" };
      }

      // The chapter is opened before delivery so the check-in message can carry its
      // id, and rolled back if delivery fails — otherwise the room would collect a
      // chapter no learner ever saw.
      const chapter = openChapter(room, summaryText, pending);
      let delivery;
      try {
        delivery = await settings.deliver({
          roomName: room.room_name,
          summaryText: summaryText,
          entries: pending,
          reason: verdict.reason,
          chapter: chapter
        });
      } catch (deliveryError) {
        room.chapters.pop();
        throw deliveryError;
      }

      room.lastSummarisedSequence = pending[pending.length - 1].sequence;
      room.checkins += 1;
      room.lastReason = verdict.reason || "checkin_sent";
      room.lastCheckinAt = new Date().toISOString();
      return {
        checked: true,
        needed: true,
        delivered: true,
        reason: room.lastReason,
        summary_text: summaryText,
        covered_through: room.lastSummarisedSequence,
        chapter: chapter,
        recipients: (delivery && delivery.recipients) || 0,
        words_considered: wordsConsidered
      };
    } catch (error) {
      settings.onError(error);
      return { checked: false, error: error.message };
    } finally {
      room.running = false;
    }
  }

  function stats() {
    return Object.keys(rooms).map(function (key) {
      const room = rooms[key];
      return {
        room_name: room.room_name,
        words_since_judgement: room.wordsSinceJudge,
        word_interval: settings.wordInterval,
        judgements: room.judgements,
        checkins_sent: room.checkins,
        covered_through: room.lastSummarisedSequence,
        last_reason: room.lastReason,
        last_checkin_at: room.lastCheckinAt,
        current_chapter: currentChapter(room.room_name)
      };
    });
  }

  return { noteSpeech, evaluateRoom, stats, currentChapter, chapters, wordInterval: settings.wordInterval };
}

// Turns transcript entries into the plain speech block handed to the model. The
// translation is included only when it differs, so a monolingual room is not padded
// with duplicate lines.
function formatEntries(entries) {
  return (entries || []).map(function (entry) {
    const speaker = (entry.display_name || entry.participant_id || "speaker") +
      (entry.role === "facilitator" ? " (facilitator)" : "");
    const translated = entry.translated_text && entry.translated_text !== entry.original_text
      ? " [" + (entry.target_language || "translated") + ": " + entry.translated_text + "]"
      : "";
    return speaker + ": " + String(entry.original_text).trim() + translated;
  }).join("\n");
}

function countWords(text) {
  const trimmed = String(text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// The judge is asked for one word. Anything that is not a clear yes is treated as no,
// so an unreachable or rambling model fails towards silence rather than towards
// interrupting every learner in the room.
function parseVerdict(text) {
  const answer = String(text || "").trim();
  if (!answer) return { needed: false, reason: "no_model_answer" };
  const firstLine = answer.split("\n")[0].toLowerCase();
  const needed = /\byes\b/.test(firstLine) && !/\bno\b/.test(firstLine.split("yes")[0]);
  const rest = answer.split("\n").slice(1).join(" ").trim() ||
    firstLine.replace(/^[^a-z]*(yes|no)[^a-z]*/, "").trim();
  return { needed: needed, reason: rest || (needed ? "topic_wrapped_or_substantial" : "no_checkin_needed") };
}

module.exports = { createCheckinScheduler, formatEntries, parseVerdict, countWords, DEFAULT_WORD_INTERVAL };
