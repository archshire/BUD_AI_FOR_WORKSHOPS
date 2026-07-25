function createDevTranslationProvider() {
  return {
    name: "dev-translation",
    translate: function translate(input) {
      return Promise.resolve({
        translated_text: "[dev translation to " + input.target_language + "] " + input.original_text,
        confidence: {
          level: "unknown",
          rationale: "Development provider does not perform real translation."
        }
      });
    }
  };
}

function createDevLlmProvider() {
  return {
    name: "dev-llm",
    decide: function decide() {
      return Promise.resolve({
        error: "Dev LLM provider is not wired; Bud Core uses deterministic scaffold logic."
      });
    }
  };
}

module.exports = {
  createDevTranslationProvider,
  createDevLlmProvider
};

