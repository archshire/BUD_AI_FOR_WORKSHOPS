const connectButton = document.querySelector("#connect-mic-test");
const micButton = document.querySelector("#mic-test-button");
const micDetail = document.querySelector("#mic-test-detail");
const micCheck = document.querySelector("#mic-check");
const toolsStatus = document.querySelector("#tools-status");
const micMeter = document.querySelector("#mic-meter");
const sourceFiles = Array.prototype.slice.call(document.querySelectorAll(".source-file"));
const uploadSourceButtons = Array.prototype.slice.call(document.querySelectorAll(".upload-source-button"));
const sourceMaterialList = document.querySelector("#source-material-list");
const generatePlanButton = document.querySelector("#generate-plan-button");
const savePlanButton = document.querySelector("#save-plan-button");
const lockPlanButton = document.querySelector("#lock-plan-button");
const lockConfirmation = document.querySelector("#lock-confirmation");
const confirmLockButton = document.querySelector("#confirm-lock-button");
const cancelLockButton = document.querySelector("#cancel-lock-button");
const planTimer = document.querySelector("#plan-timer");
const sourceStatus = document.querySelector("#source-status");
const planLockHint = document.querySelector("#plan-lock-hint");
const learningPlanOutput = document.querySelector("#learning-plan-output");
const leaderNameInput = document.querySelector("#leader-name");
const leaderIdentity = document.querySelector("#leader-identity");
const learningFlowBox = document.querySelector("#learning-flow-box");
const budConfigBox = document.querySelector("#bud-config-box");
const leaderNativeLanguage = document.querySelector("#leader-native-language");
const launchLeaderBudButton = document.querySelector("#launch-leader-bud");
const budConfigStatus = document.querySelector("#bud-config-status");
const budConfigStatusText = document.querySelector("#bud-config-status-text");
const leaderBudPanel = document.querySelector("#leader-bud-panel");
const leaderBudTitle = document.querySelector("#leader-bud-title");
const leaderBudThinking = document.querySelector("#leader-bud-thinking");
const leaderBudThinkingText = leaderBudThinking.querySelector("span");
const leaderBudMessages = document.querySelector("#leader-bud-messages");
const leaderBudForm = document.querySelector("#leader-bud-form");
const leaderBudInput = document.querySelector("#leader-bud-input");
const roomNameInput = document.querySelector("#room-name");
const openLeaderRoomButton = document.querySelector("#open-leader-room");
const roomStatus = document.querySelector("#room-status");
const registeredParticipants = document.querySelector("#registered-participants");
const guestParticipants = document.querySelector("#guest-participants");
const attendanceSummary = document.querySelector("#attendance-summary");
const breakoutCount = document.querySelector("#breakout-count");
const randomBreakoutButton = document.querySelector("#random-breakout");
const manualBreakoutButton = document.querySelector("#manual-breakout");
const availableParticipants = document.querySelector("#available-participants");
const availableParticipantList = document.querySelector("#available-participant-list");
const breakoutRooms = document.querySelector("#breakout-rooms");
const roomChatMessages = document.querySelector("#room-chat-messages");
const roomChatForm = document.querySelector("#room-chat-form");
const roomChatInput = document.querySelector("#room-chat-input");
const roomTalkButton = document.querySelector("#room-talk");
const roomCaptionList = document.querySelector("#room-caption-list");
const clearRoomCaptions = document.querySelector("#clear-room-captions");
const leaderDocumentMeta = document.querySelector("#leader-document-meta");
const leaderDocumentLocation = document.querySelector("#leader-document-location");
const leaderDocumentPageNumber = document.querySelector("#leader-document-page-number");
const leaderDocumentPageHeading = document.querySelector("#leader-document-page-heading");
const leaderDocumentContent = document.querySelector("#leader-document-content");
const leaderDocumentPrevious = document.querySelector("#leader-document-previous");
const leaderDocumentNext = document.querySelector("#leader-document-next");
const livePlanEmpty = document.querySelector("#live-plan-empty");
const fullLearningPlan = document.querySelector("#full-learning-plan");
const reviewLockPlanButton = document.querySelector("#review-lock-plan-button");
const planReviewStatus = document.querySelector("#plan-review-status");
const planReviewMessage = document.querySelector("#plan-review-message");
const leaderLivePlanTasks = document.querySelector("#leader-live-plan-tasks");
const leaderLivePlanProgress = document.querySelector("#leader-live-plan-progress");
const roomInsightsSummary = document.querySelector("#room-insights-summary");
const taskInsightsList = document.querySelector("#task-insights-list");
let workshopRoom = null;
let sourcePackPreparedForSession = false;
let sourcePackPreparationPromise = null;
let planGenerationComplete = false;
let planLockComplete = false;
let roomPrepared = false;
let leaderBudLaunched = false;
let liveGuestParticipants = [];
let roomCaptionFeed = null;
let breakoutCaptionFeeds = {};
const sourceCategoryLabels = {
  slides: "Workshop slides",
  curriculum: "Curriculum and learning goals",
  teaching_notes: "Teaching notes and explanations",
  uncategorized: "Uncategorized legacy material"
};
const sourceCategoryUploadLabels = {
  slides: "Upload slides",
  curriculum: "Upload curriculum",
  teaching_notes: "Upload teaching notes"
};
let leaderWorkshopPages = [];
let leaderDocumentPageIndex = 0;
let leaderLearningPlan = "";
let leaderLearningPlanTasks = [];
let workshopPlanCards = [];
let leaderActiveTaskIndex = 0;
let leaderCompletedTaskIndexes = [];
let expandedLeaderTasks = {};
const demoRegisteredParticipants = [
  { name: "Aisha Rahman", email: "aisha.rahman@example.com", present: true },
  { name: "Daniel Tan", email: "daniel.tan@example.com", present: true },
  { name: "Elena Garcia", email: "elena.garcia@example.com", present: true },
  { name: "Farid Hassan", email: "farid.hassan@example.com", present: true },
  { name: "Grace Lim", email: "grace.lim@example.com", present: true },
  { name: "Hannah Wong", email: "hannah.wong@example.com", present: true },
  { name: "Ivan Petrov", email: "ivan.petrov@example.com", present: true },
  { name: "Jia Wei", email: "jia.wei@example.com", present: true },
  { name: "Kai Chen", email: "kai.chen@example.com", present: true },
  { name: "Lina Noor", email: "lina.noor@example.com", present: true },
  { name: "Marcus Lee", email: "marcus.lee@example.com", present: true },
  { name: "Ivy Johnson", email: "ivy.johnson@example.com", present: false },
  { name: "Noah Smith", email: "noah.smith@example.com", present: false },
  { name: "Priya Nair", email: "priya.nair@example.com", present: false }
];
const demoGuestParticipants = [
  { name: "Amir", present: true },
  { name: "Bea", present: true },
  { name: "Chloe", present: true },
  { name: "Darius", present: true },
  { name: "Mei", present: true },
  { name: "Sofia", present: true }
];
let micAnalyserFrame = null;
let micTestActive = false;
let leaderMicrophoneLive = false;
let leaderSpeechActive = false;
let leaderSpeechStream = null;
let leaderSpeechRecorder = null;
let leaderSpeechSequence = 0;
let leaderVadContext = null;
let leaderVadAnalyser = null;
let leaderVadData = null;
let leaderVadTimer = null;
let leaderVadEnabled = false;
let leaderHeardInChunk = false;
let leaderFirstHeardAt = 0;
let leaderLastHeardAt = 0;
let leaderChunkStartedAt = 0;
let planTimerInterval = null;
let planStartedAt = 0;
const SPEECH_LEVEL_THRESHOLD = 0.06;
const SPEECH_PAUSE_MS = 700;
const SPEECH_MAX_UTTERANCE_MS = 8000;
const SPEECH_IDLE_RECYCLE_MS = 6000;
const SPEECH_VAD_INTERVAL_MS = 50;

const queryRoomName = new URLSearchParams(window.location.search).get("room");
if (queryRoomName) roomNameInput.value = queryRoomName;

