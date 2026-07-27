const PARTICIPANT_ID = getParticipantId();

const elements = {
  title: document.getElementById("workshop-title"),
  budPanelTitle: document.getElementById("bud-panel-title"),
  activityTitle: document.getElementById("activity-title"),
  messageLabel: document.getElementById("message-label"),
  budAvatar: document.getElementById("bud-avatar"),
  phase: document.getElementById("phase"),
  promptText: document.getElementById("prompt-text"),
  messages: document.getElementById("messages"),
  understanding: document.getElementById("understanding"),
  participation: document.getElementById("participation"),
  comprehension: document.getElementById("comprehension"),
  helpButton: document.getElementById("help-button"),
  dismissButton: document.getElementById("dismiss-button"),
  observeButton: document.getElementById("observe-button"),
  connectionStatus: document.getElementById("connection-status"),
  roomInput: document.getElementById("room-input"),
  nameInput: document.getElementById("name-input"),
  nativeLanguageInput: document.getElementById("native-language-input"),
  connectButton: document.getElementById("connect-button"),
  microphoneButton: document.getElementById("microphone-button"),
  micStatusText: document.getElementById("mic-status-text"),
  micMeter: document.getElementById("mic-meter"),
  captionList: document.getElementById("caption-list"),
  mediaStatus: document.getElementById("media-status"),
  mainMedia: document.getElementById("main-media"),
  mediaStrip: document.getElementById("media-strip"),
  participantScreenButton: document.getElementById("participant-screen-button"),
  clearCaptions: document.getElementById("clear-captions"),
  roomFeed: document.getElementById("room-feed"),
  presenceList: document.getElementById("presence-list"),
  sharedMessages: document.getElementById("shared-messages"),
  sharedForm: document.getElementById("shared-message-form"),
  sharedInput: document.getElementById("shared-message-input"),
  form: document.getElementById("message-form"),
  input: document.getElementById("message-input")
};

let latestDismissedMessageId = "";
let livekitRoom = null;
let micAnalyserFrame = null;
let speechRecorder = null;
let speechCaptureStream = null;
let speechCaptureActive = false;
let roomParticipants = {};
let speechChunkSequence = 0;
let latestRenderedSequence = 0;
// Live captions come from the room-wide transcript feed rather than from this
// browser's own transcription responses, so the panel shows every speaker with a name
// against each line instead of only what this microphone picked up.
let captionPollTimer = null;
let latestCaptionSequence = 0;
// The rendered caption for each transcript entry, so a line whose translation arrived
// after the line itself can be replaced rather than drawn a second time.
let captionNodes = {};
const CAPTION_POLL_MS = 1200;

// Utterance segmentation. Chunks are cut where the speaker pauses rather than on a
// fixed timer, so the recorder restart gap always lands in silence instead of
// mid-word, and Whisper receives whole phrases instead of arbitrary slices.
let speechVadContext = null;
let speechVadAnalyser = null;
let speechVadData = null;
let speechVadTimer = null;
let speechVadEnabled = false;
let speechHeardInChunk = false;
// How much of this chunk has been above the speech threshold, in milliseconds. A brief
// transient never accumulates enough of it to count as someone talking.
let speechMsInChunk = 0;
let speechLastHeardAt = 0;
let speechChunkStartedAt = 0;
// When speech actually started and stopped inside this chunk, as opposed to when the
// recorder was switched on and off around it. The server measures the pause between
// utterances from these, so leading and trailing silence must not count as speech.
let speechFirstHeardAt = 0;
// The right values depend on the room, the microphone and how loudly someone speaks,
// so they are tunable at runtime instead of being fixed at build time. The web assets
// are baked into the container image, so a hardcoded number costs a rebuild to try.
// Set one with ?vad-level=0.1 in the address bar, or budVad.set("level", 0.1) in the
// browser console; either persists until budVad.reset().
const VAD_DEFAULTS = {
  // Absolute floor below which nothing is ever treated as speech, whatever the room
  // sounds like. Raise it if background noise is being picked up as speech.
  level: 0.06,
  // How far above the room's own background level speech has to reach. Raise it if
  // the room is noisy and the floor above is not enough on its own.
  margin: 0.035,
  // Silence this long ends an utterance. Raise it if sentences are being cut while
  // the speaker is still thinking.
  pause: 1100,
  // How much speech a chunk needs before it is worth uploading. A door, a cough or a
  // keyboard clears the level thresholds above for a moment, and a chunk holding
  // nothing but that moment is exactly what Whisper answers with invented subtitle
  // text. Raise it if noise is still getting through; lower it if single short words
  // ("yes", "好") are being lost.
  minSpeech: 300
};

function readVadSettings() {
  const stored = JSON.parse(window.localStorage.getItem("bud-vad") || "{}");
  const params = new URLSearchParams(window.location.search);
  const settings = {};
  Object.keys(VAD_DEFAULTS).forEach(function (key) {
    // A value in the URL wins over a stored one, and is written through so it
    // survives the next reload without having to keep the query string around.
    const fromUrl = Number(params.get("vad-" + key));
    if (params.has("vad-" + key) && isFinite(fromUrl)) {
      stored[key] = fromUrl;
    }
    const value = Number(stored[key]);
    settings[key] = isFinite(value) && stored[key] !== undefined ? value : VAD_DEFAULTS[key];
  });
  window.localStorage.setItem("bud-vad", JSON.stringify(stored));
  return settings;
}

