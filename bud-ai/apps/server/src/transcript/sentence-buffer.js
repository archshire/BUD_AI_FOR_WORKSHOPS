// Speech is cut into audio chunks on pauses, which land mid-sentence far more often
// than not — people pause to think, not at full stops. Translating those chunks
// directly hands the translator half a sentence, and NLLB in particular has no memory
// between calls, so it can only guess at structure that has not arrived yet.
//
// This buffers each speaker's transcript fragments and releases them for translation
// only once they form a complete sentence, so the translator always sees a whole
// thought. Transcription itself is untouched and stays per chunk, which keeps the
// original text streaming to the UI at the same speed as before.
//
// Two things make the timing subtle, and both used to cost seconds of caption latency:
//
// 1. Fragments arrive here only after speech-to-text has run, which on the local CPU
//    model takes seconds. Measuring the gap between arrivals therefore measured
//    transcription latency rather than how long the speaker was actually silent, so a
//    speaker who paused briefly looked identical to one who had finished. Callers pass
//    the timings the microphone observed instead, and the gap is measured in speech
//    time, which transcription speed cannot distort.
//
// 2. A held fragment used to leave only when the NEXT fragment arrived to push it out.
//    The last thing anyone said therefore stayed invisible until they said something
//    else — or, if they stopped talking, until they switched the microphone off
//    entirely. Releases are now driven by a timer as well, so silence alone is enough.
//
// The timer needs to know the difference between "silent because they finished" and
// "silent because their words are still inside the transcriber". It cannot tell from
// the fragments alone, so the microphone reports each chunk it hears speech in as soon
// as it starts (markSpeaking), well before that chunk's transcript exists. While a
// reported chunk has no transcript yet, the speaker is still talking and nothing is
// released.

