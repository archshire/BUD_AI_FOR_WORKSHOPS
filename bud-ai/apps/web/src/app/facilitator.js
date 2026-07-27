const elements = {
  title: document.getElementById("workshop-title"),
  phase: document.getElementById("phase"),
  prompt: document.getElementById("prompt-text"),
  connectionStatus: document.getElementById("connection-status"),
  roomInput: document.getElementById("room-input"),
  nativeLanguageInput: document.getElementById("facilitator-native-language-input"),
  connectButton: document.getElementById("connect-button"),
  microphoneButton: document.getElementById("facilitator-microphone-button"),
  microphoneStatus: document.getElementById("facilitator-mic-status"),
  microphoneMeter: document.getElementById("facilitator-mic-meter"),
  mediaStatus: document.getElementById("facilitator-media-status"),
  mainMedia: document.getElementById("facilitator-main-media"),
  mediaStrip: document.getElementById("facilitator-media-strip"),
  cameraButton: document.getElementById("facilitator-camera-button"),
  screenButton: document.getElementById("facilitator-screen-button"),
  participantPermissionButton: document.getElementById("participant-permission-button"),
  scanButton: document.getElementById("scan-button"),
  roomFeed: document.getElementById("room-feed"),
  participantCount: document.getElementById("participant-count"),
  participantList: document.getElementById("participant-list"),
  participantsEmpty: document.getElementById("participants-empty"),
  signals: document.getElementById("signals"),
  facilBudMessages: document.getElementById("facil-bud-messages"),
  facilBudForm: document.getElementById("facil-bud-form"),
  facilBudInput: document.getElementById("facil-bud-input"),
  createRoomForm: document.getElementById("create-room-form"),
  managedRoomName: document.getElementById("managed-room-name"),
  allocateForm: document.getElementById("allocate-form"),
  allocationParticipant: document.getElementById("allocation-participant"),
  allocationName: document.getElementById("allocation-name"),
  allocationRoom: document.getElementById("allocation-room"),
  roomList: document.getElementById("room-list"),
  sourcePackForm: document.getElementById("source-pack-form"),
  sourcePackFile: document.getElementById("source-pack-file"),
  sourcePackStatus: document.getElementById("source-pack-status"),
  sourcePackList: document.getElementById("source-pack-list")
  ,facilBudAvatar: document.getElementById("facil-bud-avatar")
  ,captionList: document.getElementById("facilitator-caption-list")
  ,clearCaptions: document.getElementById("facilitator-clear-captions")
};

let livekitRoom = null;
let connectedLearners = {};
let facilitatorSpeechRecorder = null;
let facilitatorSpeechStream = null;
let facilitatorSpeechActive = false;
let facilitatorSpeechSequence = 0;
let facilitatorMicAnalyserFrame = null;

// Live captions for the whole room, polled from the server transcript so the facilitator
// sees every learner's speech attributed by name, not only their own.
let captionPollTimer = null;
let latestCaptionSequence = 0;
// The rendered caption for each transcript entry, so a line whose translation arrived
// after the line itself is replaced rather than drawn twice.
let captionNodes = {};
const CAPTION_POLL_MS = 1200;

// Utterance segmentation, matching the learner app: chunks are cut where the speaker
// pauses rather than on a fixed timer, so a chunk boundary never lands mid-word.
let facilitatorVadContext = null;
let facilitatorVadAnalyser = null;
let facilitatorVadData = null;
let facilitatorVadTimer = null;
let facilitatorVadEnabled = false;
let facilitatorHeardInChunk = false;
let facilitatorLastHeardAt = 0;
// When speech actually began inside the current chunk, as opposed to when the recorder
// was switched on around it, so leading silence is not reported to the server as speech.
let facilitatorFirstHeardAt = 0;
let facilitatorChunkStartedAt = 0;
const SPEECH_LEVEL_THRESHOLD = 0.06;
const SPEECH_PAUSE_MS = 1100;
const SPEECH_MAX_UTTERANCE_MS = 15000;
const SPEECH_IDLE_RECYCLE_MS = 6000;
const SPEECH_VAD_INTERVAL_MS = 50;