const sections = Array.prototype.slice.call(document.querySelectorAll(".leader-section"));
const tabs = Array.prototype.slice.call(document.querySelectorAll("nav a"));
tabs.forEach(function (tab) {
  tab.addEventListener("click", function (event) {
    event.preventDefault();
    if (tab.getAttribute("aria-disabled") === "true") return;
    const targetId = tab.getAttribute("href").slice(1);
    sections.forEach(function (section) { section.hidden = section.id !== targetId; });
    tabs.forEach(function (item) {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      if (selected) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    window.history.replaceState(null, "", "#" + targetId);
  });
});
const initialTarget = window.location.hash.slice(1);
const initialTab = tabs.find(function (tab) { return tab.getAttribute("href").slice(1) === initialTarget; });
if (initialTab) initialTab.click();

function leaderName() {
  return leaderNameInput.value.trim() || "Leader";
}

function leaderBudName() {
  return leaderName() + "'s BUD";
}

function updateLeaderIdentity() {
  leaderIdentity.textContent = leaderNameInput.value.trim()
    ? "Leader: " + leaderName() + " | Bud: " + leaderBudName()
    : "Enter your name to activate your Leader Bud.";
}

function updateSetupSequence() {
  const hasName = Boolean(leaderNameInput.value.trim());
  const micComplete = micCheck.classList.contains("is-complete");
  const learningReady = hasName && micComplete;
  connectButton.disabled = !hasName || Boolean(workshopRoom);
  if (!hasName && !micTestActive) micButton.disabled = true;
  learningFlowBox.classList.toggle("is-locked", !learningReady);
  learningFlowBox.setAttribute("aria-disabled", String(!learningReady));
  sourceFiles.concat(uploadSourceButtons, [generatePlanButton]).forEach(function (control) {
    control.disabled = !learningReady;
  });
  const hasGeneratedPlan = planGenerationComplete && Boolean(learningPlanOutput.value.trim());
  const planLocked = planLockComplete && Boolean(learningPlanOutput.readOnly && learningPlanOutput.value.trim());
  const budReady = roomPrepared;
  const workshopComplete = leaderLearningPlanTasks.length > 0 &&
    leaderLearningPlanTasks.every(function (_, index) {
      return leaderCompletedTaskIndexes.indexOf(index) !== -1;
    });
  budConfigBox.classList.toggle("is-locked", !budReady);
  budConfigBox.setAttribute("aria-disabled", String(!budReady));
  leaderNativeLanguage.disabled = !budReady;
  launchLeaderBudButton.disabled = !budReady || !leaderNativeLanguage.value || leaderBudLaunched;
  if (!budReady) {
    budConfigStatus.textContent = "Setup incomplete";
    budConfigStatusText.textContent = "Prepare the main workshop room before configuring your BUD.";
  } else if (!leaderBudLaunched) {
    budConfigStatus.textContent = leaderNativeLanguage.value ? "Ready to launch" : "Choose language";
    budConfigStatusText.textContent = leaderNativeLanguage.value ? "Launch Bud to open the private chat." : "Choose your native language to continue.";
  }
  openLeaderRoomButton.disabled = !planLocked || roomPrepared;
  tabs.slice(1).forEach(function (tab) {
    const target = tab.getAttribute("href").slice(1);
    const locked = {
      "plan-view": !hasGeneratedPlan,
      rooms: !planLocked,
      "launch-bud": !roomPrepared,
      "source-pack": !leaderBudLaunched,
      insights: !workshopComplete
    }[target];
    tab.classList.toggle("is-locked", locked);
    tab.setAttribute("aria-disabled", String(locked));
  });
  if (planLocked && roomPrepared) {
    livePlanEmpty.hidden = true;
  } else {
    livePlanEmpty.hidden = false;
  }
  reviewLockPlanButton.disabled = !learningPlanOutput.value.trim() || Boolean(planLocked);
  reviewLockPlanButton.innerHTML = planLocked
    ? '<span aria-hidden="true">&#128274;</span> Workshop plan locked'
    : '<span aria-hidden="true">&#128275;</span> Lock workshop plan';
  planReviewStatus.textContent = planLocked ? "Locked" : "Draft";
  renderWorkshopPlanCards();
}

leaderNameInput.addEventListener("input", function () {
  updateLeaderIdentity();
  updateSetupSequence();
});
updateLeaderIdentity();
updateSetupSequence();

leaderNativeLanguage.addEventListener("change", function () {
  updateSetupSequence();
  if (roomCaptionFeed) roomCaptionFeed.replay();
  Object.keys(breakoutCaptionFeeds).forEach(function (groupId) {
    breakoutCaptionFeeds[groupId].replay();
  });
});

function maskedEmail(email) {
  const parts = email.split("@");
  return parts[0].slice(0, 2) + "***@" + parts[1];
}

function participantRow(participant, registered) {
  const row = document.createElement("div");
  row.className = "participant-row";
  const light = document.createElement("span");
  light.className = "presence-light " + (participant.present ? "present" : "absent");
  light.setAttribute("aria-label", participant.present ? "Present" : "Absent");
  const details = document.createElement("span");
  details.className = "participant-details";
  const name = document.createElement("strong");
  name.textContent = participant.name;
  details.appendChild(name);
  if (registered) {
    const email = document.createElement("small");
    email.textContent = maskedEmail(participant.email);
    details.appendChild(email);
  }
  row.appendChild(light);
  row.appendChild(details);
  return row;
}

function renderAttendance() {
  registeredParticipants.innerHTML = "";
  guestParticipants.innerHTML = "";
  demoRegisteredParticipants.forEach(function (participant) { registeredParticipants.appendChild(participantRow(participant, true)); });
  const guests = demoGuestParticipants.concat(liveGuestParticipants);
  guests.forEach(function (participant) { guestParticipants.appendChild(participantRow(participant, false)); });
  const presentCount = demoRegisteredParticipants.filter(function (participant) { return participant.present; }).length + guests.filter(function (participant) { return participant.present; }).length;
  attendanceSummary.textContent = presentCount + " of " + (demoRegisteredParticipants.length + guests.length) + " participants present";
}

function participantsInAttendance() {
  return demoRegisteredParticipants.concat(demoGuestParticipants, liveGuestParticipants).filter(function (participant) { return participant.present; });
}

function refreshLiveGuests() {
  fetch("/api/topview/state")
    .then(function (response) { return response.ok ? response.json() : Promise.reject(new Error("Presence unavailable")); })
    .then(function (state) {
      const roomName = roomNameInput.value.trim() || "BUD-101";
      const seen = {};
      liveGuestParticipants = (state.participants || []).filter(function (participant) {
        return participant.role === "learner" && participant.room_name === roomName && String(participant.participant_id).indexOf("guest-") === 0;
      }).map(function (participant) {
        seen[participant.participant_id] = true;
        return { name: participant.display_name || participant.participant_id, present: true, participant_id: participant.participant_id };
      });
      renderAttendance();
    })
    .catch(function () {});
}

function roomCount() {
  return Math.max(1, Math.min(8, Number.parseInt(breakoutCount.value, 10) || 1));
}

function participantLabel(participant) {
  return participant.name + (participant.email ? " (" + maskedEmail(participant.email) + ")" : "");
}

function participantKey(participant) {
  return participant && (participant.participant_id || participant.name);
}

function renderAvailableParticipants(assignments) {
  const assignedKeys = {};
  assignments.forEach(function (members) {
    members.forEach(function (member) {
      if (member) assignedKeys[participantKey(member)] = true;
    });
  });
  const available = participantsInAttendance().filter(function (participant) {
    return !assignedKeys[participantKey(participant)];
  });
  availableParticipantList.innerHTML = "";
  available.forEach(function (participant) {
    const item = document.createElement("li");
    item.textContent = participantLabel(participant);
    availableParticipantList.appendChild(item);
  });
  availableParticipants.hidden = available.length === 0;
}

function renderBreakoutRooms(assignments, manual) {
  breakoutRooms.innerHTML = "";
  resetBreakoutCaptionFeeds();
  renderAvailableParticipants(assignments);
  assignments.forEach(function (members, index) {
    const groupId = "breakout-room-" + (index + 1);
    const room = document.createElement("article");
    room.className = "breakout-room";
    const title = document.createElement("h4");
    title.textContent = "Breakout room " + (index + 1);
    room.appendChild(title);
    const table = document.createElement("table");
    table.className = "breakout-table";
    const head = document.createElement("thead");
    head.innerHTML = "<tr><th>Participant</th><th>Status</th></tr>";
    table.appendChild(head);
    const body = document.createElement("tbody");
    members.forEach(function (member, memberIndex) {
      const row = document.createElement("tr");
      const participantCell = document.createElement("td");
      if (manual) {
        const select = document.createElement("select");
        select.className = member ? "" : "needs-assignment";
        select.setAttribute("aria-label", "Participant in breakout room " + (index + 1));
        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "Assign participant";
        select.appendChild(blank);
        participantsInAttendance().forEach(function (participant) {
          const option = document.createElement("option");
          option.value = participantKey(participant);
          option.textContent = participantLabel(participant);
          if (member && participantKey(participant) === participantKey(member)) option.selected = true;
          select.appendChild(option);
        });
        select.addEventListener("change", function () {
          const selected = participantsInAttendance().find(function (participant) {
            return participantKey(participant) === select.value;
          }) || null;
          const selectedKey = participantKey(selected);
          members[memberIndex] = null;
          if (selectedKey) {
            assignments.forEach(function (roomMembers) {
              roomMembers.forEach(function (candidate, candidateIndex) {
                if (candidate && participantKey(candidate) === selectedKey) roomMembers[candidateIndex] = null;
              });
            });
            members[memberIndex] = selected;
          }
          renderBreakoutRooms(assignments, true);
        });
        participantCell.appendChild(select);
      } else {
        participantCell.textContent = participantLabel(member);
      }
      const statusCell = document.createElement("td");
      statusCell.textContent = "present";
      row.appendChild(participantCell);
      row.appendChild(statusCell);
      body.appendChild(row);
    });
    table.appendChild(body);
    room.appendChild(table);
    const captions = document.createElement("section");
    captions.className = "captions leader-breakout-captions";
    const captionHead = document.createElement("div");
    captionHead.className = "subsection-heading";
    const captionTitle = document.createElement("h4");
    captionTitle.textContent = "Live captions";
    const clearButton = document.createElement("button");
    clearButton.className = "secondary-button";
    clearButton.type = "button";
    clearButton.textContent = "Clear";
    captionHead.appendChild(captionTitle);
    captionHead.appendChild(clearButton);
    const captionList = document.createElement("div");
    captionList.className = "caption-list";
    captionList.setAttribute("aria-live", "polite");
    captionList.innerHTML = '<p class="empty">Captions will appear when this breakout speaks.</p>';
    captions.appendChild(captionHead);
    captions.appendChild(captionList);
    room.appendChild(captions);
    breakoutRooms.appendChild(room);
    attachBreakoutCaptionFeed(groupId, captionList, clearButton);
  });
  persistBreakoutAssignments(assignments);
}

function resetBreakoutCaptionFeeds() {
  Object.keys(breakoutCaptionFeeds).forEach(function (groupId) {
    breakoutCaptionFeeds[groupId].stop();
  });
  breakoutCaptionFeeds = {};
}

function attachBreakoutCaptionFeed(groupId, captionList, clearButton) {
  if (!window.BudCaptionFeed) return;
  breakoutCaptionFeeds[groupId] = window.BudCaptionFeed({
    list: captionList,
    clearButton: clearButton,
    participantId: "facilitator-1",
    getRoomName: function () { return roomNameInput.value.trim() || "BUD-101"; },
    getGroupId: function () { return groupId; },
    getTargetLanguage: function () { return leaderNativeLanguage.value || "en"; },
    emptyText: "Captions will appear when this breakout speaks."
  });
  breakoutCaptionFeeds[groupId].start();
}

function persistBreakoutAssignments(assignments) {
  const roomName = roomNameInput.value.trim() || "BUD-101";
  fetch("/api/facilitator/breakouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: roomName, assignments: assignments })
  }).catch(function () {
    roomStatus.textContent = "Breakout changes could not be saved.";
  });
}

function buildEvenAssignments(shuffle) {
  const participants = participantsInAttendance();
  if (shuffle) participants.sort(function () { return Math.random() - 0.5; });
  const assignments = Array.from({ length: roomCount() }, function () { return []; });
  participants.forEach(function (participant, index) { assignments[index % assignments.length].push(participant); });
  return assignments;
}

randomBreakoutButton.addEventListener("click", function () {
  renderBreakoutRooms(buildEvenAssignments(true), false);
});

manualBreakoutButton.addEventListener("click", function () {
  renderBreakoutRooms(buildEvenAssignments(false), true);
});

breakoutCount.addEventListener("change", function () {
  breakoutCount.value = roomCount();
});

function renderRoomChat(messages) {
  roomChatMessages.innerHTML = "";
  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No public messages yet.";
    roomChatMessages.appendChild(empty);
    return;
  }
  messages.slice(-50).forEach(function (message) {
    const item = document.createElement("article");
    item.className = "leader-public-chat-message";
    const sender = document.createElement("strong");
    sender.textContent = message.sender_id === "facilitator-1"
      ? "You"
      : message.display_name || message.sender_display_name || message.sender_id || "Participant";
    const original = document.createElement("p");
    original.className = "leader-public-chat-original";
    original.lang = message.original_language || message.language || "";
    original.textContent = message.original_text || message.text || "";
    item.appendChild(sender);
    item.appendChild(original);
    if (message.translated_text) {
      const translated = document.createElement("p");
      translated.className = "leader-public-chat-translated";
      translated.lang = message.target_language || "";
      translated.textContent = message.translated_text;
      item.appendChild(translated);
    }
    roomChatMessages.appendChild(item);
  });
  roomChatMessages.scrollTop = roomChatMessages.scrollHeight;
}