// Terminal punctuation for the languages this prototype handles, including the
// full-width forms used in Chinese and Japanese text.
const SENTENCE_END = /[.!?。！？…]["'”’)\]]*\s*$/;

// How long a speaker has to stay silent before what is held counts as a finished
// thought, even though no full stop arrived. Measured in speech time from the moment
// the microphone stopped hearing them, so it is a real pause in the room rather than a
// gap that transcription happened to introduce.
const IDLE_RELEASE_MS = 1500;

// Absolute ceiling on how long one sentence may accumulate. Only a backstop against
// speech that never pauses and never gets punctuated, so it sits well above the
// length of a normal spoken sentence.
const MAX_PENDING_MS = 20000;

// Same idea by length: past this, waiting hurts more than an imperfect boundary.
const MAX_PENDING_CHARS = 400;

// A chunk the microphone reported should produce a transcript within a few seconds.
// If one never does — the upload failed, the transcriber died — the held sentence must
// not be stranded waiting for it, so it is released after this long regardless.
const SPEAKING_SAFETY_MS = 12000;

function defaultSetTimer(fn, ms) {
  const timer = setTimeout(fn, ms);
  // A pending caption must never be the reason the process refuses to exit.
  if (timer.unref) timer.unref();
  return timer;
}

function defaultClearTimer(timer) {
  clearTimeout(timer);
}

function createSentenceBuffer(options) {
  const settings = Object.assign({
    idleReleaseMs: IDLE_RELEASE_MS,
    maxPendingMs: MAX_PENDING_MS,
    maxPendingChars: MAX_PENDING_CHARS,
    speakingSafetyMs: SPEAKING_SAFETY_MS,
    // Called as (speakerId, text, reason) when a timer rather than an incoming
    // fragment is what released the sentence — nobody is waiting on an HTTP response
    // at that point, so the caller has to be told. Left unset, the buffer schedules
    // nothing and stays purely synchronous, which is what the unit tests rely on.
    onRelease: null,
    setTimer: defaultSetTimer,
    clearTimer: defaultClearTimer
  }, options || {});

  const buffers = {};
  const timers = {};
  // Highest chunk sequence the microphone has reported speech in, against the highest
  // one whose transcript has landed. The former being ahead of the latter is what
  // "this speaker is talking right now" looks like from here.
  const speakingSequence = {};
  const pushedSequence = {};

  // Adds a freshly transcribed fragment and reports whether the accumulated text is
  // ready to translate. Returns { ready, pending, reason }: `ready` is the text to
  // translate (null while still accumulating) and `pending` is what is still held,
  // which doubles as the continuity prompt for the next chunk's transcription.
  //
  // `meta` carries what the microphone saw: { speechStartedAt, speechEndedAt, sequence }.
  // Omit it and both timings fall back to now, which is the old arrival-time behaviour.
  function push(speakerId, text, now, meta) {
    const fragment = String(text || "").trim();
    const at = typeof now === "number" ? now : Date.now();
    const info = meta || {};
    const speechStartedAt = typeof info.speechStartedAt === "number" ? info.speechStartedAt : at;
    const speechEndedAt = typeof info.speechEndedAt === "number" ? info.speechEndedAt : at;
    if (typeof info.sequence === "number") {
      pushedSequence[speakerId] = Math.max(pushedSequence[speakerId] || 0, info.sequence);
    }
    // Whatever was scheduled was scheduled without knowing about this fragment.
    cancelTimer(speakerId);

    if (!fragment) {
      // A chunk that transcribed to nothing still tells us that chunk is accounted for,
      // so anything held may now be releasable on its own.
      armIdleTimer(speakerId, at);
      return { ready: null, pending: pendingText(speakerId), reason: "empty" };
    }

    const existing = buffers[speakerId];
    // A long silence before this fragment means what is held was a complete thought
    // that simply never got a full stop. Release it on its own and start this fragment
    // fresh — appending first would merge two separate sentences.
    if (existing && existing.text && speechStartedAt - existing.speechEndedAt >= settings.idleReleaseMs) {
      const stranded = existing.text;
      buffers[speakerId] = { text: fragment, startedAt: at, lastFragmentAt: at, speechEndedAt: speechEndedAt };
      armIdleTimer(speakerId, at);
      return { ready: stranded, pending: fragment, reason: "idle" };
    }

    const buffer = existing || (buffers[speakerId] = { text: "", startedAt: at, lastFragmentAt: at, speechEndedAt: speechEndedAt });
    buffer.text = buffer.text ? buffer.text + " " + fragment : fragment;
    buffer.lastFragmentAt = at;
    buffer.speechEndedAt = speechEndedAt;

    if (SENTENCE_END.test(buffer.text)) {
      return release(speakerId, "sentence");
    }
    if (buffer.text.length >= settings.maxPendingChars) {
      return release(speakerId, "length");
    }
    if (at - buffer.startedAt >= settings.maxPendingMs) {
      return release(speakerId, "timeout");
    }
    armIdleTimer(speakerId, at);
    return { ready: null, pending: buffer.text, reason: "pending" };
  }

  // The microphone has started recording a chunk it can hear speech in. Called as soon
  // as speech is detected, which is seconds before that chunk's transcript exists, so
  // the held sentence is not released into the middle of a sentence still being said.
  function markSpeaking(speakerId, sequence, now) {
    const at = typeof now === "number" ? now : Date.now();
    if (typeof sequence === "number") {
      speakingSequence[speakerId] = Math.max(speakingSequence[speakerId] || 0, sequence);
    }
    armIdleTimer(speakerId, at);
  }

  // Releases whatever is held regardless of punctuation. Called when the speaker
  // stops talking, so the last half-sentence is still translated rather than lost.
  function flush(speakerId) {
    cancelTimer(speakerId);
    if (!buffers[speakerId] || !buffers[speakerId].text) {
      return { ready: null, pending: "", reason: "empty" };
    }
    return release(speakerId, "flush");
  }

  // Schedules the release of whatever is held, if anything, and if the caller asked to
  // be told about timer-driven releases at all.
  function armIdleTimer(speakerId, now) {
    if (!settings.onRelease) return;
    const buffer = buffers[speakerId];
    if (!buffer || !buffer.text) return;
    if ((speakingSequence[speakerId] || 0) > (pushedSequence[speakerId] || 0)) {
      // A chunk is in flight: the sentence is not finished, whatever the clock says.
      return armTimer(speakerId, settings.speakingSafetyMs, "stalled");
    }
    // The wait starts when the speaker fell silent, not when the transcript arrived,
    // so slow transcription does not add to the hold. Usually already elapsed.
    const waited = Math.max(0, now - buffer.speechEndedAt);
    armTimer(speakerId, Math.max(0, settings.idleReleaseMs - waited), "idle");
  }

  function armTimer(speakerId, delayMs, reason) {
    cancelTimer(speakerId);
    timers[speakerId] = settings.setTimer(function () {
      delete timers[speakerId];
      if (!buffers[speakerId] || !buffers[speakerId].text) return;
      const released = release(speakerId, reason);
      settings.onRelease(speakerId, released.ready, reason);
    }, delayMs);
  }

  function cancelTimer(speakerId) {
    if (!timers[speakerId]) return;
    settings.clearTimer(timers[speakerId]);
    delete timers[speakerId];
  }

  function release(speakerId, reason) {
    cancelTimer(speakerId);
    const ready = buffers[speakerId].text;
    delete buffers[speakerId];
    return { ready: ready, pending: "", reason: reason };
  }

  function pendingText(speakerId) {
    return buffers[speakerId] ? buffers[speakerId].text : "";
  }

  // Drops every pending timer. Only needed so a test or a shutting-down server leaves
  // nothing scheduled behind it.
  function stop() {
    Object.keys(timers).forEach(cancelTimer);
  }

  return { push, flush, pending: pendingText, markSpeaking, stop };
}

module.exports = { createSentenceBuffer };
