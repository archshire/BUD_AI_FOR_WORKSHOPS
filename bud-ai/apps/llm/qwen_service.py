import json
import os
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock

from llama_cpp import Llama


MODEL_PATH = os.environ.get(
    "QWEN_MODEL_PATH",
    "/var/tmp/bud-qwen-model/Qwen3-1.7B-Q4_K_M.gguf",
)
PORT = int(os.environ.get("LLM_PORT", "8790"))
HOST = os.environ.get("LLM_HOST", "127.0.0.1")
THREADS = int(os.environ.get("LLM_THREADS", "12"))
CONTEXT_SIZE = int(os.environ.get("LLM_CONTEXT_SIZE", "4096"))

print("Loading local Qwen model:", MODEL_PATH, flush=True)
MODEL = Llama(model_path=MODEL_PATH, n_ctx=CONTEXT_SIZE, n_threads=THREADS, verbose=False)
MODEL_LOCK = Lock()
print("Local Qwen service ready on port", PORT, flush=True)


def clean_response(text):
    # Qwen3 may expose an optional thinking block; Bud only returns the answer.
    text = re.sub(r"<think>.*?</think>", "", str(text or ""), flags=re.DOTALL)
    return text.strip()


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        encoded = json.dumps(payload).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            # Health probes and callers may time out while a response is in flight.
            return False
        return True

    def do_GET(self):
        if self.path != "/health":
            return self.send_error(404)
        self.send_json(200, {
            "status": "ok",
            "service": "qwen",
            "model": os.path.basename(MODEL_PATH),
            "context_size": CONTEXT_SIZE,
        })

    def do_POST(self):
        if self.path != "/chat":
            return self.send_error(404)
        length = int(self.headers.get("content-length", "0"))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
            started = time.perf_counter()
            system_text = str(body.get("system", ""))
            user_text = str(body.get("user", ""))
            requested_tokens = min(int(body.get("max_tokens", 180)), 300)
            print(
                "Qwen request received:",
                "system_chars=" + str(len(system_text)),
                "user_chars=" + str(len(user_text)),
                "max_tokens=" + str(requested_tokens),
                flush=True,
            )
            # llama-cpp model access remains serialized; health checks do not need
            # this lock and can respond from another request thread.
            with MODEL_LOCK:
                queue_ms = round((time.perf_counter() - started) * 1000)
                print("Qwen model lock acquired: queue_ms=" + str(queue_ms), flush=True)
                result = MODEL.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_text or "You are Bud, a concise workshop companion."},
                        {"role": "user", "content": user_text + "\n/no_think"},
                    ],
                    temperature=0.2,
                    max_tokens=requested_tokens,
                )
            text = clean_response(result["choices"][0]["message"]["content"])
            latency_ms = round((time.perf_counter() - started) * 1000)
            print("Qwen request completed: latency_ms=" + str(latency_ms), flush=True)
            self.send_json(200, {
                "text": text,
                "provider": "qwen3-1.7b-local",
                "latency_ms": latency_ms,
            })
        except Exception as error:
            print("Qwen request failed:", str(error), flush=True)
            self.send_json(500, {"error": str(error)})

    def log_message(self, *_args):
        return


ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