function refreshLeaderRoomChat() {
  const roomName = roomNameInput.value.trim() || "BUD-101";
  const targetLanguage = leaderNativeLanguage.value || "en";
  fetch("/api/group-messages?room=" + encodeURIComponent(roomName) +
    "&participant_id=facilitator-1&scope=public&target=" + encodeURIComponent(targetLanguage))
    .then(function (response) {
      return response.ok ? response.json() : Promise.reject(new Error("Chat unavailable"));
    })
    .then(function (payload) {
      renderRoomChat(payload.messages || []);
    })
    .catch(function () {});
}

function renderTaskInsights(taskInsights, roomLearnerTotal) {
  taskInsightsList.innerHTML = "";
  if (!taskInsights.length) {
    const empty = document.createElement("p");
    empty.className = "inline-status";
    empty.textContent = "No task responses yet.";
    taskInsightsList.appendChild(empty);
    roomInsightsSummary.textContent = "Task difficulty will appear as learners respond.";
    return;
  }
  const totalDifficulty = taskInsights.reduce(function (sum, task) { return sum + task.difficulty_count; }, 0);
  roomInsightsSummary.textContent = totalDifficulty + " learner difficulty report" + (totalDifficulty === 1 ? "" : "s") + " across " + taskInsights.length + " task" + (taskInsights.length === 1 ? "" : "s") + ". Each pie shows the response mix for a task.";
  taskInsights.forEach(function (task, index) {
    const card = document.createElement("article");
    card.className = "task-insight-card";
    card.id = task.task_id;
    const heading = document.createElement("div");
    heading.className = "task-insight-heading";
    const title = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = task.section || "Task " + (Number.isFinite(Number(task.task_index)) ? Number(task.task_index) + 1 : index + 1);
    const name = document.createElement("h3");
    name.textContent = task.task_text || "Learning plan task";
    title.append(eyebrow, name);
    const totalLearners = Math.max(Number(roomLearnerTotal) || 0, task.total);
    const awaiting = Math.max(0, totalLearners - task.total);
    const count = document.createElement("strong");
    count.textContent = task.difficulty_count + " need help";
    heading.append(title, count);
    const segments = [
      { key: "green", label: "Got it", count: task.counts.green },
      { key: "yellow", label: "Somewhat clear", count: task.counts.yellow },
      { key: "red", label: "Need help", count: task.counts.red },
      { key: "awaiting", label: "Awaiting", count: awaiting }
    ];
    const visual = document.createElement("div");
    visual.className = "task-insight-visual";
    const pie = document.createElement("div");
    pie.className = "task-state-pie";
    pie.setAttribute("role", "img");
    pie.setAttribute("aria-label", task.counts.green + " got it, " + task.counts.yellow + " somewhat clear, " + task.counts.red + " need help, " + awaiting + " awaiting response out of " + totalLearners + " learners");
    pie.style.background = taskStatePieGradient(segments, totalLearners);
    const pieLabel = document.createElement("span");
    pieLabel.innerHTML = "<strong>" + task.total + "</strong><small>of " + totalLearners + "</small>";
    pie.appendChild(pieLabel);
    const legend = document.createElement("div");
    legend.className = "task-state-legend";
    segments.forEach(function (segment) {
      const item = document.createElement("span");
      item.className = "is-" + segment.key;
      item.textContent = segment.label + " " + segment.count;
      legend.appendChild(item);
    });
    const meta = document.createElement("p");
    meta.className = "task-insight-meta";
    meta.textContent = task.total + " of " + totalLearners + " learners responded";
    const support = document.createElement("div");
    support.className = "task-support-names";
    const redNames = (task.needs_support || []).filter(function (item) { return item.response === "red"; }).map(function (item) { return item.display_name; });
    const yellowNames = (task.needs_support || []).filter(function (item) { return item.response === "yellow"; }).map(function (item) { return item.display_name; });
    if (redNames.length) {
      const line = document.createElement("p");
      line.className = "is-red";
      line.textContent = "Needs help: " + redNames.join(", ");
      support.appendChild(line);
    }
    if (yellowNames.length) {
      const line = document.createElement("p");
      line.className = "is-yellow";
      line.textContent = "Needs clarification: " + yellowNames.join(", ");
      support.appendChild(line);
    }
    visual.append(pie, legend);
    card.append(heading, visual, meta);
    if (support.childNodes.length) card.appendChild(support);
    taskInsightsList.appendChild(card);
  });
}

function taskStatePieGradient(segments, total) {
  if (!total) return "#e9eef0";
  const colors = { green: "#42a66d", yellow: "#e3ad32", red: "#d85b52", awaiting: "#b8c4ca" };
  let progress = 0;
  const stops = segments.filter(function (segment) { return segment.count > 0; }).map(function (segment) {
    const start = progress / total * 100;
    progress += segment.count;
    return colors[segment.key] + " " + start + "% " + (progress / total * 100) + "%";
  });
  return "conic-gradient(" + (stops.join(", ") || "#e9eef0 0 100%") + ")";
}

