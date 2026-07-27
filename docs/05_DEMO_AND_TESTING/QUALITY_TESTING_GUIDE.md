# QUALITY_TESTING_GUIDE

## Status

Working guide for the transcription and translation quality harness at
`bud-ai/tests/quality/`.

## Goal

Turn "the captions felt worse today" into a number you can check. The harness replays
recorded audio and known-correct text through the running system and scores what comes
back, so a change can be compared against the run before it instead of judged by ear or by
whoever happened to be speaking at the time.

## Contents

- [What This Tests, And What It Does Not](#what-this-tests-and-what-it-does-not)
- [Prerequisites](#prerequisites)
- [Running It](#running-it)
- [The Three Tests](#the-three-tests)
- [Adding Your Own Recordings](#adding-your-own-recordings)
- [Reading The Scores](#reading-the-scores)
- [Comparing Two Runs](#comparing-two-runs)
- [How A Case Is Stored](#how-a-case-is-stored)
- [Building A Good Corpus](#building-a-good-corpus)
- [Troubleshooting](#troubleshooting)
- [Known Limits](#known-limits)

## What This Tests, And What It Does Not

**It tests** speech recognition accuracy, translation quality, and the two together, for
any language and any recording you give it.

**It does not test** the live chunked path. A recording goes in as one piece; in a real
room, speech arrives as many short chunks through the sentence buffer, which is where
mid-sentence splits, pronoun resolution and caption latency problems appear. A clip that
scores well here can still read badly live. Use short clips (10–20 seconds) to get closer
to real behaviour, and test the live path with real microphones separately.

It also does not test check-in summaries, the comprehension traffic lights, or privacy
boundaries. Those are behaviour, not accuracy, and belong in
[TEST_AND_DEMO_PLAN](TEST_AND_DEMO_PLAN.md#test-layers).

## Prerequisites

The stack must be running, because the harness talks to the real server and therefore the
real providers:

```bash
make up-d          # from the repo root
cd bud-ai/tests/quality
```

Python 3 only, no packages to install. Point it elsewhere with `BUD=http://host:port`.

## Running It

```bash
python3 quality_test.py                       # everything: all cases, all three tests
python3 quality_test.py --test transcription  # one test only
python3 quality_test.py --test translation
python3 quality_test.py --test both

python3 quality_test.py --languages en zh     # only cases spoken in these languages
python3 quality_test.py --targets my          # only translate into these languages
python3 quality_test.py --set mine            # only your own recordings
python3 quality_test.py --set generated       # only the built-in synthetic clips
python3 quality_test.py --verbose             # print every case, not only the poor ones
```

Cases that fail print their text automatically; passing cases stay one line each.

A full unfiltered run takes several minutes, most of it spent on Burmese, which currently
falls back to the slow local model. While iterating, `--languages en zh` finishes in well
under a minute.

## The Three Tests

They are separate on purpose. When quality drops, the first question is always *which
stage* got worse, and a single end-to-end number cannot answer it.

| Test | Input | Compared against | Tells you |
| --- | --- | --- | --- |
| `transcription` | your audio | the words actually spoken | Did Bud hear correctly? No translation involved. |
| `translation` | known-correct text | your reference translation | Is the translation good, given a perfect transcript? No audio involved. |
| `both` | your audio | that same reference translation | What a learner actually reads. |

The number worth watching is the **gap between `translation` and `both`**. That gap is
what transcription errors cost you downstream, and neither test shows it alone:

- A large gap means speech recognition is the bottleneck; better prompts, a better model,
  or cleaner audio will help.
- A gap near zero means transcription is fine and the translator is the ceiling; work on
  the translation prompt, the glossary, or the model.

On the Chinese recording currently in the corpus, the gap is zero: 51.0 chrF on clean text
versus 51.4 through the microphone. On Burmese, transcription destroys everything
downstream and the end-to-end score is 0.

## Adding Your Own Recordings

```bash
python3 quality_test.py add \
    --audio ~/recordings/thida-intro.m4a \
    --language my \
    --transcript "the exact words spoken in the recording" \
    --translation en="what that means in English" \
    --translation zh="what that means in Chinese"
```

Long text is easier to pass from files:

```bash
python3 quality_test.py add \
    --audio zh_bud_audio.m4a \
    --language zh \
    --id mine-zh-bud-intro \
    --transcript "$(cat zh_transcript)" \
    --translation en="$(cat zh_translation_en)"
```

The audio is copied into `clips/` and the case is appended to `cases.json`; the originals
are then safe to move or delete. Only `--audio` and `--language` are required — a case with
no transcript is skipped by the transcription test, and one with no translations is skipped
by the translation test, so a recording with nothing but audio is still worth adding for
the parts it can score.

Accepted formats: `.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`. All five have been verified
through both the hosted provider and the local fallback, so record on a phone and use the
file as-is. MP3 at 128 kbps or above is indistinguishable from WAV here.

To pull a clip out of an existing video or a long recording:

```bash
ffmpeg -i workshop.mp4 -ss 00:04:10 -t 15 -ar 16000 -ac 1 clip.wav
```

`-ss` is where to start, `-t` is how many seconds to take.

## Reading The Scores

Every summary splits **built-in clips** from **your own recordings** and never averages
them together:

```
built-in clips (synthetic speech)    98.2 % over 5 cases
your own recordings                  83.5 % over 1 cases
```

The built-ins are text-to-speech — clean, evenly paced, accent-free, recorded into a
perfect channel. They flatter the system. Treat them as a canary for "did the plumbing
break", and treat your own recordings as the real number.

**Transcription** is the percentage of spoken words that survived. Punctuation is ignored,
"eight" and "8" are treated as the same word, and languages written without spaces
(Chinese, Burmese, Thai) are compared character by character rather than word by word.

**Translation and end-to-end** use chrF, a character n-gram score that gives partial credit
for a translation that is correct but worded differently. Two rules for reading it:

1. **It is a comparison, not a grade.** There is one reference answer per case, so an
   accurate translation phrased differently scores low. A real example from the corpus, a
   translation good enough to ship, scored 24.9:
   - reference: *"If you cannot name the evidence, the criterion is a wish."*
   - produced: *"If you can't prove it, it's just a wish."*
   The number is reliable for the same clip measured twice. It is not reliable as a verdict
   on a single run.
2. **A score of 0 means no caption came back at all** — a failure, not a bad translation.

Because chrF undersells good paraphrase, always read the text of anything that looks poor
before believing the score. The harness prints failing cases in full for exactly that
reason.

## Comparing Two Runs

Every run writes a timestamped JSON report into `reports/`. To see what a change did:

```bash
python3 quality_test.py --languages zh     # before the change
# ... make the change, rebuild ...
python3 quality_test.py --languages zh     # after

ls reports/                                 # newest two
python3 -c "
import json,glob
a,b=[json.load(open(p)) for p in sorted(glob.glob('reports/run-*.json'))[-2:]]
print(json.dumps({'before':a['summary'],'after':b['summary']},indent=2))"
```

Same cases, same order, so the per-case scores in the two files line up directly. Keep a
report from a known-good build as your baseline.

## How A Case Is Stored

`cases.json` is a plain list; edit it by hand whenever that is easier than re-running
`add`:

```json
{
  "id": "mine-zh-bud-intro",
  "set": "mine",
  "audio": "clips/mine-zh-bud-intro.m4a",
  "language": "zh",
  "transcript": "大家好，欢迎各位。…",
  "translations": {
    "en": "Hi everyone, welcome — …"
  },
  "note": "Real recording: facilitator introducing the AI Partner, long form."
}
```

- `set` — `mine` or `generated`. This is what drives the split in the report; anything you
  add is `mine`.
- `translations` — one entry per target language. Add more later and they are picked up on
  the next run.
- `note` — free text, carried through to the report. Worth recording who spoke, in what
  accent, and in what conditions.

`make_clips.py` regenerates the synthetic built-ins if they are ever lost. It needs `gTTS`
in a virtualenv and network access; it is not needed for normal use.

## Building A Good Corpus

The corpus is the test. A set of clean, careful clips will report that everything is fine
right up until a demo fails.

- **Record the awkward cases.** Someone trailing off mid-sentence, talking over background
  noise, a strong accent, two people overlapping, a technical term or product name.
- **Keep clips short.** 5–20 seconds, one or two sentences. Short clips localise a failure
  to a specific phrase and exercise the sentence buffer more like a live room does.
- **Cover both directions.** A learner speaking Burmese to an English facilitator is a
  different path from an English facilitator speaking to a Burmese learner.
- **Write the reference honestly.** Transcribe what was *said*, including the stumbles, not
  the script that was meant to be read. Scoring a polished script against a natural
  delivery measures the difference between them, not the model's accuracy.
- **Get translations from a speaker of that language**, not from a machine. A machine
  reference means you are scoring one translator against another.

## Troubleshooting

**"Cannot reach the Bud server"** — the stack is not up. `make up-d` from the repo root,
then wait for the bud container to start before re-running.

**A case scores 0 end to end but transcription looked fine** — the translation returned
nothing. Check `docker logs bud_ai-bud-1` for provider errors; a failed hosted call falls
back, and a failed fallback produces no caption at all.

**Everything is suddenly slow** — check which provider actually served the request. The
report records it per case. A hosted provider failing over to the local CPU model is the
usual cause, and it shows up as seconds instead of hundreds of milliseconds.

**Scores moved but nothing changed in the code** — the hosted models are not pinned to a
version and the room's state is in memory. Re-run before investigating; if it persists,
compare the `provider` field between the two reports.

## Known Limits

- **One reference per case.** chrF punishes valid paraphrase. Read the text, not only the
  number.
- **Batch, not live.** See [What This Tests](#what-this-tests-and-what-it-does-not).
- **The built-in Burmese is not trustworthy as a reference.** Those parallel sentences were
  written by an AI assistant, not a Burmese speaker, and the audio is synthetic. Have a
  native speaker check both before quoting any Burmese score as evidence.
- **Shared server state.** The translation test posts into the shared workshop discussion,
  so a run leaves messages behind. Restart the stack to clear them.