function boot() {
  elements.connectButton.addEventListener("click", connectWorkshop);
  elements.microphoneButton.addEventListener("click", toggleFacilitatorMicrophone);
  elements.clearCaptions.addEventListener("click", clearCaptions);
  elements.cameraButton.addEventListener("click", toggleFacilitatorCamera);
  elements.screenButton.addEventListener("click", toggleFacilitatorScreen);
  elements.participantPermissionButton.addEventListener("click", toggleParticipantPermission);
  elements.scanButton.addEventListener("click", scanRoom);
  elements.facilBudForm.addEventListener("submit", sendToFacilBud);
  elements.facilBudForm.addEventListener("keydown", submitOnEnter);
  elements.createRoomForm.addEventListener("submit", createRoom);
  elements.allocateForm.addEventListener("submit", allocateParticipant);
  elements.sourcePackForm.addEventListener("submit", uploadSourceMaterial);
  refreshState();
  refreshRooms();
  refreshSourcePack();
  window.setInterval(refreshState, 3000);
  window.setInterval(refreshRooms, 5000);
  window.setInterval(refreshSourcePack, 5000);
}

function submitOnEnter(event) {
  if (event.target.tagName !== "TEXTAREA" || event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }
  event.preventDefault();
  if (elements.facilBudInput.value.trim()) {
    elements.facilBudForm.requestSubmit();
  }
}

function createRoom(event) {
  event.preventDefault();
  const roomName = elements.managedRoomName.value.trim();
  fetch("/api/facilitator/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: roomName })
  })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to start room");
      elements.roomInput.value = roomName;
      renderRooms(result.body.rooms);
      setConnectionStatus("Room ready");
    })
    .catch(function (error) { setConnectionStatus(error.message); });
}

function allocateParticipant(event) {
  event.preventDefault();
  fetch("/api/facilitator/allocation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: elements.allocationParticipant.value.trim(),
      display_name: elements.allocationName.value.trim(),
      room_name: elements.allocationRoom.value
    })
  })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to allocate participant");
      elements.allocationParticipant.value = "";
      elements.allocationName.value = "";
      renderRooms(result.body.rooms);
    })
    .catch(function (error) { setConnectionStatus(error.message); });
}

function refreshRooms() {
  fetch("/api/facilitator/rooms")
    .then(function (response) { return response.json(); })
    .then(function (payload) { renderRooms(payload.rooms || []); })
    .catch(function () { elements.roomList.textContent = "Room management unavailable"; });
}

function refreshSourcePack() {
  const roomName = elements.roomInput.value.trim() || "bud-demo-room";
  fetch("/api/facilitator/source-pack?room=" + encodeURIComponent(roomName))
    .then(function (response) { return response.json(); })
    .then(renderSourcePack)
    .catch(function () { elements.sourcePackStatus.textContent = "Source Pack unavailable"; });
}

function uploadSourceMaterial(event) {
  event.preventDefault();
  const file = elements.sourcePackFile.files[0];
  if (!file) {
    elements.sourcePackStatus.textContent = "Choose a .pptx, .pdf, or .docx file first.";
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    elements.sourcePackStatus.textContent = "Source files must be 15 MB or smaller.";
    return;
  }
  elements.sourcePackStatus.textContent = "Reading " + file.name + "...";
  const reader = new FileReader();
  reader.onload = function () {
    const contentBase64 = String(reader.result).split(",")[1] || "";
    fetch("/api/facilitator/source-material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_name: elements.roomInput.value.trim() || "bud-demo-room",
        filename: file.name,
        mime_type: file.type,
        content_base64: contentBase64,
        uploaded_by: "facilitator-1"
      })
    })
      .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error(result.body.error || "Unable to upload source");
        elements.sourcePackFile.value = "";
        elements.sourcePackStatus.textContent = "Uploaded. Activate the new version when ready.";
        renderSourcePack(result.body.source_pack);
      })
      .catch(function (error) { elements.sourcePackStatus.textContent = error.message; });
  };
  reader.onerror = function () { elements.sourcePackStatus.textContent = "Unable to read this file."; };
  reader.readAsDataURL(file);
}

