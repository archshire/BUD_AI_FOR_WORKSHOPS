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
          "X-Display-Name": options.getDisplayName ? options.getDisplayName() : participantId,
          "X-Room-Name": options.getRoomName(),
          "X-Group-Id": options.getGroupId ? options.getGroupId() : "group-main",
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

  window.BudCaptionFeed = function (options) {
    const list = options.list;
    const clearButton = options.clearButton;
    const getRoomName = options.getRoomName;
    const getGroupId = options.getGroupId || function () { return "group-main"; };
    const getTargetLanguage = options.getTargetLanguage || function () { return "en"; };
    const currentParticipantId = options.participantId || "";
    const emptyText = options.emptyText || "Captions will appear when someone speaks.";
    const pollMs = options.pollMs || 900;
    let latestSequence = 0;
    let nodes = {};
    let timer = null;

    function start() {
      if (!list || timer) return;
      poll();
      timer = window.setInterval(poll, pollMs);
    }

    function stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    }

    function replay() {
      latestSequence = 0;
      clear();
      poll();
    }

    function poll() {
      if (!list) return;
      const roomName = getRoomName && getRoomName();
      if (!roomName) return;
      const query = "room=" + encodeURIComponent(roomName) +
        "&group_id=" + encodeURIComponent(getGroupId() || "group-main") +
        "&after=" + latestSequence +
        "&target=" + encodeURIComponent(getTargetLanguage() || "en");
      fetch("/api/transcript/live?" + query)
        .then(function (response) { return response.json(); })
        .then(function (payload) {
          (payload.entries || []).forEach(upsert);
          const nextAfter = Number(payload.next_after);
          if (isFinite(nextAfter) && nextAfter > latestSequence) latestSequence = nextAfter;
        })
        .catch(function () {});
    }

    function upsert(entry) {
      const existing = nodes[entry.entry_id];
      const item = build(entry);
      nodes[entry.entry_id] = item;
      if (existing && existing.parentNode) {
        existing.parentNode.replaceChild(item, existing);
        return;
      }
      const empty = list.querySelector(".empty");
      if (empty) empty.remove();
      list.appendChild(item);
      list.scrollTop = list.scrollHeight;
    }

    function build(entry) {
      const item = document.createElement("article");
      item.className = "caption";
      const head = document.createElement("div");
      head.className = "caption-head";
      const label = document.createElement("span");
      label.className = "caption-label";
      const isSelf = entry.participant_id === currentParticipantId;
      label.textContent = (isSelf ? "You" : entry.display_name || entry.participant_id || "Speaker") +
        (entry.role === "facilitator" ? " (facilitator)" : " (learner)");
      const time = document.createElement("time");
      time.className = "caption-time";
      const spokenAt = new Date(entry.created_at);
      time.dateTime = spokenAt.toISOString();
      time.textContent = spokenAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      head.appendChild(label);
      head.appendChild(time);
      item.appendChild(head);

      if (entry.translated_text) {
        const translated = document.createElement("p");
        translated.textContent = entry.translated_text;
        item.appendChild(translated);
        const original = document.createElement("p");
        original.className = "caption-original";
        original.textContent = entry.original_text;
        item.appendChild(original);
      } else {
        const originalOnly = document.createElement("p");
        originalOnly.textContent = entry.original_text;
        if (entry.translation_pending) originalOnly.className = "caption-untranslated";
        item.appendChild(originalOnly);
      }
      return item;
    }

    function clear() {
      if (!list) return;
      nodes = {};
      list.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = emptyText;
      list.appendChild(empty);
    }

    if (clearButton) clearButton.addEventListener("click", replay);
    return { start: start, stop: stop, replay: replay, poll: poll, clear: clear };
  };
}());
