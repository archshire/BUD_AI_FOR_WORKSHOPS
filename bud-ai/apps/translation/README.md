# Local NLLB Translation

## Contents

- [Service Overview](#local-nllb-translation)
- [Start the Service](#start-it-with)
- [Language Targets](#language-targets)
- [Licensing and Deployment](#licensing-and-deployment)

## Start the Service

## Language Targets

The prototype translation service uses the local 8-bit
`nllb-200-distilled-600M` CTranslate2 model. The verified prototype targets
are English, Spanish, Simplified Chinese, Burmese, French, and Thai. The first
two-language path remains English and Spanish; the additional targets are
available for broader demo testing.

Start it with:

```sh
/tmp/bud-stt-venv/bin/python bud-ai/apps/translation/nllb_service.py
```

## Fallback Role

This service is no longer the primary translator. The Bud server prefers a
context-aware LLM translator (`apps/server/src/providers/llm-translate.js`) and
only calls this container when that fails. NLLB translates each sentence cold,
which degraded badly on live speech fragments; the LLM path is additionally given
the workshop topic, the speaker's recent utterances, and matching source-pack text
so terminology and pronouns stay consistent.

Select the backend with `TRANSLATION_PROVIDER`:

- `gemini` — hosted, free tier, strongest on Burmese and Chinese. Needs `GEMINI_API_KEY`.
- `qwen` — the local Qwen container already in this stack. No key, no network, weaker.
- `nllb` — force this service.

Unset, it uses Gemini when `GEMINI_API_KEY` is present and this service otherwise.

## Licensing and Deployment

Original transcript evidence is preserved separately from translation
evidence. The model is a prototype dependency and must be benchmarked and
licensed appropriately before broader or commercial deployment.