let vadSettings = readVadSettings();

// Exposed on window so the values can be tried from the console mid-session. Changing
// one takes effect on the next utterance; no reload needed.
window.budVad = {
  get: function () { return Object.assign({}, vadSettings); },
  set: function (key, value) {
    if (!(key in VAD_DEFAULTS)) throw new Error("Unknown setting. Try one of: " + Object.keys(VAD_DEFAULTS).join(", "));
    const stored = JSON.parse(window.localStorage.getItem("bud-vad") || "{}");
    stored[key] = Number(value);
    window.localStorage.setItem("bud-vad", JSON.stringify(stored));
    vadSettings = readVadSettings();
    return window.budVad.get();
  },
  reset: function () {
    window.localStorage.removeItem("bud-vad");
    vadSettings = readVadSettings();
    return window.budVad.get();
  },
  // Prints the live microphone level next to the current thresholds, so a value can
  // be chosen by watching what the room actually reads rather than by guesswork.
  monitor: function (seconds) {
    const until = Date.now() + (Number(seconds) || 15) * 1000;
    const timer = window.setInterval(function () {
      if (Date.now() > until || !speechCaptureActive) return window.clearInterval(timer);
      console.log(
        "level " + speechCurrentLevel.toFixed(3) +
        " | background " + speechNoiseFloor.toFixed(3) +
        " | needs >= " + Math.max(vadSettings.level, speechNoiseFloor + vadSettings.margin).toFixed(3) +
        " | " + (speechCurrentLevel >= Math.max(vadSettings.level, speechNoiseFloor + vadSettings.margin) ? "SPEECH" : "silence")
      );
    }, 250);
    return "Logging for " + ((Number(seconds) || 15)) + "s — speak, then stay quiet.";
  }
};

// A fixed threshold assumes a quiet room. In a noisy one the background alone clears
// it, so the pause is never detected, no chunk is ever cut on a pause, and every
// utterance runs to the hard length limit and gets cut mid-word instead. Tracking the
// quietest recent level gives a baseline to measure speech against.
let speechNoiseFloor = 0;
// Most recent measured level, kept for budVad.monitor().
let speechCurrentLevel = 0;
// How fast the baseline follows the room. It drops quickly to a new quiet level and
// creeps up slowly, so a long sentence cannot drag the baseline up to its own volume.
const NOISE_FLOOR_FALL = 0.25;
const NOISE_FLOOR_RISE = 0.002;
const SPEECH_MAX_UTTERANCE_MS = 15000;
const SPEECH_IDLE_RECYCLE_MS = 6000;
const SPEECH_VAD_INTERVAL_MS = 50;

function getParticipantId() {
  const key = "bud-participant-id";
  let participantId = window.sessionStorage.getItem(key);
  if (!participantId) {
    participantId = "learner-" + Math.random().toString(36).slice(2, 10);
    window.sessionStorage.setItem(key, participantId);
  }
  return participantId;
}

function boot() {
  elements.connectButton.addEventListener("click", connectWorkshop);
  elements.nameInput.addEventListener("input", updateBudName);
  elements.form.addEventListener("keydown", submitOnEnter);
  elements.microphoneButton.addEventListener("click", toggleMicrophone);
  elements.participantScreenButton.addEventListener("click", toggleParticipantScreen);
  elements.clearCaptions.addEventListener("click", clearCaptions);
  elements.helpButton.addEventListener("click", function () {
    postJson("/api/help-stuck", { participant_id: PARTICIPANT_ID });
  });

  elements.observeButton.addEventListener("click", function () {
    postJson("/api/observe", { participant_id: PARTICIPANT_ID });
  });

  elements.dismissButton.addEventListener("click", function () {
    const latest = currentMessages()[currentMessages().length - 1];
    if (latest) {
      latestDismissedMessageId = latest.message_id;
      renderMessages(currentMessages());
    }
  });

  document.querySelectorAll(".comprehension-button").forEach(function (button) {
    button.addEventListener("click", function () {
      postJson("/api/comprehension-response", {
        participant_id: PARTICIPANT_ID,
        room_name: elements.roomInput.value.trim(),
        response: button.dataset.response
      });
    });
  });

  elements.form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = elements.input.value.trim();
    if (!text) {
      return;
    }
    elements.input.value = "";
    postJson("/api/private-message", {
      participant_id: PARTICIPANT_ID,
      room_name: elements.roomInput.value.trim(),
      text: text
    });
  });

  elements.sharedForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = elements.sharedInput.value.trim();
    if (!text) return;
    elements.sharedInput.value = "";
    postJson("/api/group-message", {
      participant_id: PARTICIPANT_ID,
      text: text,
      language: elements.nativeLanguageInput.value
    });
  });

  getState();
  pollSharedMessages();
  window.setInterval(getState, 3000);
  window.setInterval(pollSharedMessages, 3000);
  // The native language is the only language this learner reads in, so changing it
  // re-renders everything already on screen rather than only what arrives next.
  elements.nativeLanguageInput.addEventListener("change", function () {
    pollSharedMessages();
    replayCaptions();
    // Check-in summaries are pushed by the server in whichever language this learner
    // last reported, so a change has to be told to the server as well as re-rendered.
    if (livekitRoom) reportTopviewPresence(true, speechCaptureActive);
  });
  updateBudName();
  applyLearnerBackground();
  applyBudAvatar();
}

