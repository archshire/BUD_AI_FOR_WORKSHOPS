const { createInMemoryStateStore } = require("./state/in-memory-state-store");
const { decide } = require("./core/bud-core");
const { executeDecisionTools } = require("./tools/tool-executor");
const { generateParticipationObservations } = require("./observation/participation-observer");
const { validateNormalizedEvent, validateAiDecision } = require("../../../packages/contracts/src/validators");

function createBudRuntime(options) {
  const state = createInMemoryStateStore(options && options.initialState);

  function handleEvent(event) {
    validateNormalizedEvent(event);
    if (event.actor && event.actor.actor_type === "participant" && event.actor.participant_id) {
      state.ensureParticipant(event.actor.participant_id);
    }
    state.recordEvent(event);

    const decision = decide({
      event,
      state: state.getSnapshot()
    });

    validateAiDecision(decision);
    const toolResults = executeDecisionTools(decision, state);

    return {
      event,
      decision,
      toolResults,
      state: state.getSnapshot()
    };
  }

  function observeParticipation(options) {
    const observations = generateParticipationObservations(state.getSnapshot(), options);
    return observations.map(handleEvent);
  }

  function recordSharedMessage(message) {
    state.addSharedMessage(message);
  }

  function recordPrivateMessage(message) {
    state.addMessage(Object.assign({}, message, { scope: message.scope || "private_participant_ai" }));
  }

  function recordTaskResponse(response) {
    state.recordTaskResponse(response);
  }

  function recordFacilitatorSignal(signal) {
    state.addFacilitatorSignal(signal);
  }

  function ensureParticipant(participantId) {
    state.ensureParticipant(participantId);
  }

  function clearRoomConversation(roomName) {
    state.clearRoomConversation(roomName);
  }

  return {
    handleEvent,
    observeParticipation,
    recordSharedMessage,
    recordPrivateMessage,
    recordTaskResponse,
    recordFacilitatorSignal,
    ensureParticipant,
    clearRoomConversation,
    getStateSnapshot: state.getSnapshot
  };
}

module.exports = { createBudRuntime };
