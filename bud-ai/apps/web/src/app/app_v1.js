const PARTICIPANT_ID = getParticipantId();

const elements = {
  title: document.getElementById("workshop-title"),
  budPanelTitle: document.getElementById("bud-panel-title"),
  activityTitle: document.getElementById("activity-title"),
  messageLabel: document.getElementById("message-label"),
  budAvatar: document.getElementById("bud-avatar"),
  phase: document.getElementById("phase"),
  promptText: document.getElementById("prompt-text"),
  workshopTimer: document.getElementById("workshop-timer"),
  attachmentList: document.getElementById("attachment-list"),
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
  languageInput: document.getElementById("language-input"),
  connectButton: document.getElementById("connect-button"),
  microphoneButton: document.getElementById("microphone-button"),
  micStatusText: document.getElementById("mic-status-text"),
  micMeter: document.getElementById("mic-meter"),
  captionList: document.getElementById("caption-list"),
  documentMeta: document.getElementById("document-meta"),
  documentLocation: document.getElementById("document-location"),
  documentPageNumber: document.getElementById("document-page-number"),
  documentPageHeading: document.getElementById("document-page-heading"),
  documentContent: document.getElementById("document-content"),
  documentPrevious: document.getElementById("document-previous"),
  documentNext: document.getElementById("document-next"),
  documentTaskAction: document.getElementById("document-task-action"),
  documentTaskLabel: document.getElementById("document-task-label"),
  documentTaskDone: document.getElementById("document-task-done"),
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
let periodicSummaryTimer = null;
let silenceTimeout = null;
let workshopPages = [];
let currentDocumentPage = 0;
let completedTasks = {};
const SILENCE_TIMEOUT_MS = 15000;
let speechVadContext = null;
let speechVadAnalyser = null;
let speechVadData = null;
let speechVadTimer = null;
let speechVadEnabled = false;
let speechHeardInChunk = false;
let speechLastHeardAt = 0;
let speechChunkStartedAt = 0;
const SPEECH_LEVEL_THRESHOLD = 0.06;
const SPEECH_PAUSE_MS = 700;
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
  elements.sharedForm.addEventListener("keydown", submitOnEnter);
  elements.microphoneButton.addEventListener("click", publishMicrophone);
  elements.documentPrevious.addEventListener("click", function () { changeDocumentPage(-1); });
  elements.documentNext.addEventListener("click", function () { changeDocumentPage(1); });
  elements.documentTaskDone.addEventListener("click", completeCurrentTask);
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
        response: button.dataset.response,
        page_id: workshopPages[currentDocumentPage] && workshopPages[currentDocumentPage].page_id
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
  window.setInterval(getState, 3000);
  window.setInterval(refreshWorkshopMaterial, 5000);
  periodicSummaryTimer = window.setInterval(requestPeriodicSummary, 90000);
  updateBudName();
  applyLearnerBackground();
  applyBudAvatar();
  refreshWorkshopMaterial();
}

