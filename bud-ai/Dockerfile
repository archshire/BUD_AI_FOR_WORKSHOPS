FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

ENV HOST=0.0.0.0
ENV PORT=3002

EXPOSE 3002

CMD ["npm", "start"]
