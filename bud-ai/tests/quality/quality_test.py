#!/usr/bin/env python3
"""Bud AI quality harness — measures transcription and translation accuracy against
recorded audio and known-correct text, so a change can be compared to the run before it
instead of judged by ear.

Three tests, run separately or together:

  transcription   audio in, compare what came back to the words that were actually said
  translation     text in, compare what came back to a known-good translation
  both            audio in, compare the final caption to that same known-good translation
                  (this is the number a learner actually experiences, and it is always
                  lower than either test alone — that gap is the point of running it)

    python3 quality_test.py                       # all three tests, all cases
    python3 quality_test.py --test transcription  # one test only
    python3 quality_test.py --languages en zh     # only these spoken languages
    python3 quality_test.py --targets my          # only translate into these
    python3 quality_test.py --set mine            # only your own recordings

Scores are reported separately for the built-in clips and for anything you add, because
the built-in clips are synthetic speech and flatter the system. Your own recordings of
real people are the honest number.

Adding your own:

    python3 quality_test.py add \\
        --audio /path/to/recording.wav \\
        --language my \\
        --transcript "the exact words spoken in the recording" \\
        --translation en="what that means in English" \\
        --translation zh="what that means in Chinese"

The audio is copied into clips/ and the case is appended to cases.json. Every field is
optional except the audio and its language: a case with no transcript is skipped by the
transcription test, a case with no translations is skipped by the translation test.
You can also edit cases.json by hand.

Needs the Bud server running (make up-d). BUD=http://host:port to point elsewhere.
"""

import argparse
import json
import os
import re
import shutil
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, "clips")
CASES = os.path.join(HERE, "cases.json")
REPORTS = os.path.join(HERE, "reports")
BUD = os.environ.get("BUD", "http://127.0.0.1:3002")
ROOM = os.environ.get("ROOM", "bud-demo-room")

AUDIO_TYPES = {".wav": "audio/wav", ".webm": "audio/webm", ".mp3": "audio/mpeg",
               ".m4a": "audio/mp4", ".ogg": "audio/ogg"}

# Scripts that do not put spaces between words are scored character by character;
# everything else word by word. Comparing Chinese or Burmese by "word" would score
# whitespace, which those languages do not use to separate words.
UNSPACED = {"zh", "my", "th", "ja"}

LANGUAGE_NAMES = {"en": "English", "es": "Spanish", "zh": "Chinese", "my": "Burmese",
                  "fr": "French", "th": "Thai"}

# Whisper writes numbers as digits however they were said, so "eight" and "8" are the
# same transcription and should not be scored as an error.
NUMBER_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12", "fifteen": "15", "twenty": "20",
}


# ---------------------------------------------------------------- server calls

def _request(path, data=None, headers=None, timeout=120):
    request = urllib.request.Request(BUD + path, data=data,
                                     method="POST" if data is not None else "GET")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8")
    return json.loads(body) if body.strip() else {}


def server_reachable():
    try:
        _request("/api/checkins", timeout=5)
        return True
    except Exception:
        return False


def transcribe(audio_path, language, target, speaker, sequence):
    """Pushes an audio file in exactly as a browser would. Returns the raw server reply.

    A caption is held by the server until the words form a sentence, so a clip whose
    transcript has no closing punctuation comes back with nothing translated yet. That is
    correct behaviour, not a failure — flushing is what the microphone does when the
    speaker stops talking, and it is what releases the tail.
    """
    suffix = os.path.splitext(audio_path)[1].lower()
    with open(audio_path, "rb") as handle:
        audio = handle.read()
    started = time.time()
    result = _request("/api/transcribe", audio, {
        "content-type": AUDIO_TYPES.get(suffix, "audio/webm"),
        "x-participant-id": speaker,
        "x-native-language": language,
        "x-target-language": target,
        "x-room-name": ROOM,
        "x-speech-sequence": str(sequence),
    })
    result["released_by"] = "punctuation"
    if not result.get("sentence"):
        flushed = _request("/api/transcribe/flush", json.dumps({
            "participant_id": speaker, "native_language": language,
            "target_language": target, "room_name": ROOM,
        }).encode("utf-8"), {"content-type": "application/json"})
        result["sentence"] = flushed.get("sentence") or result.get("pending_sentence")
        if flushed.get("translation"):
            result["translation"] = flushed["translation"]
        result["released_by"] = "flush"
    result["wall_ms"] = int((time.time() - started) * 1000)
    return result


