#!/bin/sh
set -eu

mkdir -p "${QWEN_MODEL_DIR}"

if [ ! -f "${QWEN_MODEL_PATH}" ]; then
  if [ -z "${QWEN_MODEL_URL:-}" ]; then
    echo "Qwen model not found at ${QWEN_MODEL_PATH}. Mount a model directory or set QWEN_MODEL_URL." >&2
    exit 1
  fi
  echo "Downloading Qwen model into ${QWEN_MODEL_DIR}..."
  temporary_model_path="${QWEN_MODEL_PATH}.download"
  rm -f "${temporary_model_path}"
  curl --http1.1 --fail --location --retry 5 --retry-all-errors --retry-delay 2 "${QWEN_MODEL_URL}" --output "${temporary_model_path}"
  mv "${temporary_model_path}" "${QWEN_MODEL_PATH}"
fi

exec python qwen_service.py