function submitOnEnter(event) {
  if (event.target.tagName !== "TEXTAREA" || event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }
  event.preventDefault();
  if (elements.input.value.trim()) {
    elements.form.requestSubmit();
  }
}

function applyLearnerBackground() {
  const palette = ["#6f9ee8", "#e8ad43", "#63b981", "#d875a0", "#4ca7a7"];
  const storageKey = "bud-learner-background";
  let color = window.sessionStorage.getItem(storageKey);
  if (!color || palette.indexOf(color) === -1) {
    color = palette[Math.floor(Math.random() * palette.length)];
    window.sessionStorage.setItem(storageKey, color);
  }
  document.body.style.setProperty("--wash", color);
}

function applyBudAvatar() {
  const avatars = [1, 2, 3, 4, 5, 6, 7, 8].map(function (number) {
    return "/assets/bud-pics/bud-" + number + ".png";
  });
  const storageKey = "bud-avatar-asset";
  let avatar = window.sessionStorage.getItem(storageKey);
  if (!avatar || avatars.indexOf(avatar) === -1) {
    avatar = avatars[Math.floor(Math.random() * avatars.length)];
    window.sessionStorage.setItem(storageKey, avatar);
  }
  elements.budAvatar.src = avatar;
}

function updateBudName() {
  const learnerName = elements.nameInput.value.trim() || "Learner";
  const budName = learnerName + "'s Bud";
  elements.budPanelTitle.textContent = budName;
  elements.activityTitle.textContent = budName + " Thread";
  elements.messageLabel.textContent = "Message " + budName;
}

function connectWorkshop() {
  if (!window.LivekitClient) {
    setConnectionStatus("LiveKit client unavailable");
    return;
  }
  elements.connectButton.disabled = true;
  setConnectionStatus("Requesting room access...");
  fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_name: elements.roomInput.value.trim(),
      participant_id: PARTICIPANT_ID,
      name: elements.nameInput.value.trim(),
      role: "learner"
    })
  })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to get LiveKit token");
      livekitRoom = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
      livekitRoom.on(window.LivekitClient.RoomEvent.TrackSubscribed, function (track, publication, participant) { renderRemoteMedia(track, publication, participant); });
      livekitRoom.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, function (track, publication) { removeMediaTrack(track, publication); });
      livekitRoom.on(window.LivekitClient.RoomEvent.ParticipantConnected, function (participant) {
        roomParticipants[participant.identity] = participant.name || participant.identity;
        appendRoomMessage(participant.name + " joined the workshop.");
        renderPresence();
      });
      livekitRoom.on(window.LivekitClient.RoomEvent.ParticipantDisconnected, function (participant) {
        delete roomParticipants[participant.identity];
        appendRoomMessage(participant.name + " left the workshop.");
        renderPresence();
      });
      livekitRoom.on(window.LivekitClient.RoomEvent.DataReceived, function (payload, participant) {
        try {
          const message = JSON.parse(new TextDecoder().decode(payload));
          if (message.type === "group_message") {
            // The post itself is fetched back from the server rather than shown straight
            // from the data channel, because only the server can hand this reader the
            // translated copy that goes underneath it.
            pollSharedMessages();
            return;
          }
        } catch (error) {
          appendRoomMessage((participant ? participant.name : "Workshop") + ": " + new TextDecoder().decode(payload));
        }
      });
      return livekitRoom.connect(result.body.url, result.body.token);
    })
    .then(function () {
      setConnectionStatus("Connected");
      elements.connectButton.textContent = "Connected";
      elements.microphoneButton.disabled = false;
      elements.participantScreenButton.disabled = false;
      refreshMediaState();
      reportTopviewPresence(true, false);
      Object.keys(livekitRoom.remoteParticipants).forEach(function (identity) {
        const participant = livekitRoom.remoteParticipants[identity];
        roomParticipants[identity] = participant.name || identity;
      });
      renderPresence();
      startCaptionFeed();
      // Captions are for the whole call, so start listening on join instead of waiting
      // for a press. The button now mutes rather than starts.
      startMicrophone();
    })
    .catch(function (error) {
      setConnectionStatus(error.message);
      elements.connectButton.disabled = false;
    });
}