def translate_text(text, source_language, target_language, timeout=60):
    """Translates text without any audio, through the server's own translation path.

    Uses the shared-discussion route because it is the only text-in, text-out translation
    the server exposes. The post is matched back by its message id rather than by
    position, so a busy room cannot hand back somebody else's line.
    """
    posted = _request("/api/group-message", json.dumps({
        "participant_id": "learner-1", "text": text, "language": source_language,
    }).encode("utf-8"), {"content-type": "application/json"})
    message_id = (posted.get("event") or {}).get("payload", {}).get("message_id")
    started = time.time()
    deadline = started + timeout
    while time.time() < deadline:
        rows = _request("/api/group-messages?target=" + target_language).get("messages", [])
        for row in rows:
            if row.get("message_id") == message_id:
                if row.get("translated_text") or source_language == target_language:
                    return {"text": row.get("translated_text") or text,
                            "ms": int((time.time() - started) * 1000)}
        time.sleep(0.75)
    return {"text": None, "ms": int((time.time() - started) * 1000)}


# ---------------------------------------------------------------- scoring

def normalize(text, language):
    text = unicodedata.normalize("NFKC", str(text or "")).strip().lower()
    # Punctuation is not spoken, so scoring it would penalise the transcriber for
    # choices it makes on the listener's behalf.
    text = "".join(" " if unicodedata.category(ch).startswith("P") else ch for ch in text)
    text = re.sub(r"\s+", " ", text).strip()
    if language not in UNSPACED:
        text = " ".join(NUMBER_WORDS.get(word, word) for word in text.split())
    return text


def tokens(text, language):
    if language in UNSPACED:
        return [ch for ch in normalize(text, language) if not ch.isspace()]
    return normalize(text, language).split()


def edit_distance(left, right):
    if not left:
        return len(right)
    previous = list(range(len(right) + 1))
    for i, a in enumerate(left, start=1):
        current = [i]
        for j, b in enumerate(right, start=1):
            current.append(min(previous[j] + 1, current[j - 1] + 1,
                               previous[j - 1] + (a != b)))
        previous = current
    return previous[-1]


def accuracy(reference, actual, language):
    """How much of what was said survived, as a percentage. 100 is identical; a result
    with more inserted words than the original can go to 0 but never below."""
    expected = tokens(reference, language)
    got = tokens(actual, language)
    if not expected:
        return None
    return max(0.0, round(100.0 * (1 - edit_distance(expected, got) / len(expected)), 1))


def chrf(reference, actual, language, max_n=6, beta=2.0):
    """Character n-gram F-score — the standard way to score a translation when there is
    one correct answer to compare against. Unlike an exact match it gives partial credit
    for a translation that is right but worded differently, and unlike a word-based score
    it works on Chinese and Burmese, which have no spaces to count.

    Read it as a comparison, not a verdict. There is only one reference answer here, and
    a translation that is perfectly good but worded differently scores low — especially on
    short sentences. What it is reliable for is the same clip measured twice: if this run
    scores lower than the last, something got worse.
    """
    ref = normalize(reference, language).replace(" ", "")
    hyp = normalize(actual, language).replace(" ", "")
    if not ref:
        return None
    # No caption at all is a failure, not an absent measurement. Scoring it as missing
    # would quietly drop the worst cases out of the average.
    if not hyp:
        return 0.0
    precisions, recalls = [], []
    for n in range(1, max_n + 1):
        ref_grams = defaultdict(int)
        hyp_grams = defaultdict(int)
        for i in range(len(ref) - n + 1):
            ref_grams[ref[i:i + n]] += 1
        for i in range(len(hyp) - n + 1):
            hyp_grams[hyp[i:i + n]] += 1
        if not ref_grams or not hyp_grams:
            continue
        overlap = sum(min(count, ref_grams[gram]) for gram, count in hyp_grams.items())
        precisions.append(overlap / sum(hyp_grams.values()))
        recalls.append(overlap / sum(ref_grams.values()))
    if not precisions:
        return None
    precision = sum(precisions) / len(precisions)
    recall = sum(recalls) / len(recalls)
    if precision + recall == 0:
        return 0.0
    score = (1 + beta ** 2) * precision * recall / (beta ** 2 * precision + recall)
    return round(100.0 * score, 1)


