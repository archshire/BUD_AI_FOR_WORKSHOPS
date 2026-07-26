function resolveHelpStuckContext(state, event) {
  const sourcePackContext = event.payload && event.payload.source_pack_context;
  if (sourcePackContext && sourcePackContext.text) {
    return {
      status: "resolved_source_pack",
      items: [{
        event_id: event.event_id,
        status: "current",
        scope: "public_shared",
        text: sourcePackContext.text
      }],
      refs: [{ event_id: event.event_id }],
      missing_refs: []
    };
  }
  const contextIds = event.payload.context_event_ids || [];
  const requestedRefs = contextIds.map((eventId) => ({ event_id: eventId }));
  const contextItems = contextIds
    .map((eventId) => findEvidence(state, eventId))
    .filter((item) => item && item.status === "current" && item.text && isPermittedContext(item, event));

  if (contextItems.length) {
    return {
      status: "resolved",
      items: contextItems,
      refs: contextItems.map((item) => ({ event_id: item.event_id })),
      missing_refs: requestedRefs.filter((ref) => !findEvidence(state, ref.event_id))
    };
  }

  const fallbackItems = recentSharedWorkshopContext(state);
  if (fallbackItems.length) {
    return {
      status: "fallback_recent_context",
      items: fallbackItems,
      refs: fallbackItems.map((item) => ({ event_id: item.event_id })),
      missing_refs: requestedRefs
    };
  }

  return {
    status: "missing",
    items: [],
    refs: [],
    missing_refs: requestedRefs
  };
}

function buildSimplifiedExplanation(contextItems) {
  const primary = contextItems[0];
  const contextText = normalizeText(primary.text);
  return [
    "Here is the current idea in simpler terms:",
    contextText,
    "A practical next step is to name what the task is asking for, then compare your draft against that prompt."
  ].join(" ");
}

function findEvidence(state, eventId) {
  if (!state || !state.workshop || !Array.isArray(state.workshop.evidence_index)) {
    return null;
  }
  return state.workshop.evidence_index.find((item) => item.event_id === eventId) || null;
}

function recentSharedWorkshopContext(state) {
  if (!state || !state.workshop || !Array.isArray(state.workshop.evidence_index)) {
    return [];
  }
  return state.workshop.evidence_index
    .filter((item) => item.status === "current" && item.text && item.scope !== "private_participant_ai")
    .filter((item) => item.event_type === "facilitator_instruction" || item.kind === "transcript" || item.kind === "original_text")
    .slice(-3)
    .reverse();
}

function isPermittedContext(item, event) {
  if (item.scope !== "private_participant_ai") {
    return true;
  }
  const requesterId = event.actor && event.actor.participant_id;
  return item.participant_id && requesterId && item.participant_id === requesterId;
}

function normalizeText(text) {
  const singleLine = String(text || "").replace(/\s+/g, " ").trim();
  if (singleLine.length <= 220) {
    return singleLine;
  }
  return singleLine.slice(0, 217).trim() + "...";
}

module.exports = {
  resolveHelpStuckContext,
  buildSimplifiedExplanation
};
