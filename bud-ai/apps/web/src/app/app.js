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
  languageInput: document.getElementById("language-input"),
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
let latestSpeechSequence = 0;
let periodicSummaryTimer = null;

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
  elements.microphoneButton.addEventListener("click", publishMicrophone);
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
      postJson("/api/comprehension-response", { participant_id: PARTICIPANT_ID, response: button.dataset.response });
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
      language: "en"
    });
  });

  getState();
  window.setInterval(getState, 3000);
  periodicSummaryTimer = window.setInterval(requestPeriodicSummary, 90000);
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
            appendSharedMessage(message.sender_name + ": " + message.text);
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
      requestPeriodicSummary();
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

function renderRemoteMedia(track, publication, participant) {
  const element = track.attach();
  element.dataset.participantId = participant.identity;
  element.dataset.source = publication.source;
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


function requestPeriodicSummary() {
  if (!livekitRoom) return;
  fetch("/api/participant-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participant_id: PARTICIPANT_ID, room_name: elements.roomInput.value.trim() })
  })
    .then(function (response) { return response.json(); })
    .then(function (payload) {
      if (payload.state) renderState(payload.state);
    })
    .catch(function () {});
}

function publishMicrophone() {
  if (!livekitRoom) return;
  livekitRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function () {
      elements.microphoneButton.textContent = "Microphone active";
      elements.microphoneButton.disabled = true;
      elements.micStatusText.textContent = "Microphone active";
      reportTopviewPresence(true, true);
      startMicMeter();
      startSpeechCapture();
      appendRoomMessage("Microphone published to the workshop.");
    })
    .catch(function (error) { setConnectionStatus("Microphone unavailable: " + error.message); });
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
      language: elements.languageInput.value,
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
    : navigator.mediaDevices.getUserMedia({ audio: true });
  streamPromise.then(function (stream) {
    speechCaptureStream = stream;
    speechCaptureActive = true;
    appendRoomMessage("Local Whisper capture active.");
    recordSpeechChunk();
  }).catch(function (error) {
    setConnectionStatus("Speech capture unavailable: " + error.message);
  });
}

function recordSpeechChunk() {
  if (!speechCaptureActive) return;
  speechRecorder = new MediaRecorder(speechCaptureStream, { mimeType: "audio/webm" });
  speechRecorder.ondataavailable = function (event) {
    if (event.data && event.data.size > 0) {
      const form = new Blob([event.data], { type: "audio/webm" });
      const speechSequence = ++speechChunkSequence;
      latestSpeechSequence = speechSequence;
      const targetLanguage = elements.languageInput.value;
      fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm",
          "X-Participant-Id": PARTICIPANT_ID,
          "X-Target-Language": targetLanguage,
          "X-Speech-Sequence": String(speechSequence)
        },
        body: form
      }).then(function (response) {
        return response.json();
      }).then(function (payload) {
        if (Number(payload.speech_sequence) < latestSpeechSequence) {
          appendRoomMessage("Older speech result discarded because newer context is available.");
          return;
        }
        if (payload.transcript && payload.transcript.text) {
          appendRoomMessage("You: " + payload.transcript.text);
          appendCaption(payload.transcript.text, "Original " + (payload.transcript.language || "detected"));
        }
        if (payload.translation && payload.translation.translated_text) {
          appendRoomMessage("Translation: " + payload.translation.translated_text);
          appendCaption(payload.translation.translated_text, "Translation to " + languageName(targetLanguage));
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
  speechRecorder.start();
  window.setTimeout(function () {
    if (speechRecorder && speechRecorder.state === "recording") speechRecorder.stop();
  }, 4000);
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
  renderSharedMessages(state.group_messages);
}

function renderSharedMessages(messages) {
  elements.sharedMessages.innerHTML = "";
  messages.slice(-20).forEach(function (message) {
    appendSharedMessage((message.sender_id || "Workshop") + ": " + message.text);
  });
}

function appendSharedMessage(text) {
  const item = document.createElement("div");
  item.className = "shared-message";
  item.textContent = text;
  elements.sharedMessages.appendChild(item);
  elements.sharedMessages.scrollTop = elements.sharedMessages.scrollHeight;
}

function appendCaption(text, label) {
  const empty = elements.captionList.querySelector(".empty");
  if (empty) empty.remove();
  const item = document.createElement("article");
  item.className = "caption";
  const captionLabel = document.createElement("span");
  captionLabel.className = "caption-label";
  captionLabel.textContent = label;
  const captionText = document.createElement("p");
  captionText.textContent = text;
  item.appendChild(captionLabel);
  item.appendChild(captionText);
  elements.captionList.appendChild(item);
  elements.captionList.scrollTop = elements.captionList.scrollHeight;
}

function clearCaptions() {
  elements.captionList.innerHTML = "";
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "Captions will appear when speech is detected.";
  elements.captionList.appendChild(empty);
}

function languageName(code) {
  const option = elements.languageInput.querySelector("option[value='" + code + "']");
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