function activateSourcePack(version) {
  fetch("/api/facilitator/source-pack/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: elements.roomInput.value.trim() || "bud-demo-room", version: version })
  })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to activate Source Pack");
      renderSourcePack(result.body.source_pack);
      elements.sourcePackStatus.textContent = "Source Pack version " + version + " is active for Bud.";
    })
    .catch(function (error) { elements.sourcePackStatus.textContent = error.message; });
}

function renderSourcePack(sourcePack) {
  const versions = sourcePack.versions || [];
  elements.sourcePackList.innerHTML = "";
  if (!versions.length) {
    elements.sourcePackStatus.textContent = "No source pack uploaded yet.";
    return;
  }
  elements.sourcePackStatus.textContent = sourcePack.active_version
    ? "Active Source Pack version: " + sourcePack.active_version
    : "Draft Source Pack ready for activation.";
  versions.slice().reverse().forEach(function (version) {
    const item = document.createElement("article");
    item.className = "source-pack-item" + (version.status === "active" ? " active" : "");
    const title = document.createElement("strong");
    title.textContent = "Version " + version.version + (version.status === "active" ? " (active)" : " (" + version.status + ")");
    item.appendChild(title);
    const details = document.createElement("span");
    details.textContent = version.materials.map(function (material) {
      return material.filename + " - " + material.chunk_count + " extracted section(s)";
    }).join("; ");
    item.appendChild(details);
    if (version.status !== "active") {
      const button = document.createElement("button");
      button.className = "secondary-action";
      button.type = "button";
      button.textContent = "Activate version";
      button.addEventListener("click", function () { activateSourcePack(version.version); });
      item.appendChild(button);
    }
    elements.sourcePackList.appendChild(item);
  });
}

function renderRooms(rooms) {
  elements.allocationRoom.innerHTML = "";
  elements.roomList.innerHTML = "";
  rooms.forEach(function (room) {
    const option = document.createElement("option");
    option.value = room.room_name;
    option.textContent = room.room_name;
    elements.allocationRoom.appendChild(option);

    const item = document.createElement("article");
    item.className = "room-item";
    const title = document.createElement("strong");
    title.textContent = room.room_name;
    item.appendChild(title);
    const allocationText = room.allocations.length
      ? room.allocations.map(function (allocation) { return allocation.display_name + " (" + allocation.participant_id + ")"; }).join(", ")
      : "No participant allocations; open demo access";
    const detail = document.createElement("span");
    detail.textContent = allocationText;
    item.appendChild(detail);
    elements.roomList.appendChild(item);
  });
}

function scanRoom() {
  elements.scanButton.disabled = true;
  fetch("/api/facilitator/observe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  })
    .then(function (response) { return response.json(); })
    .then(function (payload) { renderState(payload.state); })
    .catch(function () { setConnectionStatus("Unable to scan room"); })
    .then(function () { elements.scanButton.disabled = false; });
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
      participant_id: "facilitator-1",
      name: "Teacher",
      role: "facilitator"
    })
  })
    .then(function (response) {
      return response.json().then(function (body) { return { ok: response.ok, body: body }; });
    })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to get facilitator token");
      livekitRoom = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
      livekitRoom.on(window.LivekitClient.RoomEvent.TrackSubscribed, function (track, publication, participant) { renderRemoteMedia(track, publication, participant); });
      livekitRoom.on(window.LivekitClient.RoomEvent.TrackUnsubscribed, function (track, publication) { removeMediaTrack(track, publication); });
      livekitRoom.on(window.LivekitClient.RoomEvent.ParticipantConnected, function (participant) {
        if (participant.identity.indexOf("facilitator") !== 0) {
          connectedLearners[participant.identity] = { name: participant.name || participant.identity, identity: participant.identity };
          appendRoomMessage((participant.name || participant.identity) + " joined the workshop.");
          renderConnectedLearners();
        }
      });
      livekitRoom.on(window.LivekitClient.RoomEvent.ParticipantDisconnected, function (participant) {
        delete connectedLearners[participant.identity];
        appendRoomMessage((participant.name || participant.identity) + " left the workshop.");
        renderConnectedLearners();
      });
      return livekitRoom.connect(result.body.url, result.body.token);
    })
    .then(function () {
      Object.keys(livekitRoom.remoteParticipants).forEach(function (identity) {
        const participant = livekitRoom.remoteParticipants[identity];
        if (identity.indexOf("facilitator") !== 0) {
          connectedLearners[identity] = { name: participant.name || identity, identity: identity };
        }
      });
      setConnectionStatus("Connected");
      elements.connectButton.textContent = "Connected";
      elements.microphoneButton.disabled = false;
      elements.cameraButton.disabled = false;
      elements.screenButton.disabled = false;
      elements.participantPermissionButton.disabled = false;
      refreshMediaState();
      reportTopviewPresence(true, false);
      renderConnectedLearners();
      startCaptionFeed();
      // Captions cover the whole call, so start listening on join rather than waiting
      // for a press. The button now mutes rather than starts.
      startFacilitatorMicrophone();
    })
    .catch(function (error) {
      setConnectionStatus(error.message);
      elements.connectButton.disabled = false;
    });
}