# ---------------------------------------------------------------- cases

def load_cases():
    if not os.path.exists(CASES):
        print("No cases.json found at %s" % CASES)
        return []
    with open(CASES, encoding="utf-8") as handle:
        return json.load(handle)


def save_cases(cases):
    with open(CASES, "w", encoding="utf-8") as handle:
        json.dump(cases, handle, ensure_ascii=False, indent=2)


def add_case(args):
    if not os.path.exists(args.audio):
        print("No such audio file: %s" % args.audio)
        return 1
    os.makedirs(CLIPS, exist_ok=True)
    suffix = os.path.splitext(args.audio)[1].lower()
    if suffix not in AUDIO_TYPES:
        print("Unsupported audio type %s. Use one of: %s" % (suffix, ", ".join(AUDIO_TYPES)))
        return 1

    cases = load_cases()
    existing = {case["id"] for case in cases}
    stem = args.id or ("mine-%s-%s" % (args.language, os.path.splitext(os.path.basename(args.audio))[0]))
    case_id = stem
    counter = 2
    while case_id in existing:
        case_id = "%s-%s" % (stem, counter)
        counter += 1

    destination = os.path.join(CLIPS, case_id + suffix)
    shutil.copyfile(args.audio, destination)

    translations = {}
    for pair in args.translation or []:
        if "=" not in pair:
            print("--translation needs the form lang=text, got: %s" % pair)
            return 1
        language, text = pair.split("=", 1)
        translations[language.strip()] = text.strip()

    cases.append({
        "id": case_id,
        "set": "mine",
        "audio": os.path.relpath(destination, HERE),
        "language": args.language,
        "transcript": args.transcript,
        "translations": translations,
        "note": args.note or "",
    })
    save_cases(cases)
    print("Added %s (%s), audio copied to %s" % (case_id, LANGUAGE_NAMES.get(args.language, args.language), destination))
    print("Cases now: %s" % len(cases))
    return 0


# ---------------------------------------------------------------- tests

def run_transcription(cases, verbose):
    """Audio in, words out. Isolates speech recognition — no translation involved."""
    results = []
    for index, case in enumerate(cases, start=1):
        if not case.get("transcript"):
            continue
        path = os.path.join(HERE, case["audio"])
        if not os.path.exists(path):
            print("  ! missing audio for %s: %s" % (case["id"], path))
            continue
        # A separate speaker id per case keeps one clip's held words out of the next
        # clip's sentence buffer, so every case is scored on its own.
        reply = transcribe(path, case["language"], case["language"], "qa-" + case["id"], index)
        heard = (reply.get("transcript") or {}).get("text", "")
        score = accuracy(case["transcript"], heard, case["language"])
        results.append({
            "case": case["id"], "set": case.get("set", "generated"),
            "language": case["language"], "score": score, "heard": heard,
            "expected": case["transcript"], "released_by": reply.get("released_by"),
            "stt_ms": (reply.get("timings_ms") or {}).get("stt"),
            "provider": (reply.get("transcript") or {}).get("provider"),
        })
        mark = "ok " if (score or 0) >= 90 else "LOW"
        print("  %s %-22s %5s%%  %sms" % (mark, case["id"], score, results[-1]["stt_ms"]))
        if verbose or (score or 0) < 90:
            print("      said:  %s" % case["transcript"])
            print("      heard: %s" % (heard or "(nothing)"))
    return results


