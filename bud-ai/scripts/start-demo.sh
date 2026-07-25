#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${BUD_DEMO_LOG_DIR:-/tmp/bud-demo-logs}"
LIVEKIT_CONTAINER="${BUD_LIVEKIT_CONTAINER:-bud-livekit-demo}"
mkdir -p "$LOG_DIR"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_command docker
require_command conda
test -x /tmp/bud-stt-venv/bin/python || { echo "Missing /tmp/bud-stt-venv. Install the local speech/translation environment first." >&2; exit 1; }
test -d /tmp/bud-nllb-model || { echo "Missing /tmp/bud-nllb-model. Download the local NLLB model first." >&2; exit 1; }
test -x /tmp/bud-llm-venv/bin/python || { echo "Missing /tmp/bud-llm-venv. Install the local Qwen runner first." >&2; exit 1; }
test -f /var/tmp/bud-qwen-model/Qwen3-1.7B.Q4_K_M.gguf || { echo "Missing local Qwen model under /var/tmp/bud-qwen-model." >&2; exit 1; }

PIDS=()
STARTED_LIVEKIT=0

cleanup() {
  echo
  echo "Stopping Bud demo services..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  if [ "$STARTED_LIVEKIT" -eq 1 ]; then
    docker rm -f "$LIVEKIT_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if docker ps --format '{{.Names}}' | grep -qx "$LIVEKIT_CONTAINER"; then
  echo "Reusing LiveKit container: $LIVEKIT_CONTAINER"
else
  echo "Starting LiveKit..."
  docker run --rm --name "$LIVEKIT_CONTAINER" \
    -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
    livekit/livekit-server \
    --dev --bind 0.0.0.0 --node-ip 127.0.0.1 >"$LOG_DIR/livekit.log" 2>&1 &
  PIDS+=("$!")
  STARTED_LIVEKIT=1
fi

echo "Starting Whisper on port 8787..."
(
  cd "$ROOT_DIR"
  /tmp/bud-stt-venv/bin/python apps/stt/whisper_service.py
) >"$LOG_DIR/whisper.log" 2>&1 &
PIDS+=("$!")

echo "Starting NLLB translation on port 8788..."
(
  cd "$ROOT_DIR"
  NLLB_MODEL_DIR=/tmp/bud-nllb-model /tmp/bud-stt-venv/bin/python apps/translation/nllb_service.py
) >"$LOG_DIR/translation.log" 2>&1 &
PIDS+=("$!")

echo "Starting local Qwen on port 8790..."
(
  cd "$ROOT_DIR"
  QWEN_MODEL_PATH=/var/tmp/bud-qwen-model/Qwen3-1.7B.Q4_K_M.gguf \
  LLM_PORT=8790 \
  /tmp/bud-llm-venv/bin/python apps/llm/qwen_service.py
) >"$LOG_DIR/qwen.log" 2>&1 &
PIDS+=("$!")

echo "Starting Bud on port 3002..."
(
  cd "$ROOT_DIR"
  LIVEKIT_URL=ws://127.0.0.1:7880 \
  LIVEKIT_API_KEY=devkey \
  LIVEKIT_API_SECRET=secret \
  STT_HOST=127.0.0.1 \
  STT_PORT=8787 \
  TRANSLATION_HOST=127.0.0.1 \
  TRANSLATION_PORT=8788 \
  LLM_HOST=127.0.0.1 \
  LLM_PORT=8790 \
  PORT=3002 \
  conda run --no-capture-output -n ft-node npm start
) >"$LOG_DIR/bud.log" 2>&1 &
PIDS+=("$!")

sleep 3
echo
echo "Bud demo is starting."
echo "Learner:     http://127.0.0.1:3002/"
echo "Facilitator: http://127.0.0.1:3002/facilitator"
echo "Logs:        $LOG_DIR"
echo "Press Ctrl+C to stop services started by this script."
echo

wait
