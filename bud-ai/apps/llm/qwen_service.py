import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from llama_cpp import Llama


MODEL_PATH = os.environ.get(
    "QWEN_MODEL_PATH",
    "/var/tmp/bud-qwen-model/Qwen3-1.7B.Q4_K_M.gguf",
)
PORT = int(os.environ.get("LLM_PORT", "8790"))
THREADS = int(os.environ.get("LLM_THREADS", "12"))

print("Loading local Qwen model:", MODEL_PATH, flush=True)
MODEL = Llama(model_path=MODEL_PATH, n_ctx=2048, n_threads=THREADS, verbose=False)
print("Local Qwen service ready on port", PORT, flush=True)


def clean_response(text):
    # Qwen3 may expose an optional thinking block; Bud only returns the answer.
    text = re.sub(r"<think>.*?</think>", "", str(text or ""), flags=re.DOTALL)
    return text.strip()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/chat":
            return self.send_error(404)
        length = int(self.headers.get("content-length", "0"))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
            started = time.perf_counter()
            result = MODEL.create_chat_completion(
                messages=[
                    {"role": "system", "content": body.get("system", "You are Bud, a concise workshop companion.")},
                    {"role": "user", "content": body.get("user", "") + "\n/no_think"},
                ],
                temperature=0.2,
                max_tokens=min(int(body.get("max_tokens", 180)), 300),
            )
            text = clean_response(result["choices"][0]["message"]["content"])
            payload = {
                "text": text,
                "provider": "qwen3-1.7b-local",
                "latency_ms": round((time.perf_counter() - started) * 1000),
            }
            encoded = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
        except Exception as error:
            encoded = json.dumps({"error": str(error)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

    def log_message(self, *_args):
        return


HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