function mediaRequest(endpoint, body) {
  return fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (response) { return response.json().then(function (payload) { return { ok: response.ok, payload: payload }; }); });
}

function refreshMediaState() {
  fetch("/api/livekit/media?room=" + encodeURIComponent(elements.roomInput.value.trim())).then(function (response) { return response.json(); }).then(function (state) {
    elements.participantPermissionButton.textContent = state.participant_screen_share_enabled ? "Disable participant screen sharing" : "Allow participant screen sharing";
    elements.screenButton.textContent = state.active_screen_share && state.active_screen_share.participant_id === "facilitator-1" ? "Stop sharing" : "Share screen + audio";
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
  const isSelf = participant.identity === "facilitator-1";
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

function toggleFacilitatorCamera() {
  if (!livekitRoom) return;
  const enabled = livekitRoom.localParticipant.isCameraEnabled;
  livekitRoom.localParticipant.setCameraEnabled(!enabled).then(function () {
    elements.cameraButton.textContent = enabled ? "Start camera" : "Stop camera";
    if (!enabled) {
      const publication = livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Camera);
      if (publication && publication.track) {
        // Own-camera preview: silent, so the teacher is never played back to themselves.
        const preview = publication.track.attach();
        preview.muted = true;
        elements.mediaStrip.appendChild(preview);
      }
    }
  }).catch(function (error) { setConnectionStatus("Camera unavailable: " + error.message); });
}

function toggleFacilitatorScreen() {
  if (!livekitRoom) return;
  const sharing = Boolean(livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.ScreenShare));
  const body = { room_name: elements.roomInput.value.trim(), participant_id: "facilitator-1", display_name: "Teacher", role: "facilitator" };
  mediaRequest(sharing ? "/api/livekit/media/release" : "/api/livekit/media/claim", body).then(function (result) {
    if (!result.ok) throw new Error(result.payload.error || "Screen sharing is unavailable");
    return livekitRoom.localParticipant.setScreenShareEnabled(!sharing, { audio: true });
  }).then(function () { elements.screenButton.textContent = sharing ? "Share screen + audio" : "Stop sharing"; refreshMediaState(); }).catch(function (error) { elements.mediaStatus.textContent = error.message; });
}

function toggleParticipantPermission() {
  const enabled = elements.participantPermissionButton.textContent.indexOf("Disable") === -1;
  mediaRequest("/api/facilitator/media-permission", { room_name: elements.roomInput.value.trim(), enabled: enabled }).then(function (result) {
    if (!result.ok) throw new Error(result.payload.error || "Unable to change media permission");
    elements.participantPermissionButton.textContent = enabled ? "Disable participant screen sharing" : "Allow participant screen sharing";
  }).catch(function (error) { setConnectionStatus(error.message); });
}


function toggleFacilitatorMicrophone() {
  if (!livekitRoom) return;
  if (facilitatorSpeechActive) {
    muteFacilitatorMicrophone();
  } else {
    startFacilitatorMicrophone();
  }
}

function startFacilitatorMicrophone() {
  if (!livekitRoom) return;
  livekitRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function () {
      elements.microphoneButton.textContent = "Mute microphone";
      elements.microphoneButton.disabled = false;
      elements.microphoneStatus.textContent = "Captioning everything you say...";
      reportTopviewPresence(true, true);
      startFacilitatorMicMeter();
      startFacilitatorSpeechCapture();
      appendRoomMessage("Your microphone is live and being captioned for the room.");
    })
    .catch(function (error) {
      setConnectionStatus("Microphone unavailable: " + error.message);
    });
}