function refreshLeaderWorkshopMaterial() {
  const roomName = roomNameInput.value.trim() || "BUD-101";
  Promise.all([
    fetch("/api/workshop-material?room=" + encodeURIComponent(roomName)).then(function (response) {
      if (!response.ok) throw new Error("Workshop material unavailable");
      return response.json();
    }),
    fetch("/api/workshop-document-control?room=" + encodeURIComponent(roomName)).then(function (response) {
      if (!response.ok) throw new Error("Workshop document control unavailable");
      return response.json();
    })
  ]).then(function (results) {
    const material = results[0];
    const control = results[1];
    leaderLearningPlan = material.learning_plan || leaderLearningPlan || "";
    if (leaderLearningPlan && !learningPlanOutput.value.trim()) {
      learningPlanOutput.value = leaderLearningPlan;
      learningPlanOutput.readOnly = true;
      learningPlanOutput.hidden = true;
      workshopPlanCards = parseWorkshopPlanCards(leaderLearningPlan);
      lockPlanButton.hidden = false;
      lockPlanButton.innerHTML = '<span aria-hidden="true">&#128274;</span> Learning plan locked';
      updateSetupSequence();
    }
    leaderLearningPlanTasks = parseLeaderLearningPlanTasks(leaderLearningPlan);
    leaderActiveTaskIndex = control.active_task_index === null ? -1 : Number(control.active_task_index) || 0;
    leaderCompletedTaskIndexes = Array.isArray(control.completed_task_indexes) ? control.completed_task_indexes : [];
    leaderWorkshopPages = material.pages && material.pages.length ? material.pages : [{
      filename: "Workshop documents",
      location: "Current activity",
      text: "Publish workshop slides to display them here."
    }];
    leaderDocumentPageIndex = Math.max(0, Math.min(leaderWorkshopPages.length - 1, Number(control.page_index) || 0));
    renderLeaderDocumentPage();
    renderLeaderLearningPlanTasks();
    renderWorkshopPlanCards();
    updateSetupSequence();
  }).catch(function () {});
}

