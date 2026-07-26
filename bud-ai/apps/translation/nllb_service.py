import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

import ctranslate2
from transformers import AutoTokenizer


MODEL_DIR = os.environ.get("NLLB_MODEL_DIR", "/tmp/bud-nllb-model")
PORT = int(os.environ.get("TRANSLATION_PORT", "8788"))
HOST = os.environ.get("TRANSLATION_HOST", "127.0.0.1")
LANGUAGES = {
    "en": "eng_Latn",
    "eng": "eng_Latn",
    "eng_Latn": "eng_Latn",
    "es": "spa_Latn",
    "spa": "spa_Latn",
    "spa_Latn": "spa_Latn",
    "zh": "zho_Hans",
    "zho": "zho_Hans",
    "zho_Hans": "zho_Hans",
    "my": "mya_Mymr",
    "mya": "mya_Mymr",
    "mya_Mymr": "mya_Mymr",
    "fr": "fra_Latn",
    "fra": "fra_Latn",
    "fra_Latn": "fra_Latn",
    "th": "tha_Thai",
    "tha": "tha_Thai",
    "tha_Thai": "tha_Thai",
}

print("Loading local NLLB translation model", flush=True)
TOKENIZER = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M", src_lang="eng_Latn")
TRANSLATOR = ctranslate2.Translator(MODEL_DIR, device="cpu")
print("NLLB translation service ready on port %s" % PORT, flush=True)


def translate(text, source_language, target_language):
    source = LANGUAGES.get(source_language, source_language)
    target = LANGUAGES.get(target_language, target_language)
    if source not in LANGUAGES.values() or target not in LANGUAGES.values():
        raise ValueError("Unsupported language for this prototype path")
    if source == target:
        return text

    TOKENIZER.src_lang = source
    source_tokens = TOKENIZER.convert_ids_to_tokens(TOKENIZER.encode(text))
    target_prefix = [TOKENIZER.convert_ids_to_tokens([TOKENIZER.convert_tokens_to_ids(target)])[0]]
    result = TRANSLATOR.translate_batch([source_tokens], target_prefix=[target_prefix], beam_size=1)[0]
    return TOKENIZER.convert_tokens_to_string(result.hypotheses[0][1:]).strip()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/translate":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        translated = translate(
            str(body.get("text", "")),
            str(body.get("source_language", "en")),
            str(body.get("target_language", "es")),
        )
        print("Translated %s -> %s: %s" % (body.get("source_language", "en"), body.get("target_language", "es"), translated), flush=True)
        response = json.dumps({
            "translated_text": translated,
            "source_language": body.get("source_language", "en"),
            "target_language": body.get("target_language", "es"),
            "provider": "nllb-200-distilled-600M-ct2-int8",
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, *_args):
        return


HTTPServer((HOST, PORT), Handler).serve_forever()