function muteFacilitatorMicrophone() {
  facilitatorSpeechActive = false;
  if (facilitatorSpeechRecorder && facilitatorSpeechRecorder.state === "recording") facilitatorSpeechRecorder.stop();
  stopFacilitatorVad();
  if (livekitRoom) livekitRoom.localParticipant.setMicrophoneEnabled(false).catch(function () {});
  if (facilitatorMicAnalyserFrame) {
    window.cancelAnimationFrame(facilitatorMicAnalyserFrame);
    facilitatorMicAnalyserFrame = null;
  }
  Array.prototype.forEach.call(elements.microphoneMeter.children, function (bar) { bar.classList.remove("active"); });
  elements.microphoneButton.textContent = "Unmute microphone";
  elements.microphoneStatus.textContent = "Microphone muted";
  reportTopviewPresence(true, false);
  flushFacilitatorSentence();
  appendRoomMessage("Your microphone is muted. Learners are still captioned.");
}

// Tells the server the facilitator has started speaking again, before any of that
// audio has been transcribed. Without it the server cannot tell someone who has
// finished from someone whose next words are still queued behind the transcriber.
// Failures are ignored: at worst a held sentence is published slightly early.
function reportFacilitatorSpeaking() {
  fetch("/api/transcribe/speaking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: "facilitator-1",
      speech_sequence: facilitatorSpeechSequence
    })
  }).catch(function () {});
}

// Whatever fragment the server is still holding gets closed out, so a trailing
// half-sentence is not stranded in the buffer when the facilitator mutes.
function flushFacilitatorSentence() {
  fetch("/api/transcribe/flush", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: "facilitator-1",
      room_name: elements.roomInput.value.trim(),
      native_language: elements.nativeLanguageInput.value,
      target_language: elements.nativeLanguageInput.value
    })
  }).catch(function () {});
}

function reportTopviewPresence(connected, microphoneActive) {
  fetch("/api/topview/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connected: connected,
      participant_id: "facilitator-1",
      display_name: "Teacher",
      role: "facilitator",
      room_name: elements.roomInput.value.trim(),
      language: elements.nativeLanguageInput.value,
      microphone_active: microphoneActive
    })
  }).catch(function () {});
}

function startFacilitatorMicMeter() {
  if (!window.AudioContext) return;
  const publication = livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Microphone);
  const publishedTrack = publication && publication.track && publication.track.mediaStreamTrack;
  if (!publishedTrack) return;
  const audioContext = new window.AudioContext();
  const source = audioContext.createMediaStreamSource(new MediaStream([publishedTrack]));
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const bars = Array.prototype.slice.call(elements.microphoneMeter.children);

  function renderMeter() {
    analyser.getByteFrequencyData(data);
    let total = 0;
    data.forEach(function (value) { total += value; });
    const level = Math.min(1, total / data.length / 48);
    bars.forEach(function (bar, index) {
      const threshold = (index + 1) / bars.length;
      bar.classList.toggle("active", level >= threshold * 0.72);
    });
    facilitatorMicAnalyserFrame = window.requestAnimationFrame(renderMeter);
  }

  if (facilitatorMicAnalyserFrame) window.cancelAnimationFrame(facilitatorMicAnalyserFrame);
  renderMeter();
}

function startFacilitatorSpeechCapture() {
  if (!window.MediaRecorder || facilitatorSpeechActive) return;
  const publication = livekitRoom.localParticipant.getTrackPublication(window.LivekitClient.Track.Source.Microphone);
  const mediaTrack = publication && publication.track && publication.track.mediaStreamTrack;
  const streamPromise = mediaTrack
    ? Promise.resolve(new MediaStream([mediaTrack]))
    : navigator.mediaDevices.getUserMedia({ audio: true });
  streamPromise.then(function (stream) {
    facilitatorSpeechStream = stream;
    facilitatorSpeechActive = true;
    startFacilitatorVad(stream);
    recordFacilitatorSpeechChunk();
  }).catch(function (error) {
    setConnectionStatus("Facilitator speech capture unavailable: " + error.message);
  });
}

