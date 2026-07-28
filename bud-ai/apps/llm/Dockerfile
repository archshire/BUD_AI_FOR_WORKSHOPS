FROM python:3.13-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential cmake curl \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir llama-cpp-python

WORKDIR /app
COPY qwen_service.py ./qwen_service.py
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV LLM_HOST=0.0.0.0
ENV LLM_PORT=8790
ENV LLM_THREADS=12
ENV QWEN_MODEL_DIR=/models/qwen
ENV QWEN_MODEL_PATH=/models/qwen/Qwen3-1.7B-Q4_K_M.gguf

EXPOSE 8790

CMD ["/app/docker-entrypoint.sh"]
