#!/bin/sh
set -eu

if [ ! -f "${NLLB_MODEL_DIR}/model.bin" ]; then
  mkdir -p "${NLLB_MODEL_DIR}"
  echo "Downloading and converting the NLLB model into ${NLLB_MODEL_DIR}..."
  ct2-transformers-converter \
    --model facebook/nllb-200-distilled-600M \
    --output_dir "${NLLB_MODEL_DIR}" \
    --quantization int8 \
    --force
fi

exec python nllb_service.py