function submitOnEnter(event) {
  if (event.target.tagName !== "TEXTAREA" || event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }
  event.preventDefault();
  if (event.target.value.trim() && event.target.form) {
    event.target.form.requestSubmit();
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

function refreshWorkshopMaterial() {
  fetch("/api/workshop-material?room=" + encodeURIComponent(elements.roomInput.value.trim() || "bud-demo-room"))
    .then(function (response) {
      if (!response.ok) throw new Error("Workshop material unavailable");
      return response.json();
    })
    .then(function (payload) {
      workshopPages = payload.pages && payload.pages.length
        ? payload.pages
        : [{ page_id: "documents", filename: "Workshop documents", location: "Current activity", text: "Read the workshop documents. Complete the current task, ask Bud about anything unclear, and identify the evidence that would show the task was completed." }];
      currentDocumentPage = Math.min(currentDocumentPage, workshopPages.length - 1);
      renderAttachments();
      renderDocumentPage();
    })
    .catch(function () {});
}

function renderAttachments() {
  const filenames = [];
  workshopPages.forEach(function (page) {
    if (filenames.indexOf(page.filename) === -1) filenames.push(page.filename);
  });
  elements.attachmentList.innerHTML = "";
  filenames.forEach(function (filename) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "attachment-link";
    button.textContent = filename;
    button.addEventListener("click", function () {
      const firstPage = workshopPages.findIndex(function (page) { return page.filename === filename; });
      if (firstPage >= 0) {
        currentDocumentPage = firstPage;
        renderDocumentPage();
      }
    });
    elements.attachmentList.appendChild(button);
  });
}

function changeDocumentPage(delta) {
  if (!workshopPages.length) return;
  currentDocumentPage = Math.max(0, Math.min(workshopPages.length - 1, currentDocumentPage + delta));
  renderDocumentPage();
}

function renderDocumentPage() {
  const page = workshopPages[currentDocumentPage];
  if (!page) return;
  elements.documentMeta.textContent = page.filename;
  elements.documentLocation.textContent = page.location;
  elements.documentPageNumber.textContent = "Page " + (currentDocumentPage + 1) + " of " + workshopPages.length;
  elements.documentPageHeading.textContent = page.filename;
  elements.documentContent.textContent = page.text;
  elements.documentPrevious.disabled = currentDocumentPage === 0;
  elements.documentNext.disabled = currentDocumentPage === workshopPages.length - 1;
  const isTask = page.text.toLowerCase().indexOf("task:") !== -1;
  elements.documentTaskAction.hidden = !isTask;
  elements.documentTaskLabel.textContent = isTask ? "Task on this page" : "";
  elements.documentTaskDone.textContent = completedTasks[page.page_id] ? "Task completed" : "Mark task done";
  elements.documentTaskDone.disabled = Boolean(completedTasks[page.page_id]);
}

function completeCurrentTask() {
  const page = workshopPages[currentDocumentPage];
  if (!page || completedTasks[page.page_id]) return;
  completedTasks[page.page_id] = true;
  renderDocumentPage();
  postJson("/api/task-complete", {
    participant_id: PARTICIPANT_ID,
    task_id: "task-" + page.page_id,
    page_id: page.page_id
  });
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
      livekitRoom.on(window.LivekitClient.RoomEvent.TrackSubscribed, function (track, publication, participant) {
        renderRemoteMedia(track, publication, participant);
      });
      livekitRoom.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, function (track, publication) {
        removeMediaTrack(track, publication);
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
  if (publication.source === window.LivekitClient.Track.Source.Microphone) {
    attachRemoteAudioTrack(track, publication, participant);
    return;
  }
  if (publication.source === window.LivekitClient.Track.Source.ScreenShareAudio) {
    const element = track.attach();
    elements.mainMedia.appendChild(element);
    elements.mediaStatus.textContent = "Screen audio shared by " + (participant.name || participant.identity);
    return;
  }
  if (publication.source === window.LivekitClient.Track.Source.ScreenShare) {
    const element = track.attach();
    elements.mainMedia.innerHTML = "";
    elements.mainMedia.appendChild(element);
    elements.mediaStatus.textContent = "Screen shared by " + (participant.name || participant.identity);
  } else if (publication.source === window.LivekitClient.Track.Source.Camera) {
    attachRemoteCameraTrack(track, publication, participant);
  }
}

function attachRemoteAudioTrack(track, publication, participant) {
  const existing = document.querySelector("audio[data-participant-id='" + participant.identity + "'][data-source='microphone']");
  if (existing) return;
  const element = track.attach();
  element.dataset.participantId = participant.identity;
  element.dataset.source = "microphone";
  element.autoplay = true;
  element.playsInline = true;
  element.setAttribute("aria-label", (participant.name || participant.identity) + " microphone");
  element.play().catch(function () {
    appendRoomMessage("Click the page once to enable audio from " + (participant.name || participant.identity) + ".");
  });
  document.body.appendChild(element);
}

function attachRemoteCameraTrack(track, publication, participant) {
  const existing = elements.mediaStrip.querySelector("[data-participant-id='" + participant.identity + "'][data-source='camera']");
  if (existing) return;
  const element = track.attach();
  element.dataset.participantId = participant.identity;
  element.dataset.source = "camera";
  element.autoplay = true;
  element.playsInline = true;
  elements.mediaStrip.appendChild(element);
  elements.mediaStatus.textContent = (participant.name || participant.identity) + " camera active";
}

function removeMediaTrack(track, publication) {
  track.detach().forEach(function (element) { element.remove(); });
  if (publication.source === window.LivekitClient.Track.Source.Microphone) {
    appendRoomMessage("A participant's microphone audio disconnected.");
  }
  if (publication.source === window.LivekitClient.Track.Source.Camera) {
    elements.mediaStatus.textContent = "Facilitator camera off";
  }
  if (publication.source === window.LivekitClient.Track.Source.ScreenShare) {
    elements.mainMedia.innerHTML = "<p class=\"empty\">The main workshop screen will appear here.</p>";
    refreshMediaState();
  }
}

function toggleParticipantScreen() {
  if (!livekitRoom) return;
  const sharing = Boolean(livekitRoom.localParticipant.getTrackPublication("screen_share"));
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
  if (speechCaptureActive) {
    stopTalking();
    return;
  }
  livekitRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function (publication) {
      elements.microphoneButton.textContent = "Stop talking";
      elements.microphoneButton.disabled = false;
      elements.micStatusText.textContent = "Listening for your message...";
      reportTopviewPresence(true, true);
      startMicMeter(publication);
      startSpeechCapture(publication);
      appendRoomMessage("Bud is listening. Press Stop talking when you are finished.");
    })
    .catch(function (error) { setConnectionStatus("Microphone unavailable: " + error.message); });
}

function stopTalking(reason) {
  speechCaptureActive = false;
  if (silenceTimeout) {
    window.clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }
  if (speechRecorder && speechRecorder.state === "recording") speechRecorder.stop();
  stopSpeechVad();
  if (livekitRoom) livekitRoom.localParticipant.setMicrophoneEnabled(false).catch(function () {});
  if (micAnalyserFrame) {
    window.cancelAnimationFrame(micAnalyserFrame);
    micAnalyserFrame = null;
  }
  Array.prototype.forEach.call(elements.micMeter.children, function (bar) { bar.classList.remove("active"); });
  elements.microphoneButton.textContent = "Talk to Bud";
  elements.micStatusText.textContent = "Microphone off";
  reportTopviewPresence(true, false);
  if (reason === "silence") {
    appendRoomMessage("Bud stopped listening after 15 seconds of silence.");
  } else {
    appendRoomMessage("Bud stopped listening.");
  }
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

function startSpeechCapture(publication) {
  if (!window.MediaRecorder || speechCaptureActive) return;
  const activePublication = publication || (livekitRoom.localParticipant.getTrackPublication
    ? livekitRoom.localParticipant.getTrackPublication("microphone")
    : null);
  const mediaTrack = activePublication && activePublication.track && activePublication.track.mediaStreamTrack;
  const streamPromise = mediaTrack
    ? Promise.resolve(new MediaStream([mediaTrack]))
    : navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ audio: true })
      : Promise.reject(new Error("Browser microphone access is unavailable. Use HTTPS or localhost and allow microphone permission."));
  streamPromise.then(function (stream) {
    speechCaptureStream = stream;
    speechCaptureActive = true;
    resetSilenceTimeout();
    startSpeechVad(stream);
    appendRoomMessage("Local Whisper capture active.");
    recordSpeechChunk();
  }).catch(function (error) {
    setConnectionStatus("Speech capture unavailable: " + error.message);
  });
}

