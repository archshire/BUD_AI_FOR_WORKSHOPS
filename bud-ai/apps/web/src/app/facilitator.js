const elements = {
  title: document.getElementById("workshop-title"),
  phase: document.getElementById("phase"),
  prompt: document.getElementById("prompt-text"),
  connectionStatus: document.getElementById("connection-status"),
  roomInput: document.getElementById("room-input"),
  connectButton: document.getElementById("connect-button"),
  microphoneButton: document.getElementById("facilitator-microphone-button"),
  microphoneStatus: document.getElementById("facilitator-mic-status"),
  microphoneMeter: document.getElementById("facilitator-mic-meter"),
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
  roomList: document.getElementById("room-list")
  ,facilBudAvatar: document.getElementById("facil-bud-avatar")
};

let livekitRoom = null;
let connectedLearners = {};
let facilitatorSpeechRecorder = null;
let facilitatorSpeechStream = null;
let facilitatorSpeechActive = false;
let facilitatorSpeechSequence = 0;
let facilitatorMicAnalyserFrame = null;

function boot() {
  elements.connectButton.addEventListener("click", connectWorkshop);
  elements.microphoneButton.addEventListener("click", startFacilitatorMicrophone);
  elements.scanButton.addEventListener("click", scanRoom);
  elements.facilBudForm.addEventListener("submit", sendToFacilBud);
  elements.facilBudForm.addEventListener("keydown", submitOnEnter);
  elements.createRoomForm.addEventListener("submit", createRoom);
  elements.allocateForm.addEventListener("submit", allocateParticipant);
  refreshState();
  refreshRooms();
  window.setInterval(refreshState, 3000);
  window.setInterval(refreshRooms, 5000);
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
      reportTopviewPresence(true, false);
      renderConnectedLearners();
    })
    .catch(function (error) {
      setConnectionStatus(error.message);
      elements.connectButton.disabled = false;
    });
}

function startFacilitatorMicrophone() {
  if (!livekitRoom) return;
  livekitRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function () {
      elements.microphoneButton.textContent = "Microphone active";
      elements.microphoneButton.disabled = true;
      elements.microphoneStatus.textContent = "Microphone active; local Whisper capture active";
      reportTopviewPresence(true, true);
      startFacilitatorMicMeter();
      startFacilitatorSpeechCapture();
      appendRoomMessage("Facilitator microphone published; Bud is listening.");
    })
    .catch(function (error) {
      setConnectionStatus("Microphone unavailable: " + error.message);
    });
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
      language: "en",
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
    recordFacilitatorSpeechChunk();
  }).catch(function (error) {
    setConnectionStatus("Facilitator speech capture unavailable: " + error.message);
  });
}

function recordFacilitatorSpeechChunk() {
  if (!facilitatorSpeechActive) return;
  facilitatorSpeechRecorder = new MediaRecorder(facilitatorSpeechStream, { mimeType: "audio/webm" });
  facilitatorSpeechRecorder.ondataavailable = function (event) {
    if (!event.data || event.data.size === 0) return;
    const speechSequence = ++facilitatorSpeechSequence;
    fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "audio/webm",
        "X-Participant-Id": "facilitator-1",
        "X-Target-Language": "en",
        "X-Speech-Sequence": String(speechSequence)
      },
      body: event.data
    }).then(function (response) {
      return response.json();
    }).then(function (payload) {
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
  facilitatorSpeechRecorder.start();
  window.setTimeout(function () {
    if (facilitatorSpeechRecorder && facilitatorSpeechRecorder.state === "recording") facilitatorSpeechRecorder.stop();
  }, 4000);
}

function refreshState() {
  fetch("/api/facilitator/state")
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
    body: JSON.stringify({ text: text })
  })
    .then(function (response) { return response.json(); })
    .then(renderState)
    .catch(function () { setConnectionStatus("Facil-Bud is unavailable"); });
}

function renderState(state) {
  elements.title.textContent = "BUD AI Demo Workshop (Facilitator)";
  elements.phase.textContent = state.workshop.phase;
  elements.prompt.textContent = state.workshop.prompt;
  document.getElementById("green-count").textContent = state.rollup.green;
  document.getElementById("yellow-count").textContent = state.rollup.yellow;
  document.getElementById("red-count").textContent = state.rollup.red;
  document.getElementById("unknown-count").textContent = state.rollup.unknown;
  document.getElementById("room-report").textContent = state.room_report
    ? state.room_report.text
    : "Bud will provide an automatic room report when this view loads.";
  document.getElementById("most-flagged-point").textContent = state.rollup.most_flagged_recap_point
    ? "Most yellow/red reports: " + state.rollup.most_flagged_recap_point + " (" + state.rollup.most_flagged_count + ")"
    : "No yellow/red cluster identified yet.";
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