function refreshMediaState() {
  fetch("/api/livekit/media?room=" + encodeURIComponent(elements.roomInput.value.trim())).then(function (response) { return response.json(); }).then(function (state) {
    elements.participantScreenButton.disabled = !state.participant_screen_share_enabled;
    elements.participantScreenButton.textContent = state.active_screen_share && state.active_screen_share.participant_id === PARTICIPANT_ID ? "Stop sharing" : "Share screen + audio";
    elements.mediaStatus.textContent = state.active_screen_share ? "Screen shared by " + state.active_screen_share.display_name : "No shared screen";
  }).catch(function () {});
}

// Somewhere off-screen to keep the audio elements for other people's voices. An audio
// element only keeps playing while it is in the page, so voices need a home even
// though there is nothing to look at.
function audioSink() {
  let sink = document.getElementById("remote-audio-sink");
  if (!sink) {
    sink = document.createElement("div");
    sink.id = "remote-audio-sink";
    sink.hidden = true;
    document.body.appendChild(sink);
  }
  return sink;
}

function renderRemoteMedia(track, publication, participant) {
  // A speaker must never be played their own voice back: it arrives a moment late and
  // sounds like an echo. LiveKit does not normally send a track back to whoever
  // published it, but a rejoin can leave the old copy behind, so drop it by name here.
  const isSelf = participant.identity === PARTICIPANT_ID;
  if (isSelf && track.kind === "audio") return;
  const element = track.attach();
  element.dataset.participantId = participant.identity;
  element.dataset.source = publication.source;
  if (isSelf) element.muted = true;
  if (publication.source === window.LivekitClient.Track.Source.Microphone) {
    // Everyone else's voice, played through the hidden sink.
    audioSink().appendChild(element);
    return;
  }
  if (publication.source === window.LivekitClient.Track.Source.ScreenShareAudio) {
    elements.mainMedia.appendChild(element);
    elements.mediaStatus.textContent = "Screen audio shared by " + (participant.name || participant.identity);
    return;
  }
  if (publication.source === window.LivekitClient.Track.Source.ScreenShare) {
    elements.mainMedia.innerHTML = "";
    elements.mainMedia.appendChild(element);
    elements.mediaStatus.textContent = "Screen shared by " + (participant.name || participant.identity);
  } else if (publication.source === window.LivekitClient.Track.Source.Camera) {
    elements.mediaStrip.appendChild(element);
  }
}

function removeMediaTrack(track, publication) {
  track.detach().forEach(function (element) { element.remove(); });
  if (publication.source === window.LivekitClient.Track.Source.ScreenShare) {
    elements.mainMedia.innerHTML = "<p class=\"empty\">The main workshop screen will appear here.</p>";
    refreshMediaState();
  }
}

function toggleParticipantScreen() {
  if (!livekitRoom) return;
  const sharing = Boolean(livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.ScreenShare));
  const endpoint = sharing ? "/api/livekit/media/release" : "/api/livekit/media/claim";
  const body = { room_name: elements.roomInput.value.trim(), participant_id: PARTICIPANT_ID, display_name: elements.nameInput.value.trim(), role: "learner" };
  fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (response) { return response.json().then(function (payload) { return { ok: response.ok, payload: payload }; }); }).then(function (result) {
    if (!result.ok) throw new Error(result.payload.error || "Screen sharing is unavailable");
    return livekitRoom.localParticipant.setScreenShareEnabled(!sharing, { audio: true });
  }).then(function () { elements.participantScreenButton.textContent = sharing ? "Share screen + audio" : "Stop sharing"; refreshMediaState(); }).catch(function (error) { elements.mediaStatus.textContent = error.message; });
}


function toggleMicrophone() {
  if (!livekitRoom) return;
  if (speechCaptureActive) {
    muteMicrophone();
  } else {
    startMicrophone();
  }
}

function startMicrophone() {
  if (!livekitRoom) return;
  livekitRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function () {
      elements.microphoneButton.textContent = "Mute microphone";
      elements.microphoneButton.disabled = false;
      elements.micStatusText.textContent = "Captioning everything you say...";
      reportTopviewPresence(true, true);
      startMicMeter();
      startSpeechCapture();
      appendRoomMessage("Your microphone is live and being captioned. Press Mute microphone to stop.");
    })
    .catch(function (error) { setConnectionStatus("Microphone unavailable: " + error.message); });
}

function muteMicrophone() {
  speechCaptureActive = false;
  if (speechRecorder && speechRecorder.state === "recording") speechRecorder.stop();
  stopSpeechVad();
  if (livekitRoom) livekitRoom.localParticipant.setMicrophoneEnabled(false).catch(function () {});
  if (micAnalyserFrame) {
    window.cancelAnimationFrame(micAnalyserFrame);
    micAnalyserFrame = null;
  }
  Array.prototype.forEach.call(elements.micMeter.children, function (bar) { bar.classList.remove("active"); });
  elements.microphoneButton.textContent = "Unmute microphone";
  elements.micStatusText.textContent = "Microphone muted";
  flushPendingSentence();
  reportTopviewPresence(true, false);
  appendRoomMessage("Your microphone is muted. Others are still captioned.");
}

