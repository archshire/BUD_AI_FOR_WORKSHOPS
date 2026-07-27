const micConnect = document.querySelector("#mic-connect");
const micTest = document.querySelector("#mic-test");
const micMeter = document.querySelector("#mic-meter");
const docsTest = document.querySelector("#docs-test");
const privacy = document.querySelector("#privacy-consent");
const enterButton = document.querySelector("#enter-workshop");
const micState = document.querySelector("#mic-state");
const docsState = document.querySelector("#docs-state");
const privacyState = document.querySelector("#privacy-state");
const setupBudAvatar = document.querySelector("#setup-bud-avatar");
const setupBudName = document.querySelector("#setup-bud-name");
const query = new URLSearchParams(window.location.search);
document.querySelector("#room-chip").textContent = query.get("room") || "Workshop";

let micReady = false;
let docsReady = false;
let workshopRoom = null;
let micTestActive = false;
let micAnalyserFrame = null;

const learnerPalette = ["#6f9ee8", "#e8ad43", "#63b981", "#d875a0", "#4ca7a7"];
const learnerAvatars = [1, 2, 3, 4, 5, 6, 7, 8].map((number) => `/assets/bud-pics/bud-${number}.png`);

function assignLearnerIdentity() {
  const name = query.get("name") || "Learner";
  const backgroundKey = "bud-learner-background";
  const avatarKey = "bud-avatar-asset";
  let background = window.sessionStorage.getItem(backgroundKey);
  let avatar = window.sessionStorage.getItem(avatarKey);

  if (!learnerPalette.includes(background)) {
    background = learnerPalette[Math.floor(Math.random() * learnerPalette.length)];
    window.sessionStorage.setItem(backgroundKey, background);
  }
  if (!learnerAvatars.includes(avatar)) {
    avatar = learnerAvatars[Math.floor(Math.random() * learnerAvatars.length)];
    window.sessionStorage.setItem(avatarKey, avatar);
  }

  document.body.style.setProperty("--learner-wash", background);
  setupBudAvatar.src = avatar;
  setupBudName.textContent = `${name}'s Bud`;
}

function updateGate() {
  const ready = micReady && docsReady && privacy.checked;
  enterButton.disabled = !ready;
  privacyState.textContent = privacy.checked ? "Confirmed" : "Required";
}

function setMicMessage(text, isError) {
  const message = document.querySelector("#mic-message");
  message.textContent = text;
  message.classList.toggle("is-error", Boolean(isError));
}

micConnect.addEventListener("click", function () {
  if (!window.LivekitClient) {
    setMicMessage("LiveKit is unavailable. Start the workshop services and reload this page.", true);
    return;
  }
  micConnect.disabled = true;
  micConnect.textContent = "Connecting...";
  setMicMessage("Requesting workshop access for the microphone test...", false);
  const room = query.get("room") || "BUD-101";
  const participantId = query.get("participant_id") || "learner-test";
  const name = query.get("name") || "Learner";
  fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: room, participant_id: participantId, name, role: "participant" })
  })
    .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
    .then((result) => {
      if (!result.ok) throw new Error(result.body.error || "Unable to connect to the workshop");
      workshopRoom = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
      return workshopRoom.connect(result.body.url, result.body.token);
    })
    .then(() => {
      micConnect.textContent = "Connected for test";
      micTest.disabled = false;
      setMicMessage("Connected. Start the microphone test; another client can receive the published audio.", false);
    })
    .catch((error) => {
      micConnect.disabled = false;
      micConnect.textContent = "Connect for test";
      setMicMessage(error.message + " Check that the room is open and use localhost or HTTPS.", true);
    });
});

micTest.addEventListener("click", function () {
  if (!workshopRoom) return;
  if (micTestActive) {
    workshopRoom.localParticipant.setMicrophoneEnabled(false).then(function () {
      micTestActive = false;
      if (micAnalyserFrame) window.cancelAnimationFrame(micAnalyserFrame);
      micAnalyserFrame = null;
      Array.prototype.forEach.call(micMeter.children, function (bar) {
        bar.classList.remove("active");
        bar.style.height = "6px";
      });
      micTest.textContent = "Mic ready";
      setMicMessage("Microphone test complete. Your microphone is ready and currently off.", false);
    }).catch(function (error) {
      setMicMessage("Could not stop the microphone test: " + error.message, true);
    });
    return;
  }
  micTest.disabled = true;
  setMicMessage("Checking microphone capture and publishing the test track...", false);
  workshopRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function (publication) {
      micReady = true;
      micState.textContent = "Passed";
      micTestActive = true;
      micTest.disabled = false;
      micTest.textContent = "Stop test";
      setMicMessage("Microphone captured and published to the room. Confirm audibility from another connected client.", false);
      startMicMeter(publication);
      updateGate();
    })
    .catch(function (error) {
      micTest.disabled = false;
      micState.textContent = "Needs attention";
      setMicMessage("Microphone test failed: " + error.message + " Check browser permission and use localhost or HTTPS.", true);
      updateGate();
    });
});

function startMicMeter(publication) {
  const mediaTrack = publication && publication.track && publication.track.mediaStreamTrack;
  if (!mediaTrack || !window.AudioContext) return;
  const audioContext = new window.AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  const source = audioContext.createMediaStreamSource(new MediaStream([mediaTrack]));
  source.connect(analyser);
  const values = new Uint8Array(analyser.frequencyBinCount);
  const bars = Array.prototype.slice.call(micMeter.children);
  function draw() {
    analyser.getByteFrequencyData(values);
    const level = values.reduce((total, value) => total + value, 0) / values.length;
    const activeBars = Math.min(bars.length, Math.max(0, Math.round(level / 18)));
    bars.forEach(function (bar, index) {
      bar.classList.toggle("active", index < activeBars);
      bar.style.height = (6 + (index < activeBars ? Math.min(20, level / 8 + index * 1.5) : 0)) + "px";
    });
    micAnalyserFrame = window.requestAnimationFrame(draw);
  }
  if (micAnalyserFrame) window.cancelAnimationFrame(micAnalyserFrame);
  draw();
}

docsTest.addEventListener("click", () => {
  docsReady = true;
  docsState.textContent = "Passed";
  document.querySelector("#docs-message").textContent = "Workshop material is ready to open.";
  updateGate();
});

privacy.addEventListener("change", updateGate);
enterButton.addEventListener("click", () => {
  const room = query.get("room") || "BUD-101";
  const name = query.get("name") || "Learner";
  const participantId = query.get("participant_id") || "";
  const access = query.get("access") || "registered";
  window.location.href = `/learner?room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}&participant_id=${encodeURIComponent(participantId)}&access=${encodeURIComponent(access)}&ready=1`;
});
assignLearnerIdentity();
updateGate();
