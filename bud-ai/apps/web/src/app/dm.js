(function () {
  const view = document.querySelector("[data-dm-view]");
  if (!view) return;
  const roomInput = document.querySelector(view.dataset.roomInput || "#room-input");
  const participantId = view.dataset.participantId || new URLSearchParams(window.location.search).get("participant_id") || "facilitator-1";
  const contacts = document.querySelector("#dm-contacts");
  const messages = document.querySelector("#dm-messages");
  const form = document.querySelector("#dm-form");
  const input = document.querySelector("#dm-input");
  const status = document.querySelector("#dm-status");
  let selectedContact = "";

  function roomName() { return (roomInput && roomInput.value.trim()) || "BUD-101"; }
  function setStatus(text) { if (status) status.textContent = text; }
  function renderMessages(items) {
    messages.innerHTML = "";
    if (!items.length) { messages.innerHTML = '<p class="empty">No messages in this chat yet.</p>'; return; }
    items.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "dm-message " + (item.sender_id === participantId ? "is-mine" : "");
      const sender = document.createElement("strong");
      sender.textContent = item.sender_id === participantId ? "You" : item.sender_id;
      const body = document.createElement("p");
      body.textContent = item.text;
      card.append(sender, body);
      messages.appendChild(card);
    });
    messages.scrollTop = messages.scrollHeight;
  }
  function loadChat() {
    if (!selectedContact) { renderMessages([]); return; }
    fetch("/api/dm?room=" + encodeURIComponent(roomName()) + "&participant_id=" + encodeURIComponent(participantId) + "&contact_id=" + encodeURIComponent(selectedContact))
      .then(function (response) { return response.json(); }).then(function (body) { renderMessages(body.messages || []); });
  }
  function loadContacts() {
    fetch("/api/dm/contacts?room=" + encodeURIComponent(roomName()) + "&participant_id=" + encodeURIComponent(participantId))
      .then(function (response) { return response.json(); }).then(function (body) {
        contacts.innerHTML = "";
        if (!(body.contacts || []).length) { contacts.innerHTML = '<p class="empty">No workshop contacts yet.</p>'; return; }
        body.contacts.forEach(function (contact, index) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dm-contact";
          button.textContent = contact.display_name + (contact.role === "leader" ? " (Leader)" : "");
          button.addEventListener("click", function () {
            selectedContact = contact.participant_id;
            document.querySelectorAll(".dm-contact").forEach(function (item) { item.classList.remove("is-selected"); });
            button.classList.add("is-selected");
            loadChat();
          });
          contacts.appendChild(button);
          if (index === 0 && !selectedContact) button.click();
        });
      }).catch(function () { setStatus("Contacts unavailable."); });
  }
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!selectedContact || !text) { setStatus("Choose a contact and write a message first."); return; }
    input.value = "";
    const senderName = view.dataset.displayName || ((document.querySelector("#name-input") || {}).value || participantId);
    fetch("/api/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_name: roomName(), sender_id: participantId, recipient_id: selectedContact, sender_display_name: senderName, recipient_display_name: selectedContact, text: text, language: view.dataset.language || "en" }) })
      .then(function (response) { return response.json(); }).then(function (body) { renderMessages(body.messages || []); setStatus("Message sent."); });
  });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
  });
  loadContacts();
  window.setInterval(loadContacts, 5000);
}());