// Tells the server this learner has just started speaking again, before any audio has
// been uploaded or transcribed. Without it the server cannot distinguish a speaker who
// has finished from one whose next words are still queued behind the transcriber, and
// it would either publish half-sentences or hold finished ones back. Failures are
// ignored: the worst case is the held sentence being published a moment early.
function reportSpeaking() {
  fetch("/api/transcribe/speaking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: PARTICIPANT_ID,
      speech_sequence: speechChunkSequence
    })
  }).catch(function () {});
}

// The server holds transcript fragments until they form a sentence. When the speaker
// stops, that last fragment may never get its full stop, so ask for it to be
// translated as-is rather than leaving it stranded in the buffer.
function flushPendingSentence() {
  fetch("/api/transcribe/flush", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: PARTICIPANT_ID,
      room_name: elements.roomInput.value.trim(),
      native_language: elements.nativeLanguageInput.value,
      // Everyone reads the room in their own language, so this learner's own tail
      // sentence is only translated for the listeners who need it; the request still
      // carries a target so the server has one to fall back on.
      target_language: elements.nativeLanguageInput.value
    })
  }).then(function (response) {
    return response.json();
  }).then(function (payload) {
    // The caption panel picks this up from the room feed; only the private Bud thread
    // note is added here so the same line is not shown twice.
    if (payload.translation && payload.translation.translated_text) {
      appendRoomMessage("Translation: " + payload.translation.translated_text);
    }
  }).catch(function () {});
}

function reportTopviewPresence(connected, microphoneActive) {
  fetch("/api/topview/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connected: connected,
      participant_id: PARTICIPANT_ID,
      display_name: elements.nameInput.value.trim() || PARTICIPANT_ID,
      role: "learner",
      room_name: elements.roomInput.value.trim(),
      language: elements.nativeLanguageInput.value,
      microphone_active: microphoneActive
    })
  }).catch(function () {});
}

function startSpeechCapture() {
  if (!window.MediaRecorder || speechCaptureActive) return;
  const publication = livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Microphone);
  const mediaTrack = publication && publication.track && publication.track.mediaStreamTrack;
  const streamPromise = mediaTrack
    ? Promise.resolve(new MediaStream([mediaTrack]))
    // Ask the browser to clean the audio before it reaches the recorder. Room echo
    // and steady background noise are what the transcriber turns into invented words,
    // and automatic gain keeps a quiet speaker at a usable level.
    : navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    });
  streamPromise.then(function (stream) {
    speechCaptureStream = stream;
    speechCaptureActive = true;
    startSpeechVad(stream);
    appendRoomMessage("Local Whisper capture active.");
    recordSpeechChunk();
  }).catch(function (error) {
    setConnectionStatus("Speech capture unavailable: " + error.message);
  });
}

// Watches the microphone level on the same stream the recorder is using, and closes
// the current chunk once the speaker has paused. Runs on a timer rather than
// requestAnimationFrame so segmentation keeps working in a background tab.
function startSpeechVad(stream) {
  stopSpeechVad();
  speechVadEnabled = false;
  // Start optimistic about the room and let the first seconds of audio correct it,
  // rather than inheriting a baseline from a previous session or a different mic.
  speechNoiseFloor = 0;
  if (!window.AudioContext) return;
  speechVadContext = new window.AudioContext();
  speechVadAnalyser = speechVadContext.createAnalyser();
  speechVadAnalyser.fftSize = 256;
  speechVadContext.createMediaStreamSource(stream).connect(speechVadAnalyser);
  speechVadData = new Uint8Array(speechVadAnalyser.frequencyBinCount);
  speechVadEnabled = true;

  speechVadTimer = window.setInterval(function () {
    if (!speechCaptureActive) return;
    speechVadAnalyser.getByteFrequencyData(speechVadData);
    let total = 0;
    speechVadData.forEach(function (value) { total += value; });
    const level = total / speechVadData.length / 48;
    const now = Date.now();
    speechCurrentLevel = level;

    // Follow the room's quiet level, so "is this speech" is measured against the
    // background rather than against a number picked in a silent office.
    const drift = level < speechNoiseFloor ? NOISE_FLOOR_FALL : NOISE_FLOOR_RISE;
    speechNoiseFloor += (level - speechNoiseFloor) * drift;

    const speaking = level >= vadSettings.level && level >= speechNoiseFloor + vadSettings.margin;
    if (speaking) speechMsInChunk += SPEECH_VAD_INTERVAL_MS;
    // One loud transient is not speech. Only once enough of the chunk has been above
    // the threshold does the chunk count as carrying words, which is what decides
    // whether it is uploaded at all.
    if (speaking && speechMsInChunk >= vadSettings.minSpeech) {
      // The first speech in a chunk is worth telling the server about immediately. It
      // will not see this chunk's words for several seconds — transcription is slow —
      // and until it knows someone has started talking again it cannot tell a speaker
      // who has finished from one who is mid-sentence, so it would either publish half
      // a sentence or sit on a finished one.
      if (!speechHeardInChunk) {
        speechFirstHeardAt = now;
        reportSpeaking();
      }
      speechHeardInChunk = true;
      speechLastHeardAt = now;
    }

    if (!speechRecorder || speechRecorder.state !== "recording") return;
    const elapsed = now - speechChunkStartedAt;

    if (speechHeardInChunk) {
      // Cut on a sustained pause, or force a cut if someone talks without pausing.
      if (now - speechLastHeardAt >= vadSettings.pause || elapsed >= SPEECH_MAX_UTTERANCE_MS) {
        speechRecorder.stop();
      }
    } else if (elapsed >= SPEECH_IDLE_RECYCLE_MS) {
      // Nothing but silence so far — recycle the recorder rather than buffering it.
      speechRecorder.stop();
    }
  }, SPEECH_VAD_INTERVAL_MS);
}