function startSpeechVad(stream) {
  stopSpeechVad();
  speechVadEnabled = false;
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
    if (level >= SPEECH_LEVEL_THRESHOLD) {
      speechHeardInChunk = true;
      speechLastHeardAt = now;
    }
    if (!speechRecorder || speechRecorder.state !== "recording") return;
    const elapsed = now - speechChunkStartedAt;
    if (speechHeardInChunk) {
      if (now - speechLastHeardAt >= SPEECH_PAUSE_MS || elapsed >= SPEECH_MAX_UTTERANCE_MS) {
        speechRecorder.stop();
      }
    } else if (elapsed >= SPEECH_IDLE_RECYCLE_MS) {
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
}

function resetSilenceTimeout() {
  if (silenceTimeout) window.clearTimeout(silenceTimeout);
  silenceTimeout = window.setTimeout(function () {
    if (speechCaptureActive) stopTalking("silence");
  }, SILENCE_TIMEOUT_MS);
}

function recordSpeechChunk() {
  if (!speechCaptureActive) return;
  speechRecorder = new MediaRecorder(speechCaptureStream, { mimeType: "audio/webm" });
  speechRecorder.ondataavailable = function (event) {
    if (speechVadEnabled && !speechHeardInChunk) return;
    if (event.data && event.data.size > 0) {
      const form = new Blob([event.data], { type: "audio/webm" });
      const speechSequence = ++speechChunkSequence;
      const targetLanguage = elements.languageInput.value;
      fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "audio/webm",
          "X-Participant-Id": PARTICIPANT_ID,
          "X-Native-Language": elements.nativeLanguageInput.value,
          "X-Target-Language": targetLanguage,
          "X-Speech-Sequence": String(speechSequence)
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
  speechHeardInChunk = false;
  speechChunkStartedAt = Date.now();
  speechLastHeardAt = speechChunkStartedAt;
  speechRecorder.start();
  if (!speechVadEnabled) {
    window.setTimeout(function () {
      if (speechRecorder && speechRecorder.state === "recording") speechRecorder.stop();
    }, 4000);
  }
}

function startMicMeter(publication) {
  if (!window.AudioContext) {
    elements.micStatusText.textContent = "Microphone active";
    return;
  }

  const activePublication = publication || (livekitRoom.localParticipant.getTrackPublication
    ? livekitRoom.localParticipant.getTrackPublication("microphone")
    : null);
  const publishedTrack = activePublication && activePublication.track && activePublication.track.mediaStreamTrack;
  const streamPromise = publishedTrack
    ? Promise.resolve(new MediaStream([publishedTrack]))
    : navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ audio: true })
      : Promise.reject(new Error("Browser microphone access is unavailable. Use HTTPS or localhost and allow microphone permission."));

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
      if (speechCaptureActive && level >= 0.08) resetSilenceTimeout();
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
  elements.title.textContent = "Workshop: How To Use BUD AI";
  elements.phase.textContent = state.workshop.phase;
  elements.promptText.textContent = "Complete the Tasks specified in the document with Bud AI.";
  renderWorkshopTimer(state.workshop_control);

  const understanding = state.participant && state.participant.understanding;
  const participation = state.participant && state.participant.participation;
  elements.understanding.textContent = understanding ? understanding.status : "unknown";
  elements.participation.textContent = participation ? participation.status : "present";
  elements.comprehension.textContent = state.participant && state.participant.comprehension ? state.participant.comprehension.status : "unknown";
  renderMessages(state.private_messages);
  renderSharedMessages(state.group_messages);
}

function renderWorkshopTimer(control) {
  if (!control) return;
  const minutes = Math.floor(control.remaining_seconds / 60).toString().padStart(2, "0");
  const seconds = (control.remaining_seconds % 60).toString().padStart(2, "0");
  elements.workshopTimer.textContent = minutes + ":" + seconds;
  elements.workshopTimer.className = control.status === "ended" ? "timer-ended" : "";
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
