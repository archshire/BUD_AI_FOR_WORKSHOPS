#!/bin/sh
set -eu

mkdir -p "${QWEN_MODEL_DIR}"

if [ ! -f "${QWEN_MODEL_PATH}" ]; then
  if [ -z "${QWEN_MODEL_URL:-}" ]; then
    echo "Qwen model not found at ${QWEN_MODEL_PATH}. Mount a model directory or set QWEN_MODEL_URL." >&2
    exit 1
  fi
  echo "Downloading Qwen model into ${QWEN_MODEL_DIR}..."
  curl --fail --location --retry 3 "${QWEN_MODEL_URL}" --output "${QWEN_MODEL_PATH}"
fi

exec python qwen_service.py