// Cuts each chunk at a pause instead of on a fixed 4 second timer, so the recorder
// restart gap lands in silence and Whisper receives whole phrases.
function startFacilitatorVad(stream) {
  stopFacilitatorVad();
  facilitatorVadEnabled = false;
  if (!window.AudioContext) return;
  facilitatorVadContext = new window.AudioContext();
  facilitatorVadAnalyser = facilitatorVadContext.createAnalyser();
  facilitatorVadAnalyser.fftSize = 256;
  facilitatorVadContext.createMediaStreamSource(stream).connect(facilitatorVadAnalyser);
  facilitatorVadData = new Uint8Array(facilitatorVadAnalyser.frequencyBinCount);
  facilitatorVadEnabled = true;

  facilitatorVadTimer = window.setInterval(function () {
    if (!facilitatorSpeechActive) return;
    facilitatorVadAnalyser.getByteFrequencyData(facilitatorVadData);
    let total = 0;
    facilitatorVadData.forEach(function (value) { total += value; });
    const level = total / facilitatorVadData.length / 48;
    const now = Date.now();

    if (level >= SPEECH_LEVEL_THRESHOLD) {
      // The server is told speech has restarted as soon as it is heard, long before
      // this chunk has been transcribed, so it can tell a facilitator who has finished
      // a sentence from one who is still in the middle of saying it.
      if (!facilitatorHeardInChunk) {
        facilitatorFirstHeardAt = now;
        reportFacilitatorSpeaking();
      }
      facilitatorHeardInChunk = true;
      facilitatorLastHeardAt = now;
    }

    if (!facilitatorSpeechRecorder || facilitatorSpeechRecorder.state !== "recording") return;
    const elapsed = now - facilitatorChunkStartedAt;

    if (facilitatorHeardInChunk) {
      if (now - facilitatorLastHeardAt >= SPEECH_PAUSE_MS || elapsed >= SPEECH_MAX_UTTERANCE_MS) {
        facilitatorSpeechRecorder.stop();
      }
    } else if (elapsed >= SPEECH_IDLE_RECYCLE_MS) {
      facilitatorSpeechRecorder.stop();
    }
  }, SPEECH_VAD_INTERVAL_MS);
}

function stopFacilitatorVad() {
  if (facilitatorVadTimer) {
    window.clearInterval(facilitatorVadTimer);
    facilitatorVadTimer = null;
  }
  if (facilitatorVadContext) {
    facilitatorVadContext.close().catch(function () {});
    facilitatorVadContext = null;
  }
  facilitatorVadAnalyser = null;
  facilitatorVadData = null;
}

function recordFacilitatorSpeechChunk() {
  if (!facilitatorSpeechActive) return;
  facilitatorSpeechRecorder = new MediaRecorder(facilitatorSpeechStream, { mimeType: "audio/webm" });
  facilitatorSpeechRecorder.ondataavailable = function (event) {
    // Silent chunks cost a round trip and make Whisper hallucinate filler text.
    if (facilitatorVadEnabled && !facilitatorHeardInChunk) return;
    if (!event.data || event.data.size === 0) return;
    const speechSequence = facilitatorSpeechSequence;
    const uploadedAt = Date.now();
    fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "audio/webm",
        "X-Participant-Id": "facilitator-1",
        "X-Room-Name": elements.roomInput.value.trim(),
        "X-Native-Language": elements.nativeLanguageInput.value,
        // Listeners now translate each turn into their own language from the room
        // transcript, so nothing needs translating on the speaker's behalf here.
        "X-Target-Language": elements.nativeLanguageInput.value,
        "X-Speech-Sequence": String(speechSequence),
        // When speech started and stopped inside this chunk, as ages rather than clock
        // times so the two machines' clocks never have to agree. The server measures
        // the pause between sentences from these instead of from arrival times, which
        // are stretched by however long transcription took.
        "X-Speech-Lead-Ms": String(Math.max(0, uploadedAt - (facilitatorFirstHeardAt || uploadedAt))),
        "X-Speech-Silence-Ms": String(Math.max(0, uploadedAt - (facilitatorLastHeardAt || uploadedAt)))
      },
      body: event.data
    }).then(function (response) {
      return response.json();
    }).then(function (payload) {
      if (payload.transcript && payload.transcript.ignored) {
        appendRoomMessage("Speech ignored because it was not detected as " + elements.nativeLanguageInput.options[elements.nativeLanguageInput.selectedIndex].text + ".");
        return;
      }
      if (payload.transcript && payload.transcript.text) {
        appendRoomMessage("Facilitator: " + payload.transcript.text);
      }
    }).catch(function () {
      setConnectionStatus("Whisper service unavailable");
    });
  };
  facilitatorSpeechRecorder.onstop = function () {
    if (facilitatorSpeechActive) recordFacilitatorSpeechChunk();
  };
  facilitatorHeardInChunk = false;
  facilitatorChunkStartedAt = Date.now();
  facilitatorLastHeardAt = facilitatorChunkStartedAt;
  facilitatorFirstHeardAt = 0;
  // Numbered as the chunk opens rather than as it uploads, so the "speaking now" ping
  // and the audio that follows carry the same number for the server to match up.
  facilitatorSpeechSequence += 1;
  facilitatorSpeechRecorder.start();
  if (!facilitatorVadEnabled) {
    // No Web Audio support: fall back to fixed-length chunking.
    window.setTimeout(function () {
      if (facilitatorSpeechRecorder && facilitatorSpeechRecorder.state === "recording") facilitatorSpeechRecorder.stop();
    }, 4000);
  }
}