def run_translation(cases, targets, verbose):
    """Known-correct text in, translation out. Isolates the translator — no audio, so a
    poor score here cannot be blamed on transcription."""
    results = []
    for case in cases:
        source = case.get("transcript")
        if not source:
            continue
        for target, reference in sorted((case.get("translations") or {}).items()):
            if targets and target not in targets:
                continue
            if target == case["language"]:
                continue
            reply = translate_text(source, case["language"], target)
            score = chrf(reference, reply["text"] or "", target)
            results.append({
                "case": case["id"], "set": case.get("set", "generated"),
                "language": case["language"], "target": target, "score": score,
                "got": reply["text"], "expected": reference, "ms": reply["ms"],
            })
            mark = "ok " if (score or 0) >= 50 else "LOW"
            print("  %s %-22s %s->%s  chrF %5s  %sms" % (
                mark, case["id"], case["language"], target, score, reply["ms"]))
            if verbose or (score or 0) < 50:
                print("      expected: %s" % reference)
                print("      got:      %s" % (reply["text"] or "(nothing)"))
    return results


def run_end_to_end(cases, targets, verbose):
    """Audio in, caption out — the whole path a learner actually sits behind. Scored
    against the same reference translation the translation-only test uses, so the two
    numbers are directly comparable and their gap is what transcription errors cost."""
    results = []
    for index, case in enumerate(cases, start=1):
        path = os.path.join(HERE, case["audio"])
        if not os.path.exists(path):
            continue
        for target, reference in sorted((case.get("translations") or {}).items()):
            if targets and target not in targets:
                continue
            if target == case["language"]:
                continue
            reply = transcribe(path, case["language"], target, "qa-e2e-%s-%s" % (case["id"], target), index)
            caption = (reply.get("translation") or {}).get("translated_text")
            score = chrf(reference, caption or "", target)
            heard = (reply.get("transcript") or {}).get("text", "")
            results.append({
                "case": case["id"], "set": case.get("set", "generated"),
                "language": case["language"], "target": target, "score": score,
                "caption": caption, "expected": reference, "heard": heard,
                "released_by": reply.get("released_by"), "wall_ms": reply.get("wall_ms"),
                "transcription_score": accuracy(case["transcript"], heard, case["language"]) if case.get("transcript") else None,
            })
            mark = "ok " if (score or 0) >= 50 else "LOW"
            print("  %s %-22s %s->%s  chrF %5s  %sms  released_by=%s" % (
                mark, case["id"], case["language"], target, score,
                reply.get("wall_ms"), reply.get("released_by")))
            if verbose or (score or 0) < 50:
                print("      expected: %s" % reference)
                print("      caption:  %s" % (caption or "(nothing)"))
    return results


# ---------------------------------------------------------------- reporting

