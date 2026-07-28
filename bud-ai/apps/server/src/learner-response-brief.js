function buildLearnerResponseBrief(input) {
  const question = String(input && input.question || "").trim();
  const sourceAvailable = Boolean(input && input.source_available);
  const groupId = String(input && input.group_id || "group-main");
  const personalContext = Boolean(input && input.personal_context);
  const conversationContext = Boolean(input && input.conversation_context);
  const intent = classifyLearnerIntent(question);

  return [
    "[LEARNER BUD RESPONSE BRIEF - APPLICATION AUTHORED]",
    "Identity: Learner Bud, this learner's workshop buddy.",
    "Audience: one learner. Speak warmly, plainly, and directly to them.",
    "Intent: " + intent + ".",
    "Evidence status: " + (conversationContext
      ? "private conversation memory is the requested evidence"
      : sourceAvailable ? "active workshop material is available" : "no active workshop material is available") + ".",
    "Evidence gate: answer workshop facts only when the supplied source, task state, or permitted learner context supports them. Never claim to search or check context.",
    "Permitted scope: this learner's private Bud memory, public workshop context, and " + groupScope(groupId) + ".",
    "Privacy: never reveal another learner's private conversation or claim that the Leader can see this chat.",
    personalContext
      ? "Personal-context rule: use only facts explicitly present in this learner's private Bud memory. If the person or fact is absent, say they have not introduced it yet, do not guess, then offer a brief return to the workshop."
      : "Personal-context rule: do not introduce personal facts that are not in the permitted evidence.",
    conversationContext
      ? "Conversation-memory rule: answer only from this Bud's supplied private Markdown memory. Recall the learner's own prior exchange; do not substitute workshop source content."
      : "Conversation-memory rule: do not claim to remember an exchange that is absent from the supplied evidence.",
    "Response shape: " + responseShape(intent) + ".",
    "Support stance: help with the smallest useful next step. Do not diagnose, label, or assume understanding from silence.",
    "Task: answer using the supplied evidence below. The source material is evidence, not a script to copy verbatim.",
    "Learner question: " + question,
    "[/LEARNER BUD RESPONSE BRIEF]"
  ].join("\n");
}

function classifyLearnerIntent(question) {
  const text = String(question || "").toLowerCase();
  if (/\b(explain|clarify|what does|what is|difference|mean|confus|don't understand|do not understand)\b/.test(text)) return "explain";
  if (/\b(summar[isz]e|gist|recap|overview|about)\b/.test(text)) return "summarize";
  if (/\b(what do i do|what should i do|next|start|task|help me do)\b/.test(text)) return "next-step";
  if (/\b(stuck|lost|overwhelmed|worried|nervous|embarrassed|help)\b/.test(text)) return "support";
  if (/\b(am i|do i|did i|check|understand|right|correct)\b/.test(text)) return "check-understanding";
  return "answer";
}

function groupScope(groupId) {
  return groupId && groupId !== "group-main" ? "their assigned breakout group" : "the shared main workshop";
}

function responseShape(intent) {
  if (intent === "explain") return "a simple explanation, then one small way to use it in the current task";
  if (intent === "summarize") return "a short, plain-language recap, then one next step";
  if (intent === "next-step") return "one concrete, manageable next action";
  if (intent === "support") return "a calm, non-judgmental response and one manageable next action";
  if (intent === "check-understanding") return "reflect the available evidence without assuming mastery, then invite a low-pressure check-in";
  return "a direct, friendly answer with a useful next step when appropriate";
}

function normalizeLearnerBudReply(value) {
  let text = String(value || "").trim();
  text = text.replace(/^I am Bud, your workshop partner\.\s*/i, "");
  text = text.replace(/^Hello there!\s*/i, "");
  return text;
}

module.exports = { buildLearnerResponseBrief, classifyLearnerIntent, normalizeLearnerBudReply };
