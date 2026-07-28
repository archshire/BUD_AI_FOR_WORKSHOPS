(function () {
  window.BudTalk = function (options) {
    const button = options.button;
    const status = options.status;
    let stream = null;
    let recorder = null;
    let chunks = [];
    let active = false;
    let timer = null;

    function setStatus(message) {
      if (status) status.textContent = message;
      if (options.onStatus) options.onStatus(message);
    }

    function setButtonState() {
      button.innerHTML = '<span class="talk-button-icon" aria-hidden="true">&#127908;</span><span>' + (active ? "Stop talking" : "Talk") + "</span>";
      button.classList.toggle("is-talking", active);
      button.setAttribute("aria-pressed", String(active));
    }

    function closeStream() {
      if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
      if (timer) window.clearTimeout(timer);
      timer = null;
    }

    function postUtterance(blob) {
      const participantId = options.participantId;
      const nativeLanguage = options.getNativeLanguage ? options.getNativeLanguage() : "en";
      const targetLanguage = options.getTargetLanguage ? options.getTargetLanguage() : nativeLanguage;
      setStatus("Transcribing and translating...");
      return fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "audio/webm",
          "X-Participant-Id": participantId,
          "X-Native-Language": nativeLanguage,
          "X-Target-Language": targetLanguage,
          "X-Speech-Sequence": String(Date.now())
        },
        body: blob
      }).then(function (response) {
        return response.json().then(function (payload) {
          if (!response.ok) throw new Error(payload.error || "Speech service unavailable");
          return payload;
        });
      }).then(function (payload) {
        const transcript = payload.transcript && payload.transcript.text;
        if (!transcript) {
          setStatus("I could not detect speech. Try again.");
          return;
        }
        const translated = payload.translation && payload.translation.translated_text;
        const text = translated && translated !== transcript
          ? "Original (" + nativeLanguage + "): " + transcript + "\nTranslation (" + targetLanguage + "): " + translated
          : transcript;
        return fetch("/api/group-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: options.getRoomName(),
            participant_id: participantId,
            sender_display_name: options.getDisplayName ? options.getDisplayName() : participantId,
            group_id: options.getGroupId ? options.getGroupId() : "group-main",
            text: text,
            language: nativeLanguage
          })
        }).then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) throw new Error(body.error || "Unable to post speech to the room");
            setStatus("Talk sent with translation.");
            if (options.onPosted) options.onPosted(body);
          });
        });
      });
    }

    function stop() {
      if (!active) return;
      active = false;
      setButtonState();
      if (recorder && recorder.state === "recording") recorder.stop();
      else closeStream();
      setStatus("Talk is off.");
    }

    function start() {
      if (active) return stop();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        setStatus("Talk is unavailable. Use localhost or HTTPS and allow microphone access.");
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (mediaStream) {
        stream = mediaStream;
        chunks = [];
        active = true;
        setButtonState();
        setStatus("Listening... press Stop talking when you finish.");
        const mimeType = window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
        recorder = new MediaRecorder(stream, { mimeType: mimeType });
        recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onerror = function () { setStatus("Talk failed. Please try again."); closeStream(); };
        recorder.onstop = function () {
          closeStream();
          const blob = new Blob(chunks, { type: mimeType });
          if (blob.size) postUtterance(blob).catch(function (error) { setStatus(error.message); });
        };
        recorder.start();
        timer = window.setTimeout(stop, 15000);
      }).catch(function (error) {
        setStatus("Microphone unavailable: " + error.message);
      });
    }

    button.addEventListener("click", start);
    setButtonState();
    return { start: start, stop: stop };
  };
}());