def summarise(title, results, unit):
    """Prints one score table, split by set first — the built-in clips are synthetic and
    score higher than real speech, so averaging them together would hide the number that
    matters."""
    scored = [r for r in results if r.get("score") is not None]
    if not scored:
        print("\n%s: nothing scored." % title)
        return {}

    print("\n%s" % title)
    print("-" * len(title))
    summary = {}
    for set_name in sorted({r["set"] for r in scored}):
        subset = [r for r in scored if r["set"] == set_name]
        average = round(sum(r["score"] for r in subset) / len(subset), 1)
        label = "built-in clips (synthetic speech)" if set_name == "generated" else "your own recordings"
        print("  %-36s %s %s over %s cases" % (label, average, unit, len(subset)))
        by_language = defaultdict(list)
        for row in subset:
            key = row["language"] + ("->" + row["target"] if row.get("target") else "")
            by_language[key].append(row["score"])
        for key in sorted(by_language):
            scores = by_language[key]
            print("      %-12s %5s %s  (%s)" % (key, round(sum(scores) / len(scores), 1), unit, len(scores)))
        summary[set_name] = {"average": average, "cases": len(subset)}

    worst = min(scored, key=lambda r: r["score"])
    print("  weakest case: %s at %s %s" % (worst["case"], worst["score"], unit))
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    subparsers = parser.add_subparsers(dest="command")

    adder = subparsers.add_parser("add", help="add one of your own recordings as a test case")
    adder.add_argument("--audio", required=True, help="path to your recording (wav, webm, mp3, m4a, ogg)")
    adder.add_argument("--language", required=True, help="language spoken in it, e.g. en, zh, my")
    adder.add_argument("--transcript", help="the exact words spoken, for scoring transcription")
    adder.add_argument("--translation", action="append", metavar="LANG=TEXT",
                       help="a known-good translation, repeatable: --translation en=... --translation zh=...")
    adder.add_argument("--id", help="name for this case (defaults to the file name)")
    adder.add_argument("--note", help="anything worth remembering about this recording")

    parser.add_argument("--test", choices=["transcription", "translation", "both", "all"], default="all")
    parser.add_argument("--languages", nargs="*", help="only cases spoken in these languages")
    parser.add_argument("--targets", nargs="*", help="only translate into these languages")
    parser.add_argument("--set", dest="set_name", choices=["generated", "mine"], help="only this set of cases")
    parser.add_argument("--verbose", action="store_true", help="print every case's text, not only the poor ones")
    args = parser.parse_args()

    if args.command == "add":
        return add_case(args)

    if not server_reachable():
        print("Cannot reach the Bud server at %s.\nStart it with 'make up-d' from the repo root, or set BUD=http://host:port." % BUD)
        return 2

    cases = load_cases()
    if args.languages:
        cases = [c for c in cases if c["language"] in args.languages]
    if args.set_name:
        cases = [c for c in cases if c.get("set", "generated") == args.set_name]
    if not cases:
        print("No cases match. Add your own with: python3 quality_test.py add --audio ... --language ...")
        return 1

    mine = len([c for c in cases if c.get("set") == "mine"])
    print("Bud quality test — %s cases (%s built-in, %s your own) against %s\n" % (
        len(cases), len(cases) - mine, mine, BUD))
    if not mine:
        print("Note: only built-in synthetic clips are being scored. Add real recordings")
        print("with 'quality_test.py add' — synthetic speech scores higher than people do.\n")

    report = {"server": BUD, "cases": len(cases), "results": {}, "summary": {}}
    targets = args.targets

    if args.test in ("transcription", "all"):
        print("TRANSCRIPTION — audio in, words out")
        report["results"]["transcription"] = run_transcription(cases, args.verbose)
    if args.test in ("translation", "all"):
        print("\nTRANSLATION — known-good text in, translation out")
        report["results"]["translation"] = run_translation(cases, targets, args.verbose)
    if args.test in ("both", "all"):
        print("\nEND TO END — audio in, caption out")
        report["results"]["end_to_end"] = run_end_to_end(cases, targets, args.verbose)

    print("\n" + "=" * 62)
    print("RESULTS")
    print("=" * 62)
    if "transcription" in report["results"]:
        report["summary"]["transcription"] = summarise(
            "Transcription accuracy (share of spoken words that survived)",
            report["results"]["transcription"], "%")
    if "translation" in report["results"]:
        report["summary"]["translation"] = summarise(
            "Translation quality, text only (chrF - compare between runs, not against a bar)",
            report["results"]["translation"], "chrF")
    if "end_to_end" in report["results"]:
        report["summary"]["end_to_end"] = summarise(
            "End to end, what a learner reads (chrF, same scale as above)",
            report["results"]["end_to_end"], "chrF")

    # The gap between translating clean text and translating what the transcriber heard
    # is the cost of speech recognition errors, which neither test shows on its own.
    if report["summary"].get("translation") and report["summary"].get("end_to_end"):
        for set_name, values in report["summary"]["translation"].items():
            end = report["summary"].get("end_to_end", {}).get(set_name)
            if end:
                print("\n  %s: %s chrF on clean text, %s chrF through the microphone — transcription costs %s points." % (
                    "built-in clips" if set_name == "generated" else "your recordings",
                    values["average"], end["average"], round(values["average"] - end["average"], 1)))

    os.makedirs(REPORTS, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    path = os.path.join(REPORTS, "run-%s.json" % stamp)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    print("\nFull results: %s" % path)
    print("Compare with an earlier run to see whether a change helped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
