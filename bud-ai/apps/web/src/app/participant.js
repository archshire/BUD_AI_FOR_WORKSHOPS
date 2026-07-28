const registeredTab = document.querySelector("#registered-tab");
const guestTab = document.querySelector("#guest-tab");
const registeredFields = document.querySelector("#registered-fields");
const guestFields = document.querySelector("#guest-fields");
const accessForm = document.querySelector("#access-form");
const accessStatus = document.querySelector("#access-status");

// Demo access codes resolve to managed room names only after the code is validated.
const WORKSHOP_CODES = {
  "BUD-101": "BUD-101"
};

function setAccessMode(mode) {
  const guest = mode === "guest";
  registeredTab.classList.toggle("is-active", !guest);
  guestTab.classList.toggle("is-active", guest);
  registeredTab.setAttribute("aria-selected", String(!guest));
  guestTab.setAttribute("aria-selected", String(guest));
  registeredFields.hidden = guest;
  guestFields.hidden = !guest;
  document.querySelector("#email-input").required = !guest;
  document.querySelector("#password-input").required = !guest;
  document.querySelector("#registered-name-input").required = !guest;
  document.querySelector("#guest-name-input").required = guest;
}

registeredTab.addEventListener("click", () => setAccessMode("registered"));
guestTab.addEventListener("click", () => setAccessMode("guest"));

accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const workshopCode = document.querySelector("#workshop-code-input").value.trim().toUpperCase();
  const guest = !guestFields.hidden;
  const name = guest
    ? document.querySelector("#guest-name-input").value.trim()
    : document.querySelector("#registered-name-input").value.trim();
  if (!workshopCode) {
    accessStatus.textContent = "Please enter your workshop code.";
    return;
  }
  if (!name) {
    accessStatus.textContent = "Please enter your name.";
    return;
  }

  const roomName = WORKSHOP_CODES[workshopCode];
  if (!roomName) {
    accessStatus.textContent = "Incorrect code. Please check your email for details!";
    return;
  }

  accessStatus.textContent = "Checking workshop readiness...";
  const participantId = (guest ? "guest-" : "learner-") + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 8);
  fetch("/api/facilitator/rooms", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Room service unavailable")))
    .then((payload) => {
      const matchingRoom = (payload.rooms || []).find((candidate) => candidate.room_name.toLowerCase() === roomName.toLowerCase());
      if (!matchingRoom) {
        accessStatus.textContent = "Room is not ready.";
        return;
      }
      if (!matchingRoom.ready) {
        accessStatus.textContent = "Room is not ready.";
        return;
      }
      const query = new URLSearchParams({ room: matchingRoom.room_name, name, participant_id: participantId, access: guest ? "guest" : "registered" });
      query.set("tab", "setup");
      window.location.href = `/learner?${query.toString()}`;
    })
    .catch(() => {
      accessStatus.textContent = "We could not check the room right now. Please try again.";
    });
});

setAccessMode("registered");
