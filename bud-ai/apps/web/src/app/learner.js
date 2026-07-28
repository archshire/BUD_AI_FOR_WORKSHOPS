(function () {
  const tabs = Array.prototype.slice.call(document.querySelectorAll("[data-learner-tab]"));
  const breakoutView = document.querySelector("#breakout-view");
  const promptBand = document.querySelector(".prompt-band");
  const roomControls = document.querySelector(".room-controls");
  const roomFeed = document.querySelector("#room-feed");
  const workshopSections = Array.prototype.slice.call(document.querySelectorAll(".workshop-docs-layout, .public-captions-panel, .activity, .shared-room"));
  const messages = document.querySelector("#breakout-messages");
  const members = document.querySelector("#breakout-members");
  const roomStatus = document.querySelector("#breakout-room-status");
  const chatForm = document.querySelector("#breakout-chat-form");
  const chatInput = document.querySelector("#breakout-chat-input");
  const activation = document.querySelector("#learner-activation");
  const activateButton = document.querySelector("#activate-learner-bud");
  const setupNativeLanguage = document.querySelector("#setup-native-language");
  const setupConnectMic = document.querySelector("#setup-connect-mic");
  const setupTestMic = document.querySelector("#setup-test-mic");
  const setupMicMeter = document.querySelector("#setup-mic-meter");
  const setupMicMessage = document.querySelector("#setup-mic-message");
  const setupMicState = document.querySelector("#setup-mic-state");
  const setupDocsTest = document.querySelector("#setup-docs-test");
  const setupDocsMessage = document.querySelector("#setup-docs-message");
  const setupDocsState = document.querySelector("#setup-docs-state");
  const setupPrivacy = document.querySelector("#setup-privacy");
  const setupPrivacyState = document.querySelector("#setup-privacy-state");
  const setupConnectionStatus = document.querySelector("#connection-status");
  const mainNativeLanguage = document.querySelector("#native-language-input");
  const mainConnectButton = document.querySelector("#connect-button");
  const mainMicrophoneButton = document.querySelector("#microphone-button");
  const budPanel = document.querySelector("#learner-bud-panel");
  const publicCaptionList = document.querySelector("#caption-list");
  const breakoutCaptionList = document.querySelector("#breakout-caption-list");
  const clearPublicCaptions = document.querySelector("#clear-captions");
  const clearBreakoutCaptions = document.querySelector("#clear-breakout-captions");
  const query = new URLSearchParams(window.location.search);
  const participantStorageKey = "bud-learner-participant-id";
  const participantId = query.get("participant_id") || window.sessionStorage.getItem(participantStorageKey) ||
    "learner-" + Math.random().toString(36).slice(2, 10);
  if (!query.get("participant_id")) window.sessionStorage.setItem(participantStorageKey, participantId);
  const displayName = query.get("name") || "Learner";
  let breakoutGroupId = "group-main";
  let breakoutMemberNames = {};
  let lastCaptionBreakoutGroupId = "group-main";
  let publicCaptionFeed = null;
  let breakoutCaptionFeed = null;
  const activationKey = "bud-learner-activated-" + participantId;
  let setupMicReady = false;
  let setupDocsReady = false;
  const runtimeRoomInput = document.querySelector("#room-input");
  const runtimeNameInput = document.querySelector("#name-input");
  if (runtimeRoomInput) runtimeRoomInput.value = query.get("room") || "BUD-101";
  if (runtimeNameInput) runtimeNameInput.value = displayName;

  function reportLearnerPresence(connected, microphoneActive) {
    const roomName = new URLSearchParams(window.location.search).get("room") || "BUD-101";
    fetch("/api/topview/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        connected: connected,
        participant_id: participantId,
        display_name: displayName,
        role: "learner",
        room_name: roomName,
        language: (document.querySelector("#native-language-input") || setupNativeLanguage || {}).value || "en",
        microphone_active: Boolean(microphoneActive)
      })
    }).catch(function () {});
  }

  function updateSetupGate() {
    const privacyReady = Boolean(setupPrivacy && setupPrivacy.checked);
    if (activateButton) activateButton.disabled = !(setupMicReady && setupDocsReady && privacyReady);
    if (setupPrivacyState) setupPrivacyState.textContent = privacyReady ? "Confirmed" : "Required";
  }

  if (setupNativeLanguage && mainNativeLanguage) {
    setupNativeLanguage.addEventListener("change", function () {
      mainNativeLanguage.value = setupNativeLanguage.value;
      replayCaptionFeeds();
    });
    mainNativeLanguage.value = setupNativeLanguage.value;
  }
  if (setupPrivacy) setupPrivacy.addEventListener("change", updateSetupGate);
  if (setupConnectMic) setupConnectMic.addEventListener("click", function () {
    if (mainConnectButton) mainConnectButton.click();
    if (setupMicMessage) setupMicMessage.textContent = "Connecting to the workshop for the microphone test...";
  });
  if (setupTestMic) setupTestMic.addEventListener("click", function () {
    if (setupMicReady && mainMicrophoneButton && mainMicrophoneButton.textContent === "Stop talking") {
      mainMicrophoneButton.click();
      setupTestMic.textContent = "Mic ready";
      if (setupMicMessage) setupMicMessage.textContent = "Microphone test complete. Your microphone is ready and currently off.";
      return;
    }
    if (mainMicrophoneButton) mainMicrophoneButton.click();
    window.setTimeout(function () {
      const listening = mainMicrophoneButton && mainMicrophoneButton.textContent === "Stop talking";
      if (listening) {
        setupMicReady = true;
        if (setupMicState) setupMicState.textContent = "Passed";
        if (setupMicMessage) setupMicMessage.textContent = "Microphone captured and published. Confirm audibility from another connected client.";
        setupTestMic.textContent = "Stop test";
      } else if (setupMicMessage) {
        setupMicMessage.textContent = "Microphone test could not start. Check browser permission and use localhost or HTTPS.";
      }
      updateSetupGate();
    }, 350);
  });
  window.setInterval(function () {
    const connected = setupConnectionStatus && setupConnectionStatus.textContent === "Connected";
    if (setupConnectMic) {
      setupConnectMic.textContent = connected ? "Connected for test" : "Connect for test";
      setupConnectMic.disabled = connected;
    }
    if (setupTestMic) setupTestMic.disabled = !connected;
    if (setupMicMeter && document.querySelector("#mic-meter")) {
      Array.prototype.forEach.call(setupMicMeter.children, function (bar, index) {
        const sourceBar = document.querySelector("#mic-meter").children[index];
        if (sourceBar) {
          bar.className = sourceBar.className;
          bar.style.height = sourceBar.style.height;
        }
      });
    }
  }, 250);
  if (setupDocsTest) setupDocsTest.addEventListener("click", function () {
    const room = (document.querySelector("#room-input") || {}).value || query.get("room") || "BUD-101";
    setupDocsTest.disabled = true;
    setupDocsMessage.textContent = "Checking the workshop material...";
    fetch("/api/workshop-material?room=" + encodeURIComponent(room))
      .then(function (response) { return response.json().then(function (payload) { return { ok: response.ok, payload: payload }; }); })
      .then(function (result) {
        const pages = result.payload.pages || [];
        setupDocsReady = result.ok && pages.length > 0;
        setupDocsState.textContent = setupDocsReady ? "Passed" : "Needs attention";
        setupDocsMessage.textContent = setupDocsReady ? "Workshop material is available. You can navigate its pages after entering." : "No workshop documents are available yet. Ask the Leader to publish the source material.";
      })
      .catch(function () {
        setupDocsState.textContent = "Needs attention";
        setupDocsMessage.textContent = "Could not check workshop material. Confirm that the room is ready and try again.";
      })
      .then(function () { setupDocsTest.disabled = false; updateSetupGate(); });
  });

  function activateBud() {
    window.sessionStorage.setItem(activationKey, "1");
    updateNavigationLock();
    ensureWorkshopAudioConnected();
    if (budPanel) budPanel.hidden = false;
    window.learnerBudGreeting = {
      message_id: "learner-bud-greeting",
      sender: "bud",
      text: "Hi " + displayName + ", I am your AI Bud. I am here to support your learning, help you understand the workshop material, and stay with you as you make progress. I hope you have a meaningful time of learning :)",
      created_at: new Date().toISOString()
    };
    if (activation) activation.hidden = true;
    showTab("bud");
  }

  function updateNavigationLock() {
    const activated = window.sessionStorage.getItem(activationKey) === "1";
    tabs.forEach(function (item) {
      const locked = !activated && item.dataset.learnerTab !== "setup";
      item.disabled = locked;
      item.setAttribute("aria-disabled", String(locked));
      item.classList.toggle("is-locked", locked);
      if (locked) item.title = "Complete SETUP before opening this space.";
      else item.removeAttribute("title");
    });
  }

  function showTab(tab) {
    if (tab === "dm") tab = "breakout";
    if (tab === "bud" && window.sessionStorage.getItem(activationKey) !== "1") tab = "setup";
    tabs.forEach(function (item) {
      const active = item.dataset.learnerTab === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    const allPages = [activation, promptBand, roomControls].concat(workshopSections, [roomFeed, breakoutView]).filter(Boolean);
    allPages.forEach(function (section) { section.hidden = true; });
    if (tab === "setup") {
      if (activation) activation.hidden = window.sessionStorage.getItem(activationKey) === "1";
      if (roomControls) roomControls.hidden = false;
    }
    if (tab === "workshop") {
      ensureWorkshopAudioConnected();
      if (promptBand) promptBand.hidden = false;
      workshopSections.forEach(function (section) { section.hidden = false; });
      if (roomFeed) roomFeed.hidden = false;
    }
    if (tab === "breakout" && breakoutView) {
      ensureWorkshopAudioConnected();
      breakoutView.hidden = false;
      refreshBreakout();
    }
    if (tab === "bud") document.querySelector(".bud-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      if (tab.disabled) return;
      showTab(tab.dataset.learnerTab);
    });
    tab.setAttribute("aria-selected", String(tab.classList.contains("is-active")));
  });

  function renderMessages(items) {
    if (!messages) return;
    messages.innerHTML = "";
    if (!items.length) {
      messages.innerHTML = '<p class="empty">No breakout messages yet.</p>';
      return;
    }
    items.slice(-30).forEach(function (item) {
      const card = document.createElement("article");
      card.className = "breakout-message";
      const sender = document.createElement("strong");
      sender.textContent = item.sender_id === participantId
        ? "You"
        : (item.sender_display_name || breakoutMemberNames[item.sender_id] || item.sender_id || "Room participant");
      const text = document.createElement("p");
      text.textContent = item.text;
      card.append(sender, text);
      messages.appendChild(card);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  function refreshBreakout() {
    Promise.all([
      fetch("/api/facilitator/rooms").then(function (response) { return response.json(); }),
      fetch("/api/state?participant_id=" + encodeURIComponent(participantId) + "&room=" + encodeURIComponent(query.get("room") || "BUD-101")).then(function (response) { return response.json(); })
    ]).then(function (results) {
      const rooms = results[0].rooms || [];
      const state = results[1];
      let allocation = null;
      // Guest display names can recur across sessions. Always resolve the
      // current participant ID before using a name-only legacy fallback.
      rooms.some(function (room) {
        const breakout = (room.breakout_assignments || []).find(function (assignment) {
          return (assignment.members || []).some(function (item) { return item.participant_id === participantId; });
        });
        if (breakout) {
          allocation = { room_name: room.room_name + " / " + breakout.group_id, allocations: breakout.members, group_id: breakout.group_id };
          return true;
        }
        return false;
      });
      if (!allocation) {
        rooms.some(function (room) {
          const breakout = (room.breakout_assignments || []).find(function (assignment) {
            return (assignment.members || []).some(function (item) { return !item.participant_id && item.display_name === displayName; });
          });
          if (breakout) {
            allocation = { room_name: room.room_name + " / " + breakout.group_id, allocations: breakout.members, group_id: breakout.group_id };
            return true;
          }
          return false;
        });
      }
      if (!allocation) {
        breakoutGroupId = "group-main";
        breakoutMemberNames = {};
        roomStatus.textContent = "Room not assigned";
        members.innerHTML = '<li class="empty">The Leader has not assigned you to a breakout room yet.</li>';
      } else {
        breakoutGroupId = allocation.group_id;
        roomStatus.textContent = allocation.room_name;
        const roomMembers = allocation.allocations || [];
        breakoutMemberNames = roomMembers.reduce(function (names, item) {
          if (item.participant_id) names[item.participant_id] = item.display_name || item.participant_id;
          return names;
        }, {});
        members.innerHTML = roomMembers.map(function (item) {
          return "<li>" + escapeHtml(item.display_name || item.participant_id) + "</li>";
        }).join("");
      }
      if (breakoutGroupId !== lastCaptionBreakoutGroupId) {
        lastCaptionBreakoutGroupId = breakoutGroupId;
        if (breakoutCaptionFeed) breakoutCaptionFeed.replay();
      }
      renderMessages((state.group_messages || []).filter(function (item) {
        return !item.target_id || item.target_id === breakoutGroupId;
      }));
    }).catch(function () {
      roomStatus.textContent = "Room status unavailable";
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character];
    });
  }

  if (chatForm) chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    const roomName = new URLSearchParams(window.location.search).get("room") || "BUD-101";
    fetch("/api/group-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_name: roomName, participant_id: participantId, sender_display_name: displayName, group_id: breakoutGroupId, text, language: document.querySelector("#native-language-input").value }) }).then(refreshBreakout);
  });
  if (chatInput && chatForm) chatInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (typeof chatForm.requestSubmit === "function") chatForm.requestSubmit();
    else chatForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  if (window.BudTalk && breakoutView) {
    window.BudTalk({
      button: document.querySelector("#breakout-talk"),
      status: document.querySelector("#breakout-talk-status"),
      participantId: participantId,
      getRoomName: function () { return new URLSearchParams(window.location.search).get("room") || "BUD-101"; },
      getGroupId: function () { return breakoutGroupId; },
      getDisplayName: function () { return displayName; },
      getNativeLanguage: function () { return (document.querySelector("#native-language-input") || {}).value || "en"; },
      getTargetLanguage: function () { return (document.querySelector("#language-input") || {}).value || "en"; },
      onPosted: refreshBreakout
    });
  }
  function roomName() {
    return query.get("room") || (document.querySelector("#room-input") || {}).value || "BUD-101";
  }

  function learnerLanguage() {
    return (document.querySelector("#native-language-input") || {}).value || "en";
  }

  function ensureWorkshopAudioConnected() {
    const connected = setupConnectionStatus && setupConnectionStatus.textContent === "Connected";
    if (!mainConnectButton || connected || mainConnectButton.disabled) return;
    mainConnectButton.click();
  }

  function replayCaptionFeeds() {
    if (publicCaptionFeed) publicCaptionFeed.replay();
    if (breakoutCaptionFeed) breakoutCaptionFeed.replay();
  }

  if (mainNativeLanguage) mainNativeLanguage.addEventListener("change", replayCaptionFeeds);

  if (window.BudCaptionFeed) {
    if (publicCaptionList) {
      publicCaptionFeed = window.BudCaptionFeed({
        list: publicCaptionList,
        clearButton: clearPublicCaptions,
        participantId: participantId,
        getRoomName: roomName,
        getGroupId: function () { return "group-main"; },
        getTargetLanguage: learnerLanguage,
        emptyText: "Captions will appear when someone speaks in the workshop."
      });
      publicCaptionFeed.start();
    }
    if (breakoutCaptionList) {
      breakoutCaptionFeed = window.BudCaptionFeed({
        list: breakoutCaptionList,
        clearButton: clearBreakoutCaptions,
        participantId: participantId,
        getRoomName: roomName,
        getGroupId: function () { return breakoutGroupId; },
        getTargetLanguage: learnerLanguage,
        emptyText: "Captions will appear when your breakout speaks."
      });
      breakoutCaptionFeed.start();
    }
  }
  if (activateButton) activateButton.addEventListener("click", activateBud);
  const activated = window.sessionStorage.getItem(activationKey) === "1";
  if (activated) {
    if (activation) activation.hidden = true;
    if (budPanel) budPanel.hidden = false;
    window.learnerBudGreeting = {
      message_id: "learner-bud-greeting",
      sender: "bud",
      text: "Hi " + displayName + ", I am your AI Bud. I am here to support your learning, help you understand the workshop material, and stay with you as you make progress. I hope you have a meaningful time of learning :)",
      created_at: new Date().toISOString()
    };
  }
  if (breakoutView) window.setInterval(refreshBreakout, 3000);
  updateNavigationLock();
  showTab(query.get("tab") || (activated ? "workshop" : "setup"));
  reportLearnerPresence(true, false);
  window.setInterval(function () { reportLearnerPresence(true, false); }, 10000);
  window.addEventListener("beforeunload", function () { reportLearnerPresence(false, false); });
}());