function parseLeaderLearningPlanTasks(plan) {
  const lines = String(plan || "").split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  const tasks = [];
  let currentSection = "";
  lines.forEach(function (line) {
    const heading = line.match(/^#{1,6}\s+(.+)/);
    const numbered = line.match(/^\d+[\).\s-]+(.+)/);
    if (heading) currentSection = heading[1].replace(/[*_`:#]+$/g, "").trim();
    else if (numbered && !/\btask\b/i.test(line)) currentSection = numbered[1].replace(/[:*#]+$/g, "").trim();
    const taskMatch = line.match(/\btask\b\s*[:\-]\s*(.+)$/i);
    if (taskMatch) {
      tasks.push({ title: currentSection || "Learning point " + (tasks.length + 1), text: taskMatch[1].trim(), comprehensionCheck: "" });
      return;
    }
    const checkMatch = line.match(/\b(?:comprehension\s+check|check|completion\s+action)\b\s*[:\-]\s*(.+)$/i);
    if (checkMatch && tasks.length) {
      tasks[tasks.length - 1].comprehensionCheck = checkMatch[1].trim();
      return;
    }
    if (/^[-*]\s+/.test(line) && /\b(complete|identify|discuss|write|compare|reflect|create|answer|read)\b/i.test(line)) {
      tasks.push({ title: currentSection || "Learning point " + (tasks.length + 1), text: line.replace(/^[-*]\s+/, "") });
    }
  });
  return tasks;
}

function renderLeaderLearningPlanTasks() {
  leaderLivePlanTasks.innerHTML = "";
  const completedCount = leaderCompletedTaskIndexes.filter(function (index) {
    return index >= 0 && index < leaderLearningPlanTasks.length;
  }).length;
  leaderLivePlanProgress.textContent = completedCount + " / " + leaderLearningPlanTasks.length;
  if (!leaderLearningPlanTasks.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No learning points published.";
    leaderLivePlanTasks.appendChild(empty);
    return;
  }
  leaderLearningPlanTasks.forEach(function (task, index) {
    const isComplete = leaderCompletedTaskIndexes.indexOf(index) !== -1;
    const isCurrent = index === leaderActiveTaskIndex;
    const isExpanded = Boolean(expandedLeaderTasks[index]);
    const card = document.createElement("article");
    card.className = "leader-learning-point" + (isCurrent ? " is-current" : "") + (isComplete ? " is-complete" : "");
    const heading = document.createElement("div");
    heading.className = "leader-learning-point-heading";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isComplete;
    checkbox.setAttribute("aria-label", "Mark learning point " + (index + 1) + " complete");
    checkbox.addEventListener("change", function () {
      updateLeaderLearningPlanTask(index, checkbox.checked);
    });
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "leader-learning-point-toggle";
    toggle.setAttribute("aria-expanded", String(isExpanded));
    const title = document.createElement("span");
    const pointLabel = document.createElement("small");
    pointLabel.textContent = "Point " + (index + 1);
    const pointTitle = document.createElement("strong");
    pointTitle.textContent = task.title;
    title.append(pointLabel, pointTitle);
    const chevron = document.createElement("i");
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = isExpanded ? "−" : "+";
    toggle.append(title, chevron);
    toggle.addEventListener("click", function () {
      expandedLeaderTasks[index] = !expandedLeaderTasks[index];
      renderLeaderLearningPlanTasks();
    });
    heading.append(checkbox, toggle);
    const details = document.createElement("p");
    details.className = "leader-learning-point-details";
    details.textContent = task.text + (task.comprehensionCheck ? "\nCheck: " + task.comprehensionCheck : "");
    details.hidden = !isExpanded;
    card.append(heading, details);
    leaderLivePlanTasks.appendChild(card);
  });
}

function updateLeaderLearningPlanTask(taskIndex, completed) {
  fetch("/api/facilitator/learning-plan-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_name: roomNameInput.value.trim() || "BUD-101",
      task_index: taskIndex,
      task_count: leaderLearningPlanTasks.length,
      completed: completed,
      updated_by: "facilitator-1"
    })
  }).then(function (response) {
    if (!response.ok) throw new Error("Unable to update the learning point");
    return response.json();
  }).then(function (control) {
    leaderActiveTaskIndex = control.active_task_index === null ? -1 : control.active_task_index;
    leaderCompletedTaskIndexes = control.completed_task_indexes || [];
    renderLeaderLearningPlanTasks();
    updateSetupSequence();
  }).catch(refreshLeaderWorkshopMaterial);
}

function changeLeaderDocumentPage(delta) {
  if (!leaderWorkshopPages.length) return;
  const nextPageIndex = Math.max(0, Math.min(leaderWorkshopPages.length - 1, leaderDocumentPageIndex + delta));
  if (nextPageIndex === leaderDocumentPageIndex) return;
  fetch("/api/facilitator/workshop-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_name: roomNameInput.value.trim() || "BUD-101",
      page_index: nextPageIndex,
      updated_by: "facilitator-1"
    })
  }).then(function (response) {
    if (!response.ok) throw new Error("Unable to update the workshop document");
    return response.json();
  }).then(function (control) {
    leaderDocumentPageIndex = control.page_index;
    renderLeaderDocumentPage();
  }).catch(function () {});
}

function renderLeaderDocumentPage() {
  const page = leaderWorkshopPages[leaderDocumentPageIndex];
  if (!page) return;
  leaderDocumentMeta.textContent = page.filename;
  leaderDocumentLocation.textContent = page.location || "Workshop material";
  leaderDocumentPageNumber.textContent = "Page " + (leaderDocumentPageIndex + 1) + " of " + leaderWorkshopPages.length;
  leaderDocumentPageHeading.textContent = page.filename;
  leaderDocumentContent.innerHTML = "";
  if (page.rendered_slide_url) {
    const stage = document.createElement("div");
    stage.className = "leader-rendered-document-stage";
    const slide = document.createElement("img");
    slide.className = "leader-rendered-document-slide";
    slide.alt = "Slide " + (Number(page.rendered_page) || leaderDocumentPageIndex + 1) + " from " + page.filename;
    slide.src = page.rendered_slide_url;
    stage.appendChild(slide);
    leaderDocumentContent.appendChild(stage);
  } else {
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    if (blocks.length) {
      blocks.forEach(function (block) { leaderDocumentContent.appendChild(renderLeaderDocxBlock(block)); });
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = page.text || "";
      leaderDocumentContent.appendChild(paragraph);
    }
  }
  leaderDocumentPrevious.disabled = leaderDocumentPageIndex === 0;
  leaderDocumentNext.disabled = leaderDocumentPageIndex === leaderWorkshopPages.length - 1;
}

function renderLeaderDocxBlock(block) {
  if (block.type === "table") {
    const table = document.createElement("table");
    table.className = "docx-table";
    (block.rows || []).forEach(function (row) {
      const tr = document.createElement("tr");
      row.forEach(function (cell) {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    return table;
  }
  const tagName = block.type === "title" ? "h2"
    : block.type === "heading1" ? "h3"
    : block.type === "heading2" ? "h4"
    : block.type === "heading3" ? "h5"
    : block.list ? "li"
    : "p";
  const element = document.createElement(tagName);
  element.className = "docx-block docx-" + (block.type || "paragraph");
  if (block.align) element.dataset.align = block.align;
  const runs = Array.isArray(block.runs) && block.runs.length ? block.runs : [{ text: block.text || "" }];
  runs.forEach(function (run) {
    let node = document.createTextNode(run.text || "");
    ["underline", "italic", "bold"].forEach(function (style) {
      if (!run[style]) return;
      const wrapper = document.createElement(style === "underline" ? "u" : style === "italic" ? "em" : "strong");
      wrapper.appendChild(node);
      node = wrapper;
    });
    element.appendChild(node);
  });
  return element;
}

function plainWorkshopPlanValue(value) {
  return String(value || "").replace(/^[\s#>*_`-]+/, "").replace(/[\s*_`:#]+$/, "").trim();
}

function parseWorkshopPlanCards(plan) {
  const cards = [];
  let card = null;
  let pendingField = "";
  function ensureCard() {
    if (!card) card = { title: "", learnerTask: "", comprehensionCheck: "" };
    return card;
  }
  function commitCard() {
    if (card && (card.title || card.learnerTask || card.comprehensionCheck)) cards.push(card);
    card = null;
    pendingField = "";
  }
  String(plan || "").replace(/\r/g, "").split("\n").forEach(function (rawLine) {
    const line = rawLine.trim();
    if (!line) return;
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (numbered || heading) {
      commitCard();
      card = { title: plainWorkshopPlanValue((numbered || heading)[1]), learnerTask: "", comprehensionCheck: "" };
      return;
    }
    const normalized = line.replace(/^[-*+]\s+/, "").replace(/^\*\*([^*]+)\*\*\s*/, "$1 ");
    const labelled = normalized.match(/^(?:\*\*)?(learner\s+task|task|explanation|comprehension\s+check|check|completion\s+action)(?:\*\*)?\s*[:\-]?\s*(.*)$/i);
    if (labelled) {
      const target = ensureCard();
      pendingField = /comprehension|check|completion/i.test(labelled[1])
        ? "comprehensionCheck"
        : "learnerTask";
      const value = plainWorkshopPlanValue(labelled[2]);
      if (value) target[pendingField] = value;
      return;
    }
    const value = plainWorkshopPlanValue(normalized);
    if (pendingField && value) {
      const target = ensureCard();
      target[pendingField] += (target[pendingField] ? "\n" : "") + value;
      return;
    }
    if (card && value) {
      const target = ensureCard();
      if (!target.learnerTask) target.learnerTask = value;
      else if (!target.comprehensionCheck) target.comprehensionCheck = value;
    } else if (/^[-*+]\s+/.test(line)) {
      ensureCard().learnerTask = value;
    }
  });
  commitCard();
  return cards;
}

function serializeWorkshopPlanCards() {
  return workshopPlanCards.map(function (card, index) {
    return [
      String(index + 1) + ". " + card.title.trim(),
      "   Learner task: " + card.learnerTask.trim(),
      "   Comprehension check: " + card.comprehensionCheck.trim()
    ].join("\n");
  }).join("\n\n");
}

function syncWorkshopPlanOutput() {
  learningPlanOutput.value = serializeWorkshopPlanCards();
  leaderLearningPlan = learningPlanOutput.value;
}

function renderWorkshopPlanCards() {
  fullLearningPlan.innerHTML = "";
  const locked = Boolean(learningPlanOutput.readOnly && learningPlanOutput.value.trim());
  if (!workshopPlanCards.length && locked) {
    const empty = document.createElement("p");
    empty.className = "workshop-plan-empty";
    empty.textContent = "Generate a learning plan from the curriculum to create task cards.";
    fullLearningPlan.appendChild(empty);
  }
  workshopPlanCards.forEach(function (task, index) {
    const card = document.createElement("article");
    card.className = "workshop-task-card" + (locked ? " is-locked" : "");
    const header = document.createElement("div");
    header.className = "workshop-task-card-header";
    const chapter = document.createElement("span");
    chapter.textContent = "Chapter " + (index + 1);
    header.appendChild(chapter);
    if (!locked) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "workshop-task-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", function () {
        workshopPlanCards.splice(index, 1);
        syncWorkshopPlanOutput();
        updateSetupSequence();
      });
      header.appendChild(remove);
    }
    card.append(
      header,
      workshopPlanField("Task title", "input", "workshop-task-title", task.title, locked, function (value) { task.title = value; }),
      workshopPlanField("Learner task / explanation", "textarea", "workshop-task-explanation", task.learnerTask, locked, function (value) { task.learnerTask = value; }),
      workshopPlanField("Comprehension check", "textarea", "workshop-task-check", task.comprehensionCheck, locked, function (value) { task.comprehensionCheck = value; })
    );
    fullLearningPlan.appendChild(card);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "workshop-add-task";
  add.disabled = locked;
  add.innerHTML = '<span class="plus" aria-hidden="true">+</span><strong>' + (locked ? "Plan locked" : "Add learner task") + "</strong>";
  if (!locked) {
    add.addEventListener("click", function () {
      workshopPlanCards.push({ title: "", learnerTask: "", comprehensionCheck: "" });
      syncWorkshopPlanOutput();
      updateSetupSequence();
      const titles = fullLearningPlan.querySelectorAll(".workshop-task-title");
      if (titles.length) titles[titles.length - 1].focus();
    });
  }
  fullLearningPlan.appendChild(add);
}

function workshopPlanField(labelText, tagName, className, value, locked, update) {
  const label = document.createElement("label");
  label.appendChild(document.createTextNode(labelText));
  const field = document.createElement(tagName);
  field.className = className;
  field.value = value || "";
  field.disabled = locked;
  field.addEventListener("input", function () {
    update(field.value);
    syncWorkshopPlanOutput();
    planReviewStatus.textContent = "Draft";
  });
  label.appendChild(field);
  return label;
}

function validateWorkshopPlanCards() {
  if (!workshopPlanCards.length) return "Add at least one learner task before locking the plan.";
  const incompleteIndex = workshopPlanCards.findIndex(function (task) {
    return !task.title.trim() || !task.learnerTask.trim() || !task.comprehensionCheck.trim();
  });
  return incompleteIndex === -1 ? "" : "Complete the title, learner task, and comprehension check for Chapter " + (incompleteIndex + 1) + ".";
}

function refreshLeaderState() {
  fetch("/api/facilitator/state?room=" + encodeURIComponent(roomNameInput.value.trim() || "BUD-101"))
    .then(function (response) { return response.ok ? response.json() : Promise.reject(new Error("State unavailable")); })
    .then(function (state) {
      renderTaskInsights(state.task_insights || [], (state.participants || []).length);
      refreshLeaderRoomChat();
    })
    .catch(function () {});
}

roomChatForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const text = roomChatInput.value.trim();
  if (!text) return;
  roomChatInput.value = "";
  fetch("/api/group-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_name: roomNameInput.value.trim() || "BUD-101", participant_id: "facilitator-1", sender_display_name: leaderName(), group_id: "group-main", text: text, language: leaderNativeLanguage.value || "en" }) })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to post to the room");
      refreshLeaderRoomChat();
    })
    .catch(function () { renderRoomChat([{ sender_id: "facilitator-1", sender_display_name: leaderName(), text: text }]); });
});

function submitChatOnEnter(event) {
  if ((event.target.tagName !== "TEXTAREA" && event.target.tagName !== "INPUT") || event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (event.target.value.trim() && event.target.form) event.target.form.requestSubmit();
}

roomChatInput.addEventListener("keydown", submitChatOnEnter);
leaderDocumentPrevious.addEventListener("click", function () { changeLeaderDocumentPage(-1); });
leaderDocumentNext.addEventListener("click", function () { changeLeaderDocumentPage(1); });
roomNameInput.addEventListener("change", refreshLeaderWorkshopMaterial);
if (leaderNativeLanguage) leaderNativeLanguage.addEventListener("change", refreshLeaderRoomChat);

if (roomTalkButton) roomTalkButton.addEventListener("click", toggleLeaderMainRoomTalk);

if (window.BudCaptionFeed && roomCaptionList) {
  roomCaptionFeed = window.BudCaptionFeed({
    list: roomCaptionList,
    clearButton: clearRoomCaptions,
    participantId: "facilitator-1",
    getRoomName: function () { return roomNameInput.value.trim() || "BUD-101"; },
    getGroupId: function () { return "group-main"; },
    getTargetLanguage: function () { return leaderNativeLanguage.value || "en"; },
    emptyText: "Captions will appear when someone speaks in the workshop."
  });
  roomCaptionFeed.start();
}

renderAttendance();
refreshLiveGuests();
refreshLeaderState();
refreshLeaderWorkshopMaterial();
window.setInterval(refreshLiveGuests, 3000);
window.setInterval(refreshLeaderState, 3000);
window.setInterval(refreshLeaderWorkshopMaterial, 5000);

function renderLeaderBudMessages(messages) {
  leaderBudMessages.innerHTML = "";
  messages.forEach(function (message) {
    const item = document.createElement("article");
    item.className = "leader-bud-message " + (message.sender === "facilitator" ? "message-user" : "message-bud");
    const sender = document.createElement("strong");
    sender.textContent = message.sender === "facilitator" ? "You" : leaderBudName();
    const messageHeading = document.createElement("div");
    messageHeading.className = "leader-bud-message-heading";
    if (message.sender !== "facilitator") {
      const avatar = document.createElement("img");
      avatar.src = "/assets/facil-bud-owl.jpeg";
      avatar.alt = "Bud avatar";
      messageHeading.appendChild(avatar);
    }
    messageHeading.appendChild(sender);
    const text = document.createElement("p");
    text.textContent = message.text;
    item.appendChild(messageHeading);
    item.appendChild(text);
    leaderBudMessages.appendChild(item);
  });
  leaderBudMessages.scrollTop = leaderBudMessages.scrollHeight;
}

launchLeaderBudButton.addEventListener("click", function () {
  if (!leaderNativeLanguage.value) return;
  leaderBudLaunched = true;
  leaderBudTitle.textContent = leaderBudName();
  leaderBudPanel.hidden = false;
  budConfigStatus.textContent = "Bud active";
  budConfigStatusText.textContent = leaderBudName() + " is ready to help.";
  renderLeaderBudMessages([{ sender: "bud", text: "Hi " + leaderName() + ", I am here to help you:\ni) monitor your learners' progress,\nii) translate your instructions to learners who speak a different language, and\niii) encourage them to be on task." }]);
  updateSetupSequence();
});

leaderBudForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const text = leaderBudInput.value.trim();
  if (!text || !leaderNativeLanguage.value) return;
  leaderBudInput.value = "";
  const existing = Array.prototype.slice.call(leaderBudMessages.querySelectorAll("article")).map(function (item) {
    return { sender: item.classList.contains("message-user") ? "facilitator" : "bud", text: item.querySelector("p").textContent };
  });
  renderLeaderBudMessages(existing.concat([{ sender: "facilitator", text: text }]));
  leaderBudThinkingText.textContent = "Bud is thinking...";
  leaderBudThinking.classList.add("is-thinking");
  leaderBudInput.disabled = true;
  leaderBudForm.querySelector("button").disabled = true;
  const registeredPresent = demoRegisteredParticipants.filter(function (participant) { return participant.present; }).length;
  const registeredAbsent = demoRegisteredParticipants.filter(function (participant) { return !participant.present; }).length;
  const guestsPresent = demoGuestParticipants.concat(liveGuestParticipants).filter(function (participant) { return participant.present; }).length;
  const registeredPresentNames = demoRegisteredParticipants.filter(function (participant) { return participant.present; }).map(function (participant) { return participant.name; });
  const registeredAbsentNames = demoRegisteredParticipants.filter(function (participant) { return !participant.present; }).map(function (participant) { return participant.name; });
  const guestPresentNames = demoGuestParticipants.concat(liveGuestParticipants).filter(function (participant) { return participant.present; }).map(function (participant) { return participant.name; });
  fetch("/api/facilitator-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_name: roomNameInput.value.trim(), text: text, leader_name: leaderName(), native_language: leaderNativeLanguage.value, attendance_context: { registered_present: registeredPresent, registered_absent: registeredAbsent, guests_present: guestsPresent, registered_present_names: registeredPresentNames, registered_absent_names: registeredAbsentNames, guest_present_names: guestPresentNames } }) })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "BUD is unavailable");
      const messages = (result.body.state && result.body.state.facil_bud_messages || []).map(function (message) { return { sender: message.sender === "facilitator" ? "facilitator" : "bud", text: message.text }; });
      renderLeaderBudMessages(messages);
    })
    .catch(function (error) { budConfigStatusText.textContent = error.message; })
    .finally(function () {
      leaderBudThinkingText.textContent = "Bud is here";
      leaderBudThinking.classList.remove("is-thinking");
      leaderBudInput.disabled = false;
      leaderBudForm.querySelector("button").disabled = false;
      leaderBudInput.focus();
    });
});

leaderBudInput.addEventListener("keydown", submitChatOnEnter);

uploadSourceButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const fileInput = document.getElementById(button.dataset.fileInput);
    if (fileInput) fileInput.click();
  });
});

sourceFiles.forEach(function (fileInput) {
  fileInput.addEventListener("change", function () {
    uploadCategorizedSource(fileInput, fileInput.dataset.materialRole);
  });
});

function uploadCategorizedSource(fileInput, materialRole) {
  const file = fileInput.files[0];
  if (!file) return;
  planLockHint.hidden = true;
  if (file.size > 15 * 1024 * 1024) {
    sourceStatus.textContent = "Source files must be 15 MB or smaller.";
    return;
  }
  const categoryLabel = sourceCategoryLabels[materialRole] || materialRole;
  const reader = new FileReader();
  reader.onload = function () {
    const contentBase64 = String(reader.result).split(",")[1] || "";
    fetch("/api/facilitator/source-material", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_name: roomNameInput.value.trim() || "BUD-101",
        filename: file.name,
        mime_type: file.type,
        content_base64: contentBase64,
        material_role: materialRole,
        uploaded_by: "facilitator-1"
      })
    })
      .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error(result.body.error || "Unable to upload source material");
        sourceStatus.textContent = "Uploaded " + file.name + " to " + categoryLabel + ".";
        fileInput.value = "";
        renderLeaderSourcePack(result.body.source_pack);
      })
      .catch(function (error) { sourceStatus.textContent = error.message; });
  };
  reader.onerror = function () { sourceStatus.textContent = "Unable to read this file."; };
  prepareSourcePackForUpload()
    .then(function () {
      sourceStatus.textContent = "Uploading " + file.name + " to " + categoryLabel + "...";
      reader.readAsDataURL(file);
    })
    .catch(function () {
      fileInput.value = "";
    });
}

function prepareSourcePackForUpload() {
  if (sourcePackPreparedForSession) return Promise.resolve();
  if (!sourcePackPreparationPromise) {
    sourcePackPreparationPromise = resetLeaderSourcePack()
      .finally(function () {
        sourcePackPreparationPromise = null;
      });
  }
  return sourcePackPreparationPromise;
}

function resetLeaderSourcePack() {
  sourceStatus.textContent = "Starting with fresh workshop materials...";
  return fetch("/api/facilitator/source-pack/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: roomNameInput.value.trim() || "BUD-101" })
  })
    .then(function (response) {
      return response.json().then(function (body) { return { ok: response.ok, body: body }; });
    })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to reset workshop materials");
      learningPlanOutput.value = "";
      learningPlanOutput.readOnly = false;
      planGenerationComplete = false;
      planLockComplete = false;
      roomPrepared = false;
      leaderBudLaunched = false;
      sourcePackPreparedForSession = true;
      leaderLearningPlan = "";
      workshopPlanCards = [];
      savePlanButton.hidden = true;
      lockPlanButton.hidden = true;
      planLockHint.hidden = true;
      planReviewMessage.textContent = "";
      renderLeaderSourcePack(result.body.source_pack);
      sourceStatus.textContent = "";
      updateSetupSequence();
    })
    .catch(function (error) {
      if (sourceMaterialList) sourceMaterialList.textContent = "Could not start a fresh workshop setup.";
      sourceStatus.textContent = "Unable to reset workshop materials. Refresh and try again.";
      throw error;
    });
}

function renderLeaderSourcePack(sourcePack) {
  if (!sourceMaterialList) return;
  const versions = sourcePack.versions || [];
  const latest = versions[versions.length - 1];
  sourceMaterialList.innerHTML = "";
  const latestByRole = {};
  if (latest) {
    latest.materials.forEach(function (material) {
      if (sourceCategoryUploadLabels[material.material_role]) {
        latestByRole[material.material_role] = material;
      }
    });
  }
  uploadSourceButtons.forEach(function (button) {
    const material = latestByRole[button.dataset.materialRole];
    button.textContent = material
      ? "Upload: " + material.filename
      : sourceCategoryUploadLabels[button.dataset.materialRole];
    button.classList.toggle("is-uploaded", Boolean(material));
  });
  const categorizedMaterials = Object.keys(sourceCategoryUploadLabels).map(function (role) {
    return latestByRole[role];
  }).filter(Boolean);
  if (!categorizedMaterials.length) {
    sourceMaterialList.textContent = "No categorized workshop documents uploaded yet.";
    return;
  }
  categorizedMaterials.forEach(function (material) {
    const item = document.createElement("div");
    item.className = "source-material-item";
    const category = document.createElement("strong");
    category.textContent = sourceCategoryLabels[material.material_role] || material.material_role;
    const filename = document.createElement("span");
    filename.textContent = material.filename;
    item.append(category, filename);
    sourceMaterialList.appendChild(item);
  });
}

generatePlanButton.addEventListener("click", function () {
  planLockHint.hidden = true;
  generatePlanButton.disabled = true;
  generatePlanButton.textContent = "Generating...";
  planStartedAt = Date.now();
  planTimer.hidden = false;
  planTimer.textContent = "Elapsed 00:00";
  planTimerInterval = window.setInterval(updatePlanTimer, 1000);
  sourceStatus.textContent = leaderBudName() + " is asking local Qwen to structure the workshop...";
  fetch("/api/facilitator/learning-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_name: roomNameInput.value.trim() || "BUD-101" }) })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to generate learning plan");
      learningPlanOutput.hidden = true;
      learningPlanOutput.value = result.body.learning_plan;
      workshopPlanCards = parseWorkshopPlanCards(result.body.learning_plan);
      if (!workshopPlanCards.length) {
        workshopPlanCards = [{ title: "Learning chapter 1", learnerTask: plainWorkshopPlanValue(result.body.learning_plan), comprehensionCheck: "" }];
      }
      syncWorkshopPlanOutput();
      savePlanButton.hidden = false;
      lockPlanButton.hidden = false;
      learningPlanOutput.readOnly = false;
      planGenerationComplete = true;
      planLockComplete = false;
      lockPlanButton.innerHTML = '<span aria-hidden="true">&#128275;</span> Lock learning plan';
      sourceStatus.textContent = "Learning plan generated by " + leaderBudName() + " using " + result.body.provider + ".";
      planLockHint.hidden = false;
      updateSetupSequence();
    })
    .catch(function (error) { sourceStatus.textContent = error.message; })
    .finally(function () {
      window.clearInterval(planTimerInterval);
      planTimerInterval = null;
      updatePlanTimer();
      generatePlanButton.disabled = false;
      generatePlanButton.textContent = "Generate learning plan";
    });
});

function requestPlanLock() {
  if (learningPlanOutput.readOnly) return;
  syncWorkshopPlanOutput();
  const validationMessage = validateWorkshopPlanCards();
  if (validationMessage) {
    planReviewMessage.textContent = validationMessage;
    sourceStatus.textContent = validationMessage;
    return;
  }
  planReviewMessage.textContent = "";
  const planTab = tabs.find(function (tab) { return tab.getAttribute("href") === "#plan-view"; });
  if (planTab) planTab.click();
  lockConfirmation.hidden = false;
  planReviewMessage.textContent = "Confirm the lock below.";
  lockConfirmation.scrollIntoView({ block: "nearest" });
  confirmLockButton.focus();
}

lockPlanButton.addEventListener("click", requestPlanLock);
reviewLockPlanButton.addEventListener("click", requestPlanLock);

confirmLockButton.addEventListener("click", function () {
  syncWorkshopPlanOutput();
  confirmLockButton.disabled = true;
  confirmLockButton.textContent = "Locking...";
  cancelLockButton.disabled = true;
  sourceStatus.textContent = "Publishing workshop material...";
  planReviewMessage.textContent = "Publishing and locking the workshop plan...";
  fetch("/api/facilitator/source-pack?room=" + encodeURIComponent(roomNameInput.value.trim() || "BUD-101"))
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to read workshop material");
      const versions = result.body.versions || [];
      const latest = versions[versions.length - 1];
      if (!latest) throw new Error("Upload workshop material before locking the learning plan.");
      return fetch("/api/facilitator/source-pack/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_name: roomNameInput.value.trim() || "BUD-101", version: latest.version, learning_plan: learningPlanOutput.value.trim() })
      }).then(function (response) {
        return response.json().then(function (body) { return { ok: response.ok, body: body }; });
      });
    })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to publish workshop material");
      learningPlanOutput.readOnly = true;
      planLockComplete = true;
      lockConfirmation.hidden = true;
      lockPlanButton.innerHTML = '<span aria-hidden="true">&#128274;</span> Learning plan locked';
      sourceStatus.textContent = "Learning plan locked. Buds will use the published workshop material.";
      planReviewMessage.textContent = "Workshop plan locked. These chapters are ready for learners.";
      planLockHint.hidden = true;
      renderWorkshopPlanCards();
      updateSetupSequence();
    })
    .catch(function (error) {
      sourceStatus.textContent = error.message;
      planReviewMessage.textContent = "Unable to lock the workshop plan: " + error.message;
    })
    .finally(function () {
      confirmLockButton.disabled = false;
      confirmLockButton.textContent = "Yes, lock plan";
      cancelLockButton.disabled = false;
    });
});

cancelLockButton.addEventListener("click", function () {
  lockConfirmation.hidden = true;
  const firstField = fullLearningPlan.querySelector("input, textarea");
  if (firstField) firstField.focus();
  updateSetupSequence();
});

openLeaderRoomButton.addEventListener("click", function () {
  const roomName = roomNameInput.value.trim();
  if (!roomName) {
    roomStatus.textContent = "Enter a room name before opening the room.";
    return;
  }
  openLeaderRoomButton.disabled = true;
  openLeaderRoomButton.textContent = "Preparing room...";
  roomStatus.textContent = "Opening the room for participants...";
  fetch("/api/facilitator/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: roomName })
  })
    .then(function (response) {
      return response.json().then(function (body) { return { ok: response.ok, body: body }; });
    })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to prepare the room");
      roomPrepared = true;
      openLeaderRoomButton.textContent = "Room ready";
      roomStatus.textContent = "Room prepared. Participants can now enter and the locked plan is live.";
      updateSetupSequence();
    })
    .catch(function (error) {
      openLeaderRoomButton.disabled = false;
      openLeaderRoomButton.textContent = "Start Main Workshop Room";
      roomStatus.textContent = error.message;
    });
});

function updatePlanTimer() {
  const elapsedSeconds = Math.floor((Date.now() - planStartedAt) / 1000);
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  planTimer.textContent = "Elapsed " + minutes + ":" + seconds;
}

savePlanButton.addEventListener("click", function () {
  const plan = learningPlanOutput.value.trim();
  if (!plan) {
    sourceStatus.textContent = "Add content to the learning plan before saving.";
    return;
  }
  const blob = new Blob([plan + "\n"], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bud-ai-learning-plan.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  sourceStatus.textContent = "Learning plan saved to disk.";
});

function setMicStatus(message, isError) {
  micDetail.textContent = message;
  micDetail.classList.toggle("mic-active", !isError);
}

function connectLeaderAudioRoom() {
  if (!window.LivekitClient) {
    setMicStatus("LiveKit client is unavailable. Start the workshop services first.", true);
    return Promise.reject(new Error("LiveKit client is unavailable. Start the workshop services first."));
  }
  if (isLeaderRoomConnected()) return Promise.resolve(workshopRoom);
  if (workshopRoom && workshopRoom.disconnect) {
    try {
      workshopRoom.disconnect();
    } catch (error) {}
    workshopRoom = null;
  }
  connectButton.disabled = true;
  connectButton.textContent = "Connecting...";
  setMicStatus("Requesting room access...", false);
  return fetch("/api/livekit/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_name: roomNameInput.value.trim() || "BUD-101", participant_id: "facilitator-1", name: leaderName(), role: "facilitator" }) })
    .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
    .then(function (result) {
      if (!result.ok) throw new Error(result.body.error || "Unable to connect to the workshop");
      workshopRoom = new window.LivekitClient.Room({ adaptiveStream: true, dynacast: true });
      return workshopRoom.connect(result.body.url, result.body.token);
    })
    .then(function () {
      return waitForLeaderRoomConnected();
    })
    .then(function () {
      connectButton.textContent = "Connected for test";
      micButton.disabled = false;
      setMicStatus("Connected. Start the microphone test; another client in the room can receive the published audio.", false);
      updateSetupSequence();
      return workshopRoom;
    })
    .catch(function (error) {
      connectButton.disabled = false;
      connectButton.textContent = "Connect for test";
      setMicStatus(error.message, true);
      throw error;
    });
}

function isLeaderRoomConnected() {
  if (!workshopRoom) return false;
  const connectedState = window.LivekitClient && window.LivekitClient.ConnectionState &&
    (window.LivekitClient.ConnectionState.Connected || window.LivekitClient.ConnectionState.CONNECTED);
  return workshopRoom.state === "connected" || workshopRoom.state === "CONNECTED" ||
    Boolean(connectedState && workshopRoom.state === connectedState);
}

function waitForLeaderRoomConnected() {
  if (isLeaderRoomConnected()) return Promise.resolve(workshopRoom);
  return new Promise(function (resolve, reject) {
    const startedAt = Date.now();
    const timer = window.setInterval(function () {
      if (isLeaderRoomConnected()) {
        window.clearInterval(timer);
        resolve(workshopRoom);
        return;
      }
      if (Date.now() - startedAt > 5000) {
        window.clearInterval(timer);
        reject(new Error("LiveKit connected slowly. Try Talk in main room again."));
      }
    }, 100);
  });
}

connectButton.addEventListener("click", function () {
  connectLeaderAudioRoom().catch(function () {});
});

micButton.addEventListener("click", function () {
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
      micButton.textContent = "Mic ready";
      setMicStatus("Microphone test complete. The microphone is ready and currently off.", false);
    }).catch(function (error) {
      setMicStatus("Could not stop the microphone test: " + error.message, true);
    });
    return;
  }
  micButton.disabled = true;
  setMicStatus("Checking microphone capture and publishing the test track...", false);
  workshopRoom.localParticipant.setMicrophoneEnabled(true)
    .then(function (publication) {
      micCheck.textContent = "\u2611";
      micCheck.classList.add("is-complete");
      micCheck.setAttribute("aria-label", "Microphone test complete");
      toolsStatus.textContent = "Microphone ready";
      toolsStatus.classList.add("mic-active");
      micTestActive = true;
      micButton.disabled = false;
      micButton.textContent = "Stop test";
      setMicStatus("Microphone captured and published to the room. Confirm audibility from another connected client.", false);
      startMicMeter(publication);
      updateSetupSequence();
    })
    .catch(function (error) { micButton.disabled = false; setMicStatus("Microphone test failed: " + error.message + " Check browser permission and use localhost or HTTPS.", true); });
});

function toggleLeaderMainRoomTalk() {
  if (leaderMicrophoneLive) {
    stopLeaderMainRoomTalk();
    return;
  }
  roomTalkButton.disabled = true;
  setRoomTalkStatus("Connecting microphone to the main room...");
  connectLeaderAudioRoom()
    .then(enableLeaderMicrophone)
    .then(function (publication) {
      micTestActive = false;
      leaderMicrophoneLive = true;
      roomTalkButton.disabled = false;
      roomTalkButton.textContent = "Mute workshop mic";
      roomTalkButton.classList.add("is-talking");
      roomTalkButton.setAttribute("aria-pressed", "true");
      setRoomTalkStatus("Microphone live in the main room. Learners can hear you and captions are running.");
      setMicStatus("Microphone live in the main room.", false);
      reportLeaderPresence(true, true);
      startMicMeter(publication);
      startLeaderSpeechCapture(publication);
    })
    .catch(function (error) {
      roomTalkButton.disabled = false;
      setRoomTalkStatus(error.message);
    });
}

function enableLeaderMicrophone() {
  return workshopRoom.localParticipant.setMicrophoneEnabled(true)
    .catch(function (error) {
      if (error && /engine not connected/i.test(error.message || "")) {
        if (workshopRoom && workshopRoom.disconnect) {
          try {
            workshopRoom.disconnect();
          } catch (disconnectError) {}
        }
        workshopRoom = null;
        return connectLeaderAudioRoom().then(function () {
          return workshopRoom.localParticipant.setMicrophoneEnabled(true);
        });
      }
      throw error;
    });
}

function stopLeaderMainRoomTalk() {
  leaderMicrophoneLive = false;
  leaderSpeechActive = false;
  if (leaderSpeechRecorder && leaderSpeechRecorder.state === "recording") leaderSpeechRecorder.stop();
  stopLeaderVad();
  if (workshopRoom) workshopRoom.localParticipant.setMicrophoneEnabled(false).catch(function () {});
  if (micAnalyserFrame) {
    window.cancelAnimationFrame(micAnalyserFrame);
    micAnalyserFrame = null;
  }
  Array.prototype.forEach.call(micMeter.children, function (bar) {
    bar.classList.remove("active");
    bar.style.height = "6px";
  });
  roomTalkButton.textContent = "Unmute workshop mic";
  roomTalkButton.classList.remove("is-talking");
  roomTalkButton.setAttribute("aria-pressed", "false");
  setRoomTalkStatus("Talk is off.");
  setMicStatus("Microphone muted.", false);
  reportLeaderPresence(true, false);
  flushLeaderSentence();
}

function setRoomTalkStatus(message) {
  const status = document.querySelector("#room-talk-status");
  if (status) status.textContent = message;
}

function reportLeaderSpeaking() {
  fetch("/api/transcribe/speaking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: "facilitator-1",
      speech_sequence: leaderSpeechSequence
    })
  }).catch(function () {});
}

function flushLeaderSentence() {
  fetch("/api/transcribe/flush", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participant_id: "facilitator-1",
      room_name: roomNameInput.value.trim() || "BUD-101",
      native_language: leaderNativeLanguage.value || "en",
      target_language: leaderNativeLanguage.value || "en"
    })
  }).catch(function () {});
}

function reportLeaderPresence(connected, microphoneActive) {
  fetch("/api/topview/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connected: connected,
      participant_id: "facilitator-1",
      display_name: leaderName(),
      role: "facilitator",
      room_name: roomNameInput.value.trim() || "BUD-101",
      language: leaderNativeLanguage.value || "en",
      microphone_active: microphoneActive
    })
  }).catch(function () {});
}

function startLeaderSpeechCapture(publication) {
  if (!window.MediaRecorder || leaderSpeechActive) return;
  const activePublication = publication || (workshopRoom.localParticipant.getTrackPublication
    ? workshopRoom.localParticipant.getTrackPublication("microphone")
    : null);
  const mediaTrack = activePublication && activePublication.track && activePublication.track.mediaStreamTrack;
  const streamPromise = mediaTrack
    ? Promise.resolve(new MediaStream([mediaTrack]))
    : navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      : Promise.reject(new Error("Browser microphone access is unavailable. Use HTTPS or localhost and allow microphone permission."));
  streamPromise.then(function (stream) {
    leaderSpeechStream = stream;
    leaderSpeechActive = true;
    startLeaderVad(stream);
    recordLeaderSpeechChunk();
  }).catch(function (error) {
    setRoomTalkStatus("Speech capture unavailable: " + error.message);
  });
}

function startLeaderVad(stream) {
  stopLeaderVad();
  leaderVadEnabled = false;
  if (!window.AudioContext) return;
  leaderVadContext = new window.AudioContext();
  leaderVadAnalyser = leaderVadContext.createAnalyser();
  leaderVadAnalyser.fftSize = 256;
  leaderVadContext.createMediaStreamSource(stream).connect(leaderVadAnalyser);
  leaderVadData = new Uint8Array(leaderVadAnalyser.frequencyBinCount);
  leaderVadEnabled = true;
  leaderVadTimer = window.setInterval(function () {
    if (!leaderSpeechActive) return;
    leaderVadAnalyser.getByteFrequencyData(leaderVadData);
    let total = 0;
    leaderVadData.forEach(function (value) { total += value; });
    const level = total / leaderVadData.length / 48;
    const now = Date.now();
    if (level >= SPEECH_LEVEL_THRESHOLD) {
      if (!leaderHeardInChunk) {
        leaderFirstHeardAt = now;
        reportLeaderSpeaking();
      }
      leaderHeardInChunk = true;
      leaderLastHeardAt = now;
    }
    if (!leaderSpeechRecorder || leaderSpeechRecorder.state !== "recording") return;
    const elapsed = now - leaderChunkStartedAt;
    if (leaderHeardInChunk) {
      if (now - leaderLastHeardAt >= SPEECH_PAUSE_MS || elapsed >= SPEECH_MAX_UTTERANCE_MS) {
        leaderSpeechRecorder.stop();
      }
    } else if (elapsed >= SPEECH_IDLE_RECYCLE_MS) {
      leaderSpeechRecorder.stop();
    }
  }, SPEECH_VAD_INTERVAL_MS);
}

function stopLeaderVad() {
  if (leaderVadTimer) {
    window.clearInterval(leaderVadTimer);
    leaderVadTimer = null;
  }
  if (leaderVadContext) {
    leaderVadContext.close().catch(function () {});
    leaderVadContext = null;
  }
  leaderVadAnalyser = null;
  leaderVadData = null;
}

function recordLeaderSpeechChunk() {
  if (!leaderSpeechActive) return;
  leaderSpeechRecorder = new MediaRecorder(leaderSpeechStream, { mimeType: "audio/webm" });
  leaderSpeechRecorder.ondataavailable = function (event) {
    if (leaderVadEnabled && !leaderHeardInChunk) return;
    if (!event.data || event.data.size === 0) return;
    const speechSequence = leaderSpeechSequence;
    const uploadedAt = Date.now();
    fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "audio/webm",
        "X-Participant-Id": "facilitator-1",
        "X-Display-Name": leaderName(),
        "X-Room-Name": roomNameInput.value.trim() || "BUD-101",
        "X-Group-Id": "group-main",
        "X-Native-Language": leaderNativeLanguage.value || "en",
        "X-Target-Language": leaderNativeLanguage.value || "en",
        "X-Speech-Sequence": String(speechSequence),
        "X-Speech-Lead-Ms": String(Math.max(0, uploadedAt - (leaderFirstHeardAt || uploadedAt))),
        "X-Speech-Silence-Ms": String(Math.max(0, uploadedAt - (leaderLastHeardAt || uploadedAt)))
      },
      body: event.data
    }).then(function (response) {
      return response.json();
    }).then(function (payload) {
      if (payload.transcript && payload.transcript.ignored) {
        setRoomTalkStatus("Speech ignored because it was not detected as the selected language.");
        return;
      }
      if (payload.transcript && payload.transcript.text) {
        setRoomTalkStatus("Captioned: " + payload.transcript.text);
      }
    }).catch(function () {
      setRoomTalkStatus("Whisper service unavailable");
    });
  };
  leaderSpeechRecorder.onstop = function () {
    if (leaderSpeechActive) recordLeaderSpeechChunk();
  };
  leaderHeardInChunk = false;
  leaderChunkStartedAt = Date.now();
  leaderLastHeardAt = leaderChunkStartedAt;
  leaderFirstHeardAt = 0;
  leaderSpeechSequence += 1;
  leaderSpeechRecorder.start();
  if (!leaderVadEnabled) {
    window.setTimeout(function () {
      if (leaderSpeechRecorder && leaderSpeechRecorder.state === "recording") leaderSpeechRecorder.stop();
    }, 4000);
  }
}

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
    const level = values.reduce(function (total, value) { return total + value; }, 0) / values.length;
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