function stopSpeechVad() {
  if (speechVadTimer) {
    window.clearInterval(speechVadTimer);
    speechVadTimer = null;
  }
  if (speechVadContext) {
    speechVadContext.close().catch(function () {});
    speechVadContext = null;
  }
  speechVadAnalyser = null;
  speechVadData = null;
  // speechHeardInChunk is deliberately left alone: the recorder's final
  // ondataavailable fires after this runs and still needs to know whether the
  // closing chunk actually contained speech.
}

function recordSpeechChunk() {
  if (!speechCaptureActive) return;
  speechRecorder = new MediaRecorder(speechCaptureStream, { mimeType: "audio/webm" });
  speechRecorder.ondataavailable = function (event) {
    // Skip chunks that were pure silence — they cost a round trip and Whisper
    // tends to hallucinate filler text when handed nothing but background noise.
    if (speechVadEnabled && !speechHeardInChunk) return;
    if (event.data && event.data.size > 0) {
      const form = new Blob([event.data], { type: "audio/webm" });
      const speechSequence = speechChunkSequence;
      const uploadedAt = Date.now();
      fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm",
          "X-Participant-Id": PARTICIPANT_ID,
          "X-Room-Name": elements.roomInput.value.trim(),
          "X-Native-Language": elements.nativeLanguageInput.value,
          // Listeners translate each turn into their own language when they read it
          // back from the room transcript, so nothing is aimed at one target here.
          "X-Target-Language": elements.nativeLanguageInput.value,
          "X-Speech-Sequence": String(speechSequence),
          // How long ago speech started and stopped inside this chunk. Sent as ages
          // rather than timestamps so the browser's clock never has to agree with the
          // server's. The server uses them to measure the pause the speaker left,
          // which is what decides when a sentence is finished — transcription time
          // must not be mistaken for someone falling silent.
          "X-Speech-Lead-Ms": String(Math.max(0, uploadedAt - (speechFirstHeardAt || uploadedAt))),
          "X-Speech-Silence-Ms": String(Math.max(0, uploadedAt - (speechLastHeardAt || uploadedAt)))
        },
        body: form
      }).then(function (response) {
        return response.json();
      }).then(function (payload) {
        if (Number(payload.speech_sequence) < latestRenderedSequence) {
          appendRoomMessage("Older Bud response discarded because newer context is available; the earlier context remains saved.");
          return;
        }
        latestRenderedSequence = Number(payload.speech_sequence);
        if (payload.transcript && payload.transcript.ignored) {
          appendRoomMessage("Speech ignored because it was not detected as " + languageName(elements.nativeLanguageInput.value) + ".");
          return;
        }
        // Captions for this speech arrive through the shared room feed, which is what
        // every participant sees; here only the private Bud thread is updated.
        if (payload.transcript && payload.transcript.text) {
          appendRoomMessage("You: " + payload.transcript.text);
        }
        if (payload.translation && payload.translation.translated_text) {
          appendRoomMessage("Translation: " + payload.translation.translated_text);
        }
        if (payload.translation && payload.translation.unavailable) {
          appendRoomMessage("Translation unavailable. Start the local NLLB service and restart Bud.");
        }
      }).catch(function () {
        setConnectionStatus("Whisper service unavailable");
      });
    }
  };
  speechRecorder.onstop = function () {
    if (speechCaptureActive) recordSpeechChunk();
  };
  speechHeardInChunk = false;
  speechMsInChunk = 0;
  speechChunkStartedAt = Date.now();
  speechLastHeardAt = speechChunkStartedAt;
  speechFirstHeardAt = 0;
  // Numbered when the chunk opens rather than when it uploads, so the "someone is
  // speaking" ping and the audio that follows it carry the same number and the server
  // can match them up. Chunks that turn out to be silence are never uploaded and simply
  // leave a gap in the numbering, which nothing minds.
  speechChunkSequence += 1;
  speechRecorder.start();
  if (!speechVadEnabled) {
    // No Web Audio support: fall back to the old fixed-length chunking.
    window.setTimeout(function () {
      if (speechRecorder && speechRecorder.state === "recording") speechRecorder.stop();
    }, 4000);
  }
}

