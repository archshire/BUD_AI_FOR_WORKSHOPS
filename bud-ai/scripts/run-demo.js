const { createBudRuntime } = require("../apps/server/src/runtime");
const { demoEvents } = require("../packages/test-fixtures/src/demo-events");

const runtime = createBudRuntime();

console.log("Bud AI text-first demo");
console.log("======================");

demoEvents.forEach((event) => {
  const result = runtime.handleEvent(event);
  console.log("");
  console.log(event.event_id + " -> " + result.decision.decision_type + " (" + result.decision.surface + ")");
  console.log("rationale: " + result.decision.rationale);
  if (result.toolResults.length) {
    result.toolResults.forEach((toolResult) => {
      console.log("tool: " + toolResult.tool_name + " -> " + toolResult.status);
    });
  }
});

console.log("");
console.log("Final state summary");
console.log(JSON.stringify({
  messages: runtime.getStateSnapshot().messages,
  facilitator_signals: runtime.getStateSnapshot().workshop.facilitator_signals,
  participant_ids: Object.keys(runtime.getStateSnapshot().participants),
  group_status: runtime.getStateSnapshot().groups["group-main"].shared_meaning.status
}, null, 2));

