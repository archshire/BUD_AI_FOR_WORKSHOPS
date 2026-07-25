FROM python:3.13-slim

RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch \
  && pip install --no-cache-dir ctranslate2 transformers sentencepiece huggingface_hub

WORKDIR /app
COPY nllb_service.py ./nllb_service.py
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV TRANSLATION_HOST=0.0.0.0
ENV TRANSLATION_PORT=8788
ENV NLLB_MODEL_DIR=/models/nllb
ENV HF_HOME=/models/huggingface

VOLUME ["/models"]
EXPOSE 8788

CMD ["/app/docker-entrypoint.sh"]