function startMicMeter() {
  if (!window.AudioContext) {
    elements.micStatusText.textContent = "Microphone active";
    return;
  }

  const publication = livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Microphone);
  const publishedTrack = publication && publication.track && publication.track.mediaStreamTrack;
  const streamPromise = publishedTrack
    ? Promise.resolve(new MediaStream([publishedTrack]))
    : navigator.mediaDevices.getUserMedia({ audio: true });

  streamPromise.then(function (stream) {
    const audioContext = new window.AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const bars = Array.prototype.slice.call(elements.micMeter.children);

  function renderMeter() {
      analyser.getByteFrequencyData(data);
      let total = 0;
      data.forEach(function (value) { total += value; });
      const level = Math.min(1, total / data.length / 48);
      bars.forEach(function (bar, index) {
        const threshold = (index + 1) / bars.length;
        bar.classList.toggle("active", level >= threshold * 0.72);
      });
      micAnalyserFrame = window.requestAnimationFrame(renderMeter);
    }

    if (micAnalyserFrame) window.cancelAnimationFrame(micAnalyserFrame);
    renderMeter();
  }).catch(function () {
    elements.micStatusText.textContent = "Microphone active";
  });
}

function setConnectionStatus(text) {
  elements.connectionStatus.textContent = text;
}

function appendRoomMessage(text) {
  const item = document.createElement("div");
  item.textContent = text;
  elements.roomFeed.appendChild(item);
}

let lastState = null;

function currentMessages() {
  return lastState ? lastState.private_messages : [];
}

function getState() {
  fetch("/api/state?participant_id=" + encodeURIComponent(PARTICIPANT_ID))
    .then(function (response) {
      return response.json();
    })
    .then(renderState)
    .catch(showOffline);
}

function postJson(url, body) {
  setBusy(true);
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (payload) {
      renderState(payload.state);
      if (payload.event && payload.event.type === "participant_message" && payload.event.privacy_scope === "group_shared") {
        const groupMessage = {
          type: "group_message",
          sender_name: elements.nameInput.value.trim() || PARTICIPANT_ID,
          text: payload.event.payload.text
        };
        pollSharedMessages();
        if (livekitRoom) {
          livekitRoom.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(groupMessage)), { reliable: true });
        }
      }
    })
    .catch(showOffline)
    .then(function () {
      setBusy(false);
    });
}

function renderState(state) {
  lastState = state;
  elements.title.textContent = "BUD AI Demo Workshop (participant)";
  elements.phase.textContent = state.workshop.phase;
  elements.promptText.textContent = state.workshop.prompt;

  const understanding = state.participant && state.participant.understanding;
  const participation = state.participant && state.participant.participation;
  elements.understanding.textContent = understanding ? understanding.status : "unknown";
  elements.participation.textContent = participation ? participation.status : "present";
  elements.comprehension.textContent = state.participant && state.participant.comprehension ? state.participant.comprehension.status : "unknown";
  renderMessages(state.private_messages);
}

// The shared discussion is fetched separately from the rest of the state because each
// reader gets it in their own language, and translating on demand cannot be answered
// from the synchronous state snapshot.
function pollSharedMessages() {
  fetch("/api/group-messages?target=" + encodeURIComponent(elements.nativeLanguageInput.value))
    .then(function (response) { return response.json(); })
    .then(function (payload) { renderSharedMessages(payload.messages || []); })
    .catch(function () {});
}

function renderSharedMessages(messages) {
  const atBottom = elements.sharedMessages.scrollTop + elements.sharedMessages.clientHeight >=
    elements.sharedMessages.scrollHeight - 8;
  elements.sharedMessages.innerHTML = "";
  messages.forEach(function (message) { appendSharedMessage(message); });
  if (atBottom) elements.sharedMessages.scrollTop = elements.sharedMessages.scrollHeight;
}

// Every post is shown as it was written, with the reader's own language underneath, so
// nobody has to guess at a post made in a language they do not speak and the writer's
// actual words stay on screen.
function appendSharedMessage(message) {
  const item = document.createElement("article");
  item.className = "shared-message";

  const sender = document.createElement("span");
  sender.className = "shared-message-sender";
  sender.textContent = (message.sender_id === PARTICIPANT_ID ? "You" : message.display_name || "Workshop") +
    (message.role === "facilitator" ? " (facilitator)" : "");
  item.appendChild(sender);

  const original = document.createElement("p");
  original.className = "shared-message-original";
  original.textContent = message.original_text;
  item.appendChild(original);

  if (message.translated_text) {
    const translated = document.createElement("p");
    translated.className = "shared-message-translated";
    translated.lang = message.target_language;
    translated.textContent = message.translated_text;
    item.appendChild(translated);
  }

  elements.sharedMessages.appendChild(item);
}

// Polls the room transcript so this panel shows every speaker in the call, each line
// attributed by name and role, translated into this learner's chosen language.
function startCaptionFeed() {
  if (captionPollTimer) return;
  pollCaptions();
  captionPollTimer = window.setInterval(pollCaptions, CAPTION_POLL_MS);
}

