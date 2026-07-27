# Transcription and translation quality tests

Measures how well Bud hears people and how well it translates them, using recorded audio
and known-correct text. Run it before and after a change to see whether the change helped.

**Full documentation:** [docs/05_DEMO_AND_TESTING/QUALITY_TESTING_GUIDE.md](../../../docs/05_DEMO_AND_TESTING/QUALITY_TESTING_GUIDE.md)

## Quick start

```bash
make up-d                    # from the repo root — the stack must be running
cd bud-ai/tests/quality

python3 quality_test.py                       # all three tests, all cases
python3 quality_test.py --test transcription  # audio in, words out
python3 quality_test.py --test translation    # text in, translation out (no audio)
python3 quality_test.py --test both           # audio in, caption out (the learner's view)
python3 quality_test.py --languages en zh     # skip the slow Burmese cases
```

## Adding your own recording

```bash
python3 quality_test.py add \
    --audio ~/recordings/thida-intro.m4a \
    --language my \
    --transcript "the exact words spoken" \
    --translation en="what that means in English"
```

wav, mp3, m4a, webm and ogg all work. The file is copied into `clips/` and the case is
appended to `cases.json`.

## Two things to know before reading a score

The report always splits **built-in clips** from **your own recordings**. The built-ins are
synthetic text-to-speech and score higher than real people; your recordings are the honest
number.

The translation score (chrF) is for comparing runs, not for grading one. A correct
translation worded differently scores low, so read the text of anything that looks poor
before believing the number. A score of 0 means no caption came back at all.
