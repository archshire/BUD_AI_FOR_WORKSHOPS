FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils unzip \
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

EXPOSE 3002

CMD ["npm", "start"]
