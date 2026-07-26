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
are English, Spanish, Simplified Chinese, Burmese, and French. The first
two-language path remains English and Spanish; the additional targets are
available for broader demo testing.

Start it with:

```sh
/tmp/bud-stt-venv/bin/python bud-ai/apps/translation/nllb_service.py
```

## Licensing and Deployment

Original transcript evidence is preserved separately from translation
evidence. The model is a prototype dependency and must be benchmarked and
licensed appropriately before broader or commercial deployment.
