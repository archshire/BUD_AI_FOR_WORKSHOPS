// Translation via a general LLM rather than NLLB-200-distilled-600M.
//
// NLLB is a small model trained on clean, complete sentences and translates each one
// cold. Live speech is none of those things, which is why its output degraded so
// badly. An LLM given the surrounding conversation, the workshop topic, and the
// relevant slide text resolves pronouns, carries terminology, and copes with
// fragments — that context is where most of the quality comes from, not the model
// swap alone.
//
// Two backends: Gemini (hosted, free tier, best on Burmese and Chinese) and the Qwen
// service already running in this stack (no network, no key, weaker). Returns the
// same shape as apps/translation/nllb_service.py so callers cannot tell them apart.

const GEMINI_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";
const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
// Chosen for latency as much as quality: it answers a caption-length translation in
// well under a second, which is what a live panel needs. The Qwen model Groq also
// serves emits its reasoning as visible text, so it is not usable here.
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const REQUEST_TIMEOUT_MS = 20000;
// Generous because on a reasoning model this budget covers the model's private
// thinking as well as the translation itself. See callGemini.
const MAX_OUTPUT_TOKENS = 2048;
const MAX_RECENT_TURNS = 4;
const MAX_GLOSSARY_CHARS = 1200;

const LANGUAGE_NAMES = {
  en: "English",
  es: "Spanish",
  zh: "Chinese (Simplified)",
  my: "Burmese (Myanmar)",
  fr: "French",
  th: "Thai",
  ms: "Malay"
};

function languageName(code) {
  return LANGUAGE_NAMES[String(code || "").trim().toLowerCase()] || String(code || "unknown");
}

function llmTranslateBackend() {
  const configured = String(process.env.TRANSLATION_PROVIDER || "").trim().toLowerCase();
  if (configured === "groq" || configured === "gemini" || configured === "qwen" || configured === "nllb") return configured;
  // Nothing explicit: prefer Groq, which is the same key the speech-to-text already
  // uses, then Gemini, then stay on NLLB so behaviour does not change silently for an
  // unconfigured checkout.
  if (process.env.GROQ_API_KEY) return "groq";
  return process.env.GEMINI_API_KEY ? "gemini" : "nllb";
}

function llmTranslateConfigured() {
  const backend = llmTranslateBackend();
  if (backend === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (backend === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  if (backend === "qwen") return Boolean(process.env.LLM_HOST || process.env.LLM_PORT);
  return false;
}

function buildSystemPrompt(sourceLanguage, targetLanguage) {
  return [
    "You are a live interpreter for a multilingual workshop.",
    "Translate the speaker's words from " + languageName(sourceLanguage) + " into " + languageName(targetLanguage) + ".",
    "",
    "Rules:",
    "- Output ONLY the translation. No preamble, no quotes, no notes, no romanisation.",
    "- This is transcribed speech, so it may be a fragment or mid-sentence. Translate what is there; do not invent an ending or fill gaps.",
    "- Use the conversation history and workshop material for terminology, names, and pronouns. Keep a term translated the same way each time it appears.",
    "- Preserve the speaker's register and tone. Keep it natural in " + languageName(targetLanguage) + " rather than word-for-word.",
    "- If the input is empty, inaudible, or not real speech, return an empty response."
  ].join("\n");
}

function buildUserPrompt(input) {
  const sections = [];

  if (input.workshopPrompt) {
    sections.push("Workshop topic:\n" + input.workshopPrompt);
  }

  const glossary = String(input.sourceText || "").trim();
  if (glossary) {
    sections.push("Workshop material (use for terminology only, do not translate this):\n" + glossary.slice(0, MAX_GLOSSARY_CHARS));
  }

  const recent = (input.recentTurns || []).slice(-MAX_RECENT_TURNS);
  if (recent.length) {
    sections.push("What this speaker said just before (already translated):\n" + recent.map(function (turn) {
      return "- " + turn;
    }).join("\n"));
  }

  sections.push("Translate this into " + languageName(input.targetLanguage) + ":\n" + input.text);
  return sections.join("\n\n");
}

// LLMs habitually wrap output in quotes or prefix it with "Translation:" despite
// being told not to. Strip the common shapes rather than shipping them to a learner.
function cleanTranslation(raw) {
  let text = String(raw || "").trim();
  // Some open models narrate their reasoning inside <think> tags before answering.
  // That is working notes, not a translation, and must never reach a caption.
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^(translation|translated text|output)\s*[:：]\s*/i, "");
  text = text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
  if (text.length > 1) {
    const first = text[0];
    const last = text[text.length - 1];
    const pairs = { '"': '"', "'": "'", "“": "”", "「": "」", "«": "»" };
    if (pairs[first] === last) text = text.slice(1, -1);
  }
  return text.trim();
}

async function callGemini(systemPrompt, userPrompt) {
  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const base = (process.env.GEMINI_BASE_URL || GEMINI_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = base + "/models/" + encodeURIComponent(model) + ":generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        candidateCount: 1,
        // Recent Gemini models reason before answering, and those hidden thinking
        // tokens are charged against maxOutputTokens. At the old budget of 512 a
        // single caption spent ~490 tokens thinking and had ~16 left to answer in, so
        // translations came back chopped off mid-clause — the sentence looked cut by
        // the microphone when it had actually been cut by the token budget. There is
        // nothing to reason about in translating one spoken line, so ask for as little
        // thinking as the model allows. Ignored by models that do not think.
        thinkingConfig: { thinkingLevel: "low" }
      }
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    const detail = await response.text().catch(function () { return ""; });
    // Long enough to keep the part that says WHY. The quota errors this API returns
    // put the model name, the limit and the retry delay well past 200 characters, and
    // truncating them turned a five-second diagnosis into a long one.
    throw new Error("Gemini returned HTTP " + response.status + (detail ? ": " + detail.slice(0, 800) : ""));
  }

  const payload = await response.json();
  const candidate = (payload.candidates || [])[0];
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const text = parts.map(function (part) { return part.text || ""; }).join("");

  // A translation that stopped early is worse than no translation: it reads as a
  // complete thought that quietly loses its ending. Fail so the caller falls back.
  if (candidate && candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(
      "Gemini stopped early (" + candidate.finishReason + ") after " +
      ((payload.usageMetadata || {}).thoughtsTokenCount || 0) + " thinking tokens"
    );
  }

  return { text: text, provider: model };
}

