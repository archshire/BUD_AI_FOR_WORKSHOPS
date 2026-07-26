FROM python:3.13-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir faster-whisper

WORKDIR /app
COPY whisper_service.py ./whisper_service.py

ENV STT_HOST=0.0.0.0
ENV STT_PORT=8787
ENV WHISPER_MODEL=small
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8
ENV HF_HOME=/models/huggingface

VOLUME ["/models"]
EXPOSE 8787

CMD ["python", "whisper_service.py"]
