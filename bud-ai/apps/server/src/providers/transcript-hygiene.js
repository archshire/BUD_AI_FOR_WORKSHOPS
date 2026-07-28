// Whisper was trained on subtitled video. Handed background noise with no speech in
// it, it does not return nothing — it returns the text that pads the end of those
// subtitle tracks, in whichever language it thinks it is hearing. The Chinese YouTube
// sign-off ("请不吝点赞 订阅 转发 打赏支持明镜与点点栏目") is the most notorious, but
// every language has its own, and a noisy room produces them over and over.
//
// This runs on the transcript regardless of which provider produced it, because the
// hosted provider returns plain text with no chance to filter earlier. The local
// container does its own numeric filtering first (apps/stt/whisper_service.py); this
// is the layer that catches what survives, and the only layer Groq gets.

// Phrases that are the whole invention. Matched against normalised text, so
// punctuation and spacing in the model's output do not matter.
const STOCK_PHRASES = new Set([
  // English
  "thank you", "thank you very much", "thanks for watching", "thank you for watching",
  "please subscribe", "subscribe to my channel", "like and subscribe", "see you next time",
  "bye", "bye bye", "the end", "you", "okay", "so", "hmm", "uh", "um",
  "subtitles by the amaraorg community", "transcription by castingwords",
  // Chinese — subtitle-track sign-offs and the fillers noise resolves to
  "请不吝点赞 订阅 转发 打赏支持明镜与点点栏目",
  "请不吝点赞订阅转发打赏支持明镜与点点栏目",
  "谢谢观看", "感谢观看", "谢谢大家", "谢谢收看", "请订阅", "点赞订阅", "下集见", "再见",
  "好", "好的", "好吧", "嗯", "啊", "哦", "是", "对", "对的", "谢谢", "你好", "早安", "晚安",
  "字幕志愿者", "中文字幕志愿者",
  // Spanish
  "gracias", "muchas gracias", "sí", "hola", "adiós", "suscríbete",
  // French
  "merci", "merci beaucoup", "sous-titrage société radio-canada", "au revoir",
  // Thai / Burmese fillers that noise commonly resolves to
  "ครับ", "ค่ะ", "ขอบคุณ", "ကျေးဇူးတင်ပါတယ်"
]);

// Fragments that mark the whole line as a subtitle artefact even when the model wraps
// extra words around them. Checked as substrings of the normalised text.
const STOCK_FRAGMENTS = [
  "明镜与点点",
  "请不吝点赞",
  "打赏支持",
  "优优独播剧场",
  "yoyo television",
  "字幕由",
  "本字幕",
  "amaraorg",
  "castingwords",
  "subscribe to my channel",
  "thanks for watching",
  "please subscribe",
  "sous-titrage société"
];

// Punctuation across the scripts this prototype handles, including the full-width
// CJK marks — stripping only ASCII punctuation leaves "好。" unequal to "好".
const PUNCTUATION = /[\s.,!?…、。，！？；：""''「」『』（）()\-–—~・]+/g;

function normalize(text) {
  return String(text || "").toLowerCase().replace(PUNCTUATION, " ").trim();
}

// A chunk with no letters or digits in it at all — "。。。", "♪♪♪", "[music]" — is not
// speech whatever the model called it.
function hasNoWords(normalized) {
  return !/[\p{L}\p{N}]/u.test(normalized);
}

function isStockPhrase(text) {
  const normalized = normalize(text);
  if (!normalized) return true;
  if (hasNoWords(normalized)) return true;
  if (STOCK_PHRASES.has(normalized)) return true;
  // Whitespace-insensitive too: Whisper spaces Chinese inconsistently between runs.
  if (STOCK_PHRASES.has(normalized.replace(/\s+/g, ""))) return true;
  const squashed = normalized.replace(/\s+/g, "");
  return STOCK_FRAGMENTS.some(function (fragment) {
    return squashed.indexOf(fragment.replace(/\s+/g, "")) !== -1;
  });
}

// A model that starts looping repeats the same phrase until the chunk runs out
// ("好。好。好。好。"). Keep the first occurrence and drop the echoes.
function collapseRepeats(text) {
  const parts = String(text || "").split(/(?<=[.!?…。！？])\s*/).filter(function (part) {
    return part.trim();
  });
  if (parts.length < 2) return collapseCharacterRuns(text);
  const kept = [];
  parts.forEach(function (part) {
    const previous = kept.length ? normalize(kept[kept.length - 1]) : null;
    if (previous !== null && normalize(part) === previous) return;
    kept.push(part.trim());
  });
  return collapseCharacterRuns(kept.join(" "));
}

// The same loop without sentence punctuation to split on ("好好好好好好"), which is what
// a looping decoder produces in Chinese. Three or more repeats of a short run is not
// something a speaker says; two might be ("谢谢谢谢").
function collapseCharacterRuns(text) {
  return String(text || "").replace(/(.{1,8}?)\1{2,}/gu, "$1");
}

// Real speech does not repeat itself word for word across consecutive utterances; a
// model looping on room noise does nothing else. Keyed per speaker so two people
// saying the same thing are not confused for one person repeating.
const REPEAT_WINDOW_MS = 60000;
const lastAccepted = {};

function isImmediateRepeat(participantId, text, now) {
  const key = String(participantId || "unknown");
  const previous = lastAccepted[key];
  const normalized = normalize(text);
  if (!previous) return false;
  if (now - previous.at > REPEAT_WINDOW_MS) return false;
  return previous.text === normalized;
}

function remember(participantId, text, now) {
  lastAccepted[String(participantId || "unknown")] = { text: normalize(text), at: now };
}

// Returns the text to keep, which is "" when the whole chunk was invention. `reason` is
// for the log line — a dropped utterance the operator cannot account for looks like a
// bug in the microphone rather than a filter doing its job.
function cleanTranscript(text, options) {
  const settings = options || {};
  const now = settings.now || Date.now();
  const raw = String(text || "").trim();
  if (!raw) return { text: "", dropped: false, reason: "" };

  const collapsed = collapseRepeats(raw).trim();
  if (isStockPhrase(collapsed)) {
    return { text: "", dropped: true, reason: "stock subtitle phrase or filler: " + JSON.stringify(collapsed.slice(0, 60)) };
  }
  if (isImmediateRepeat(settings.participantId, collapsed, now)) {
    return { text: "", dropped: true, reason: "verbatim repeat of the previous utterance" };
  }
  remember(settings.participantId, collapsed, now);
  return { text: collapsed, dropped: false, reason: collapsed === raw ? "" : "collapsed repeated phrase" };
}

module.exports = {
  cleanTranscript,
  isStockPhrase,
  collapseRepeats,
  normalize
};
