FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-impress poppler-utils unzip \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY tests ./tests

ENV HOST=0.0.0.0
ENV PORT=3002
ENV SOURCE_PACK_ROOT=/app/data/source-packs
ENV BUD_MEMORY_ROOT=/app/data/source-packs/bud-memory
ENV BUD_LEDGER_ROOT=/app/data/source-packs/contextual-memory

EXPOSE 3002

CMD ["npm", "start"]
