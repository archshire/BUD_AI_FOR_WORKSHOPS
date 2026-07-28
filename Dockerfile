FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-impress poppler-utils unzip \
  && rm -rf /var/lib/apt/lists/*

COPY bud-ai/package*.json ./
RUN npm ci --omit=dev

COPY bud-ai/apps ./apps
COPY bud-ai/packages ./packages
COPY bud-ai/scripts ./scripts
COPY bud-ai/tests ./tests

ENV HOST=0.0.0.0
ENV SOURCE_PACK_ROOT=/app/data/source-packs

EXPOSE 3002

CMD ["npm", "start"]