// Groq serves open models behind an OpenAI-compatible endpoint, on the same key the
// speech-to-text already uses. Added because the Gemini free tier turned out to allow
// 20 translations per day, which is not a live captioning service.
async function callGroq(systemPrompt, userPrompt) {
  const model = process.env.GROQ_TRANSLATE_MODEL || GROQ_DEFAULT_MODEL;
  const base = (process.env.GROQ_BASE_URL || GROQ_DEFAULT_BASE_URL).replace(/\/+$/, "");

  const response = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.GROQ_API_KEY
    },
    body: JSON.stringify({
      model: model,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    const detail = await response.text().catch(function () { return ""; });
    throw new Error("Groq returned HTTP " + response.status + (detail ? ": " + detail.slice(0, 800) : ""));
  }

  const payload = await response.json();
  const choice = (payload.choices || [])[0];
  if (choice && choice.finish_reason === "length") {
    throw new Error("Groq stopped early: the translation was cut off");
  }
  return {
    text: (choice && choice.message && choice.message.content) || "",
    provider: model
  };
}

async function callLocalQwen(systemPrompt, userPrompt) {
  const host = process.env.LLM_HOST || "127.0.0.1";
  const port = Number(process.env.LLM_PORT || 8790);
  const response = await fetch("http://" + host + ":" + port + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, user: userPrompt, max_tokens: 300 }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error("Local Qwen returned HTTP " + response.status);
  }

  const payload = await response.json();
  if (payload.error) throw new Error("Local Qwen error: " + payload.error);
  return { text: payload.text || "", provider: payload.provider || "qwen-local" };
}

// input: { text, sourceLanguage, targetLanguage, workshopPrompt, recentTurns, sourceText }
async function translateWithLlm(input) {
  const backend = llmTranslateBackend();
  if (!llmTranslateConfigured()) {
    throw new Error("No LLM translation backend is configured");
  }

  const text = String(input.text || "").trim();
  if (!text) return { translated_text: "", provider: "llm-" + backend };

  const systemPrompt = buildSystemPrompt(input.sourceLanguage, input.targetLanguage);
  const userPrompt = buildUserPrompt(Object.assign({}, input, { text }));
  let result;
  if (backend === "qwen") {
    result = await callLocalQwen(systemPrompt, userPrompt);
  } else if (backend === "groq") {
    result = await callGroq(systemPrompt, userPrompt);
  } else {
    result = await callGemini(systemPrompt, userPrompt);
  }

  const translated = cleanTranslation(result.text);
  if (!translated) {
    throw new Error("LLM translation returned an empty result");
  }

  return {
    translated_text: translated,
    source_language: input.sourceLanguage,
    target_language: input.targetLanguage,
    provider: result.provider
  };
}

module.exports = {
  llmTranslateBackend,
  llmTranslateConfigured,
  translateWithLlm,
  cleanTranslation,
  buildSystemPrompt,
  buildUserPrompt
};