// Polls the room transcript so this panel shows every speaker in the call, each line
// attributed by name and role.
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
      // The cursor only advances past captions the server has finished translating.
      // Anything after that is sent again next poll and replaced in place, so a slow
      // translation delays one line instead of holding up the whole panel.
      const nextAfter = Number(payload.next_after);
      if (isFinite(nextAfter) && nextAfter > latestCaptionSequence) {
        latestCaptionSequence = nextAfter;
      }
    })
    .catch(function () {});
}

// Draws a caption, or redraws one already on screen once its translation arrives.
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
  captionLabel.textContent = (entry.participant_id === "facilitator-1" ? "You" : entry.display_name) +
    (entry.role === "facilitator" ? " (facilitator)" : " (learner)");
  const captionTime = document.createElement("time");
  captionTime.className = "caption-time";
  const spokenAt = new Date(entry.created_at);
  captionTime.dateTime = spokenAt.toISOString();
  captionTime.textContent = spokenAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  captionHead.appendChild(captionLabel);
  captionHead.appendChild(captionTime);
  item.appendChild(captionHead);

  // The facilitator reads the line in their own language first, with the learner's
  // actual words kept underneath.
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
    // Still with the translator: shown now in the speaker's own language rather than
    // held back, and replaced in place when the translation lands.
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

function refreshState() {
  fetch("/api/facilitator/state?room=" + encodeURIComponent(elements.roomInput.value.trim() || "bud-demo-room"))
    .then(function (response) { return response.json(); })
    .then(renderState)
    .catch(function () { setConnectionStatus("Bud server is not reachable"); });
}

function sendToFacilBud(event) {
  event.preventDefault();
  const text = elements.facilBudInput.value.trim();
  if (!text) return;
  elements.facilBudInput.value = "";
  fetch("/api/facilitator-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: elements.roomInput.value.trim(), text: text })
  })
    .then(function (response) { return response.json(); })
    .then(renderState)
    .catch(function () { setConnectionStatus("Facil-Bud is unavailable"); });
}

function renderState(state) {
  elements.title.textContent = "BUD AI Demo Workshop (Facilitator)";
  elements.phase.textContent = state.workshop.phase;
  elements.prompt.textContent = state.workshop.prompt;
  // The counts describe the chapter learners are currently answering about, so the
  // panel has to say which one that is.
  document.getElementById("rollup-chapter").textContent = state.current_chapter && state.current_chapter.label
    ? state.current_chapter.label
    : "Waiting for the first check-in";
  document.getElementById("green-count").textContent = state.rollup.green;
  document.getElementById("yellow-count").textContent = state.rollup.yellow;
  document.getElementById("red-count").textContent = state.rollup.red;
  document.getElementById("unknown-count").textContent = state.rollup.unknown;
  document.getElementById("room-report").textContent = state.room_report
    ? state.room_report.text
    : "Bud will provide an automatic room report when this view loads.";
  document.getElementById("most-flagged-point").textContent = state.rollup.most_flagged_recap_point
    ? "Hardest so far: " + state.rollup.most_flagged_recap_point + " (" + state.rollup.most_flagged_count + " flagged)"
    : "No chapter has been flagged yet.";
  document.getElementById("evidence-total").textContent = state.evidence_summary.total;
  document.getElementById("evidence-shared").textContent = state.evidence_summary.public_shared;
  document.getElementById("evidence-private").textContent = state.evidence_summary.private_withheld;
  renderParticipants(state.participants);
  renderSignals(state.facilitator_signals);
  renderFacilBudMessages(state.facil_bud_messages || []);
}

