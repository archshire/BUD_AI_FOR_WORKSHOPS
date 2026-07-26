// Hosted speech-to-text via Groq, which serves whisper-large-v3 — a much larger and
// more accurate model than the "small" build the local container can run on CPU.
// Same request/response shape as apps/stt/whisper_service.py so the two are
// interchangeable behind transcribeAudio().

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "whisper-large-v3";
const REQUEST_TIMEOUT_MS = 20000;

// Overridable so the same code can target a proxy, a stub, or any other
// OpenAI-compatible transcription endpoint.
function transcribeUrl() {
  const base = (process.env.GROQ_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return base + "/audio/transcriptions";
}

function groqSttConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

function groqSttModel() {
  return process.env.GROQ_STT_MODEL || DEFAULT_MODEL;
}

// verbose_json reports the language as a full English name ("english", "burmese"),
// but the rest of Bud speaks ISO codes. Map the languages this prototype supports and
// leave anything else as "und" so it is visibly unknown rather than quietly wrong.
const LANGUAGE_CODES = {
  english: "en",
  spanish: "es",
  chinese: "zh",
  mandarin: "zh",
  burmese: "my",
  myanmar: "my",
  french: "fr",
  thai: "th"
};

function toLanguageCode(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (LANGUAGE_CODES[raw]) return LANGUAGE_CODES[raw];
  // Already an ISO code we recognise.
  const codes = Object.keys(LANGUAGE_CODES).map(function (name) { return LANGUAGE_CODES[name]; });
  return codes.indexOf(raw) === -1 ? "" : raw;
}

function extensionFor(contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.indexOf("webm") !== -1) return "webm";
  if (type.indexOf("ogg") !== -1) return "ogg";
  if (type.indexOf("mp4") !== -1 || type.indexOf("m4a") !== -1) return "m4a";
  if (type.indexOf("mpeg") !== -1 || type.indexOf("mp3") !== -1) return "mp3";
  return "wav";
}

// Resolves with the same object the local Whisper service returns, so callers do not
// need to know which provider produced it.
async function transcribeWithGroq(audio, contentType, languageHint) {
  if (!groqSttConfigured()) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const model = groqSttModel();
  const form = new FormData();
  form.append("file", new Blob([audio], { type: contentType || "audio/webm" }), "utterance." + extensionFor(contentType));
  form.append("model", model);
  // verbose_json is what carries the detected language back when no hint was given.
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  if (languageHint) form.append("language", languageHint);

  const response = await fetch(transcribeUrl(), {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.GROQ_API_KEY },
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    const detail = await response.text().catch(function () { return ""; });
    throw new Error("Groq STT returned HTTP " + response.status + (detail ? ": " + detail.slice(0, 200) : ""));
  }

  const payload = await response.json();
  return {
    text: String(payload.text || "").trim(),
    language: languageHint || toLanguageCode(payload.language) || "und",
    // Groq does not report a detection confidence. A supplied hint is authoritative,
    // so report full confidence there and stay neutral when the language was guessed.
    language_probability: languageHint ? 1 : 0,
    provider: "groq-" + model
  };
}

module.exports = {
  groqSttConfigured,
  groqSttModel,
  transcribeWithGroq
};
