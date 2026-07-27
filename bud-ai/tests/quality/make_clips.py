#!/usr/bin/env python3
"""Builds a fixed corpus of spoken test clips, one per line of a known script, in each
of the six workshop languages. Run once; the clips and their reference text are then
reusable for every test run, so transcription quality can be compared between changes
instead of depending on how you happened to say something.

    ./ttsenv/bin/python make-clips.py            # all languages
    ./ttsenv/bin/python make-clips.py en my      # just these two

Output: clips/<lang>-<nn>.wav (16 kHz mono, what the pipeline expects) and
clips/reference.json mapping each file to the exact words that were spoken.
"""
import json
import os
import subprocess
import sys

from gtts import gTTS

# gTTS language codes differ slightly from the workshop's codes; the workshop code is
# what the server wants in x-native-language.
VOICE = {"en": "en", "es": "es", "zh": "zh-CN", "my": "my", "fr": "fr", "th": "th"}

# Deliberately mixed: plain sentences, a domain term that translation should keep
# consistent ("success criteria"), a number, and a short fragment of the kind live
# speech actually produces.
SCRIPT = {
    "en": [
        "Success criteria are the things you agree on before you build, not after.",
        "Start with the user goal and say plainly who this is for.",
        "You have eight minutes for this activity.",
        "If you cannot name the evidence, the criterion is a wish.",
        "So the main problem here is really cost.",
    ],
    "es": [
        "Los criterios de exito son las cosas que acuerdas antes de construir.",
        "Empieza por el objetivo del usuario y di claramente para quien es esto.",
        "Tienes ocho minutos para esta actividad.",
        "Si no puedes nombrar la evidencia, el criterio es un deseo.",
        "Entonces el problema principal es el costo.",
    ],
    "zh": [
        "成功标准是你在开发之前就要达成一致的东西。",
        "先说清楚用户目标，这是为谁做的。",
        "这个活动你有八分钟时间。",
        "如果说不出证据，那这个标准只是愿望。",
        "所以主要的问题其实是成本。",
    ],
    "fr": [
        "Les criteres de reussite sont ce sur quoi vous vous mettez d accord avant de construire.",
        "Commencez par l objectif de l utilisateur et dites clairement a qui cela s adresse.",
        "Vous avez huit minutes pour cette activite.",
        "Si vous ne pouvez pas nommer la preuve, le critere est un souhait.",
        "Donc le probleme principal est vraiment le cout.",
    ],
    "my": [
        "အောင်မြင်မှု စံနှုန်းတွေကို မတည်ဆောက်ခင် သဘောတူထားရပါမယ်။",
        "အသုံးပြုသူရဲ့ ရည်မှန်းချက်ကနေ စပါ။",
        "ဒီလှုပ်ရှားမှုအတွက် ရှစ်မိနစ် ရပါတယ်။",
        "သက်သေကို မပြောနိုင်ရင် အဲဒါက ဆန္ဒတစ်ခုပဲ ဖြစ်ပါတယ်။",
        "ဒါကြောင့် အဓိကပြဿနာက ကုန်ကျစရိတ်ပါ။",
    ],
    "th": [
        "เกณฑ์ความสำเร็จคือสิ่งที่ต้องตกลงกันก่อนลงมือสร้าง",
        "เริ่มจากเป้าหมายของผู้ใช้ และบอกให้ชัดว่าทำเพื่อใคร",
        "กิจกรรมนี้คุณมีเวลาแปดนาที",
        "ถ้าบอกหลักฐานไม่ได้ เกณฑ์นั้นก็เป็นแค่ความหวัง",
        "ดังนั้นปัญหาหลักคือต้นทุน",
    ],
}

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clips")


def main():
    wanted = sys.argv[1:] or list(SCRIPT)
    os.makedirs(OUT, exist_ok=True)
    reference = {}
    ref_path = os.path.join(OUT, "reference.json")
    if os.path.exists(ref_path):
        reference = json.load(open(ref_path, encoding="utf-8"))

    for lang in wanted:
        if lang not in SCRIPT:
            print("skipping unknown language: %s" % lang)
            continue
        for index, line in enumerate(SCRIPT[lang], start=1):
            name = "%s-%02d" % (lang, index)
            mp3 = os.path.join(OUT, name + ".mp3")
            wav = os.path.join(OUT, name + ".wav")
            gTTS(text=line, lang=VOICE[lang]).save(mp3)
            # The pipeline expects what a browser sends: 16 kHz mono.
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-i", mp3, "-ar", "16000", "-ac", "1", wav],
                check=True,
            )
            os.remove(mp3)
            reference[name] = {"language": lang, "text": line}
            print("%s  %s" % (name, line[:60]))

    with open(ref_path, "w", encoding="utf-8") as handle:
        json.dump(reference, handle, ensure_ascii=False, indent=2)
    print("\n%s clips in %s" % (len(reference), OUT))


if __name__ == "__main__":
    main()