function pollCaptions() {
  const roomName = elements.roomInput.value.trim();
  if (!roomName) return;
  const query = "room=" + encodeURIComponent(roomName) +
    "&after=" + latestCaptionSequence +
    "&target=" + encodeURIComponent(elements.nativeLanguageInput.value);
  fetch("/api/transcript/live?" + query)
    .then(function (response) { return response.json(); })
    .then(function (payload) {
      (payload.entries || []).forEach(upsertCaption);
      // The server says how far the cursor may move: up to the last caption whose
      // translation is finished. Anything after that is still being translated and is
      // deliberately sent again next poll, so the line on screen gets replaced rather
      // than being stuck in the original language.
      const nextAfter = Number(payload.next_after);
      if (isFinite(nextAfter) && nextAfter > latestCaptionSequence) {
        latestCaptionSequence = nextAfter;
      }
    })
    .catch(function () {});
}

// Captions already drawn are in the language that was selected when they arrived.
// Rewinding the feed and clearing the panel asks the server for the whole transcript
// again, translated into the language just chosen.
function replayCaptions() {
  if (!captionPollTimer) return;
  latestCaptionSequence = 0;
  clearCaptions();
  pollCaptions();
}

// Draws a caption, or redraws one already on screen. A caption whose translation was
// not ready in time is shown in the original language straight away and sent again by
// the server once translated, so the same line has to be replaceable rather than
// appended twice.
function upsertCaption(entry) {
  const existing = captionNodes[entry.entry_id];
  const item = buildCaption(entry);
  captionNodes[entry.entry_id] = item;
  if (existing && existing.parentNode) {
    existing.parentNode.replaceChild(item, existing);
    return;
  }
  const empty = elements.captionList.querySelector(".empty");
  if (empty) empty.remove();
  elements.captionList.appendChild(item);
  elements.captionList.scrollTop = elements.captionList.scrollHeight;
}

function buildCaption(entry) {
  const item = document.createElement("article");
  item.className = "caption";
  const captionHead = document.createElement("div");
  captionHead.className = "caption-head";
  const captionLabel = document.createElement("span");
  captionLabel.className = "caption-label";
  const isSelf = entry.participant_id === PARTICIPANT_ID;
  captionLabel.textContent = (isSelf ? "You" : entry.display_name) +
    (entry.role === "facilitator" ? " (facilitator)" : " (learner)");
  const captionTime = document.createElement("time");
  captionTime.className = "caption-time";
  const spokenAt = new Date(entry.created_at);
  captionTime.dateTime = spokenAt.toISOString();
  captionTime.textContent = spokenAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  captionHead.appendChild(captionLabel);
  captionHead.appendChild(captionTime);
  item.appendChild(captionHead);

  // The translation is the line a learner actually reads, so it leads; the original
  // stays underneath so the speaker's own words remain visible.
  if (entry.translated_text) {
    const translated = document.createElement("p");
    translated.textContent = entry.translated_text;
    item.appendChild(translated);
    const original = document.createElement("p");
    original.className = "caption-original";
    original.textContent = entry.original_text;
    item.appendChild(original);
  } else {
    const original = document.createElement("p");
    original.textContent = entry.original_text;
    // Still with the translator: shown now in the speaker's own language so the turn is
    // not missing from the panel, and replaced in place when the translation lands.
    if (entry.translation_pending) original.className = "caption-untranslated";
    item.appendChild(original);
  }

  return item;
}

function clearCaptions() {
  captionNodes = {};
  elements.captionList.innerHTML = "";
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "Captions will appear when anyone in the call speaks.";
  elements.captionList.appendChild(empty);
}

function languageName(code) {
  const option = elements.nativeLanguageInput.querySelector("option[value='" + code + "']");
  return option ? option.textContent : code;
}

function renderPresence() {
  const names = Object.keys(roomParticipants).map(function (id) { return roomParticipants[id]; });
  elements.presenceList.textContent = names.length ? names.join(", ") : "No other learners connected";
}

function renderMessages(messages) {
  elements.messages.innerHTML = "";
  const visibleMessages = messages.filter(function (message) {
    return message.message_id !== latestDismissedMessageId;
  });

  if (!visibleMessages.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Bud has not sent a private message yet.";
    elements.messages.appendChild(empty);
    return;
  }

  visibleMessages.forEach(function (message) {
    const item = document.createElement("article");
    item.className = "message " + (message.sender === "learner" ? "message-user" : "message-bud");
    const sender = document.createElement("span");
    sender.className = "message-sender";
    sender.textContent = message.sender === "learner"
      ? "You"
      : message.message_type === "periodic_summary" ? "Bud / Check-in summary" : "Bud";
    const text = document.createElement("div");
    text.textContent = message.text;
    const time = document.createElement("time");
    time.textContent = new Date(message.created_at).toLocaleTimeString();
    item.appendChild(sender);
    item.appendChild(text);
    item.appendChild(time);
    elements.messages.appendChild(item);
  });
}

function setBusy(isBusy) {
  elements.helpButton.disabled = isBusy;
  elements.observeButton.disabled = isBusy;
  document.querySelectorAll(".comprehension-button").forEach(function (button) { button.disabled = isBusy; });
  elements.form.querySelector("button").disabled = isBusy;
}

function showOffline() {
  elements.messages.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = "Bud server is not reachable.";
  elements.messages.appendChild(empty);
}

boot();