function renderFacilBudMessages(messages) {
  elements.facilBudMessages.innerHTML = "";
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Facil-Bud has not sent a private message yet.";
    elements.facilBudMessages.appendChild(empty);
    return;
  }
  messages.slice(-12).forEach(function (message) {
    const item = document.createElement("article");
    item.className = "facil-bud-message " + (message.sender === "facilitator" ? "message-user" : "message-bud");
    const sender = document.createElement("span");
    sender.className = "message-sender";
    sender.textContent = message.sender === "facilitator" ? "You" : "Facil-Bud";
    const text = document.createElement("div");
    text.textContent = message.text;
    item.appendChild(sender);
    item.appendChild(text);
    elements.facilBudMessages.appendChild(item);
  });
  elements.facilBudMessages.scrollTop = elements.facilBudMessages.scrollHeight;
}

function renderParticipants(participants) {
  const merged = {};
  participants.forEach(function (participant) { merged[participant.participant_id] = participant; });
  Object.keys(connectedLearners).forEach(function (participantId) {
    if (!merged[participantId]) {
      merged[participantId] = {
        participant_id: participantId,
        display_name: connectedLearners[participantId].name,
        participation: "present",
        comprehension: "unknown"
      };
    } else if (connectedLearners[participantId].name) {
      merged[participantId].display_name = connectedLearners[participantId].name;
    }
  });
  const list = Object.keys(merged).map(function (id) { return merged[id]; });
  elements.participantCount.textContent = list.length + (list.length === 1 ? " learner" : " learners");
  elements.participantList.innerHTML = "";
  elements.participantsEmpty.hidden = list.length > 0;
  list.forEach(function (participant) {
    const row = document.createElement("tr");
    row.innerHTML = "<td></td><td></td><td></td><td></td>";
    row.children[0].textContent = participant.display_name || participant.participant_id;
    row.children[1].textContent = participant.participation || "unknown";
    row.children[2].textContent = participant.comprehension || "unknown";
    const inviteButton = document.createElement("button");
    inviteButton.className = "secondary-action invite-button";
    inviteButton.type = "button";
    inviteButton.textContent = "Invite to talk";
    inviteButton.addEventListener("click", function () {
      inviteParticipant(participant);
    });
    row.children[3].appendChild(inviteButton);
    elements.participantList.appendChild(row);
  });
}

function inviteParticipant(participant) {
  fetch("/api/facilitator-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: participant.participant_id,
      display_name: participant.display_name || participant.participant_id
    })
  })
    .then(function (response) { return response.json(); })
    .then(function (payload) { renderState(payload.state); })
    .catch(function () { setConnectionStatus("Unable to invite learner"); });
}

function renderConnectedLearners() {
  const current = Object.keys(connectedLearners).map(function (id) { return connectedLearners[id].name; });
  if (current.length) appendRoomMessage("Learners connected: " + current.join(", "));
}

function renderSignals(signals) {
  elements.signals.innerHTML = "";
  if (!signals.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No facilitator signals yet.";
    elements.signals.appendChild(empty);
    return;
  }
  signals.slice().reverse().forEach(function (signal) {
    const item = document.createElement("article");
    item.className = "signal";
    item.textContent = "[" + signal.severity + "] " + signal.summary;
    elements.signals.appendChild(item);
  });
}

function setConnectionStatus(text) { elements.connectionStatus.textContent = text; }

function appendRoomMessage(text) {
  const item = document.createElement("div");
  item.textContent = text;
  elements.roomFeed.appendChild(item);
}

boot();
