#!/bin/sh
set -eu

mkdir -p "${QWEN_MODEL_DIR}"

# Downloads land in a .part file and are only renamed into place once curl reports
# success. An interrupted download therefore never leaves a half file that looks
# complete on the next start — which silently feeds truncated weights to the loader.
PARTIAL_PATH="${QWEN_MODEL_PATH}.part"

if [ ! -f "${QWEN_MODEL_PATH}" ]; then
  if [ -z "${QWEN_MODEL_URL:-}" ]; then
    echo "Qwen model not found at ${QWEN_MODEL_PATH}. Mount a model directory or set QWEN_MODEL_URL." >&2
    exit 1
  fi
  echo "Downloading Qwen model into ${QWEN_MODEL_DIR} (about 1GB, resumes if interrupted)..."
  # --continue-at resumes a previous partial file rather than starting over.
  curl --fail --location --retry 5 --retry-delay 5 --continue-at - \
    "${QWEN_MODEL_URL}" --output "${PARTIAL_PATH}"
  mv "${PARTIAL_PATH}" "${QWEN_MODEL_PATH}"
  echo "Qwen model download complete."
fi

# A GGUF file always starts with the ASCII magic "GGUF". Catching a corrupt file here
# gives a clear message instead of llama.cpp's generic "Failed to load model".
MAGIC=$(head -c 4 "${QWEN_MODEL_PATH}" 2>/dev/null || true)
if [ "${MAGIC}" != "GGUF" ]; then
  echo "Model at ${QWEN_MODEL_PATH} is not a valid GGUF file. Delete it and restart to re-download." >&2
  exit 1
fi

exec python qwen_service.py
