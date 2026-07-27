const elements = {
  rooms: document.getElementById("rooms"),
  providers: document.getElementById("providers"),
  participants: document.getElementById("participants"),
  participantsEmpty: document.getElementById("participants-empty"),
  events: document.getElementById("events"),
  updated: document.getElementById("last-updated")
};

function refresh() {
  fetch("/api/topview/state")
    .then(function (response) { return response.json(); })
    .then(render)
    .catch(function () {
      document.getElementById("room-status").textContent = "Unavailable";
    });
}

function render(state) {
  document.getElementById("room-count").textContent = state.rooms.length;
  document.getElementById("participant-count").textContent = state.participants.length;
  document.getElementById("transcription-count").textContent = state.metrics.transcriptions;
  document.getElementById("last-total").textContent = formatMs(state.metrics.last_total_ms);
  document.getElementById("last-stt").textContent = formatMs(state.metrics.last_stt_ms);
  document.getElementById("last-translation").textContent = formatMs(state.metrics.last_translation_ms);
  document.getElementById("provider-errors").textContent = state.metrics.provider_errors;
  elements.updated.textContent = "Updated " + new Date(state.generated_at).toLocaleTimeString();
  renderRooms(state.rooms);
  renderProviders(state.providers);
  renderServices(state.services);
  renderParticipants(state.participants);
  renderEvents(state.events);
}

function renderServices(services) {
  const container = document.getElementById("services");
  container.innerHTML = "";
  Object.keys(services || {}).forEach(function (name) {
    const service = services[name];
    const item = document.createElement("article");
    item.className = "service-card " + (service.status === "healthy" ? "service-healthy" : "service-unhealthy");
    const title = document.createElement("strong");
    title.textContent = name.toUpperCase();
    const status = document.createElement("span");
    status.textContent = service.status;
    const detail = document.createElement("small");
    detail.textContent = service.detail + " / " + service.latency_ms + " ms";
    item.appendChild(title);
    item.appendChild(status);
    item.appendChild(detail);
    container.appendChild(item);
  });
}

function renderRooms(rooms) {
  elements.rooms.innerHTML = "";
  if (!rooms.length) return appendEmpty(elements.rooms, "No rooms created yet.");
  rooms.forEach(function (room) {
    const item = document.createElement("article");
    item.className = "topview-list-item";
    item.innerHTML = "<strong></strong><span></span>";
    item.children[0].textContent = room.room_name;
    item.children[1].textContent = room.connected_participants + " connected / " + room.allocations.length + " allocated";
    elements.rooms.appendChild(item);
  });
}

function renderProviders(providers) {
  elements.providers.innerHTML = "";
  Object.keys(providers).forEach(function (name) {
    const item = document.createElement("div");
    item.className = "provider-row";
    item.innerHTML = "<span></span><strong></strong>";
    item.children[0].textContent = name.toUpperCase();
    item.children[1].textContent = providers[name] ? "configured" : "not configured";
    item.children[1].className = providers[name] ? "ok" : "off";
    elements.providers.appendChild(item);
  });
}

function renderParticipants(participants) {
  elements.participants.innerHTML = "";
  elements.participantsEmpty.hidden = participants.length > 0;
  participants.forEach(function (participant) {
    const row = document.createElement("tr");
    [participant.display_name, participant.role, participant.room_name, participant.language,
      participant.microphone_active ? "active" : "off", new Date(participant.updated_at).toLocaleTimeString()]
      .forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
    elements.participants.appendChild(row);
  });
}

function renderEvents(events) {
  elements.events.innerHTML = "";
  events.slice(0, 5).forEach(function (event) {
    const item = document.createElement("div");
    item.className = "event-item";
    item.textContent = new Date(event.created_at).toLocaleTimeString() + "  " + event.type + "  " + (event.participant_id || "system") + (event.total_ms ? "  " + event.total_ms + "ms" : "");
    elements.events.appendChild(item);
  });
}

function appendEmpty(parent, text) {
  const item = document.createElement("p");
  item.className = "empty";
  item.textContent = text;
  parent.appendChild(item);
}

function formatMs(value) { return value === null || value === undefined ? "-" : value + " ms"; }

refresh();
window.setInterval(refresh, 2000);
