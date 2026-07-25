# PROVIDER_ABSTRACTION_PLAN

## Status

Draft provider abstraction plan for Bud AI MVP.

## Purpose

Bud should be able to start with development providers and later swap in real STT, translation, and LLM services without changing core contracts. The default local provider direction is now locked for the prototype, while exact runtime tuning remains open.

## Locked Prototype Default

- **LLM/reasoning and text translation:** `Qwen/Qwen3-8B`.
- **Voice transcription:** a separate Whisper-family STT provider.
- **Qwen mode:** non-thinking mode for the low-latency path.

Qwen3-8B is the selected default because it offers multilingual instruction following/translation, local deployment options, structured/tool-use compatibility, non-thinking mode, and an Apache 2.0 license at a more practical starting size than 24B-class alternatives. Whisper remains separate because speech recognition is a distinct audio model responsibility.

The exact Whisper variant, quantization, hardware target, and measured performance remain open until benchmarked against the prototype's 300 ms acknowledgement, 1.5 second target, and 3 second total deadline. The first verified two-language translation route is a dedicated local NLLB CTranslate2 service. The prototype target set is English, Spanish, Simplified Chinese, Burmese, and French; Qwen remains the broader local reasoning/text-translation direction for later benchmarked routing.

### Current Demo Runtime Choice

The current CPU-only demo uses `Qwen3-1.7B.Q4_K_M.gguf` through a local
`llama-cpp-python` service on port 8790. This is a hardware-constrained
prototype choice; the larger 8B direction remains the future benchmarked
upgrade. The same Qwen service powers learner **Bud** and facilitator
**Facil-Bud**, while their prompts, state targets, and privacy scopes remain
separate.

## Provider Interfaces

### STT Provider

```ts
type SttProvider = {
  name: string;
  transcribeStream(input: AudioStreamInput): AsyncIterable<SttPartial>;
};

type SttPartial = {
  text: string;
  language?: string;
  is_final_fragment: boolean;
  confidence?: number;
};
```

Output maps to:

- `participant_utterance`
- `utterance_completed`

### Utterance Completion

```ts
type UtteranceBoundaryDetector = {
  accept(partial: SttPartial): UtteranceBoundaryResult;
};

type UtteranceBoundaryResult = {
  complete: boolean;
  reason?: "silence" | "punctuation" | "turn_change" | "manual_send" | "timeout" | "adapter_signal";
  text?: string;
};
```

This component may be provider-independent.

### Translation Provider

```ts
type TranslationProvider = {
  name: string;
  translate(input: TranslationInput): Promise<TranslationOutput>;
};

Prototype translation route:

- `nllb-200-distilled-600M-ct2-int8` runs locally through CTranslate2.
- The initial verified pair is English <-> Spanish.
- The prototype selector also exposes Simplified Chinese, Burmese, and French;
  each target must be benchmarked for quality and latency before being treated
  as production-ready.
- Original transcript, translated text, and later interpretation remain
  separate evidence records.
- The model's license and language quality must be reviewed before broader
  or commercial deployment.

type TranslationInput = {
  original_text: string;
  original_language: string;
  target_language: string;
  context: TranslationContext;
};

type TranslationOutput = {
  translated_text: string;
  confidence?: {
    level: "unknown" | "low" | "medium" | "high";
    rationale: string;
  };
};
```

Output maps to `translation_completed`.

### LLM Provider

```ts
type LlmProvider = {
  name: string;
  decide(input: BudDecisionInput): Promise<unknown>;
};
```

The raw output must validate against `AiDecision`. Invalid output is rejected and converted to a recoverable failure path.

## Development Providers

Use development providers before real API wiring:

- `DevSttProvider`: converts typed text or fixture audio transcripts into STT partials.
- `DevTranslationProvider`: deterministic dictionary or pass-through translation with visible provider label.
- `DevLlmProvider`: rule-assisted structured decisions for contract testing.
- `LocalNllbTranslationService`: local NLLB translation for the prototype
  language set, with English/Spanish as the first verified pair.

Development providers must be clearly labeled in UI/logs when used.

## Real Provider Selection Criteria

### STT

- Streaming support.
- Multilingual support.
- Browser/server integration fit.
- Partial/final transcript confidence.
- Latency.
- Cost and setup complexity.

### Translation

- Context-aware translation quality.
- Language pair support.
- Ability to preserve original and translation separately.
- Latency.
- Disputed translation handling.

### LLM

- Structured output reliability.
- Tool-use compatibility.
- Latency.
- Cost.
- Ability to follow privacy and uncertainty instructions.

## Fallback Behavior

- STT failure: show transcription failure, allow text fallback.
- Translation failure: preserve original, mark translation unavailable, do not infer from missing translation.
- LLM failure: produce WAIT or system-error signal where appropriate.
- Validation failure: reject decision, log reason, do not execute tools.

## Open Decisions

- Exact Whisper variant and quantization.
- Whether Qwen performs all text translation or a dedicated translation provider is used for selected language pairs.
- Whether provider calls run server-side only or mixed client/server.
- Target hardware and measured latency.
