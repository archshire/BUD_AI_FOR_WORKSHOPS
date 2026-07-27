COMPOSE = docker compose -f docker-compose.yml
LIVEKIT_NODE_IP ?= $(shell hostname -I 2>/dev/null | awk '{print $$1}')
LIVEKIT_PORT ?= 7880
LIVEKIT_TCP_PORT ?= 7881
LIVEKIT_UDP_PORT ?= 7882
BUD_PORT ?= 3002
LIVEKIT_PUBLIC_URL ?= ws://127.0.0.1:$(LIVEKIT_PORT)
QWEN_MODEL_MOUNT ?= qwen-models

.PHONY: up up-d down clean logs ps test reload rebuild

up:
	LIVEKIT_NODE_IP=$(LIVEKIT_NODE_IP) LIVEKIT_PORT=$(LIVEKIT_PORT) LIVEKIT_TCP_PORT=$(LIVEKIT_TCP_PORT) LIVEKIT_UDP_PORT=$(LIVEKIT_UDP_PORT) BUD_PORT=$(BUD_PORT) LIVEKIT_PUBLIC_URL=$(LIVEKIT_PUBLIC_URL) QWEN_MODEL_MOUNT=$(QWEN_MODEL_MOUNT) $(COMPOSE) up --build

up-d:
	LIVEKIT_NODE_IP=$(LIVEKIT_NODE_IP) LIVEKIT_PORT=$(LIVEKIT_PORT) LIVEKIT_TCP_PORT=$(LIVEKIT_TCP_PORT) LIVEKIT_UDP_PORT=$(LIVEKIT_UDP_PORT) BUD_PORT=$(BUD_PORT) LIVEKIT_PUBLIC_URL=$(LIVEKIT_PUBLIC_URL) QWEN_MODEL_MOUNT=$(QWEN_MODEL_MOUNT) $(COMPOSE) up --build -d

# Picks up a server-code change in about a second. docker-compose.override.yml mounts
# the source into the container, so there is nothing to rebuild — Node just has to be
# restarted to re-read it. Web assets (HTML/JS/CSS) are served from disk per request and
# need not even this: refresh the browser.
reload:
	$(COMPOSE) restart bud

# For changes the mount does not cover: new dependencies, Dockerfile edits, and the
# Python services, whose source is baked into their images.
rebuild:
	$(COMPOSE) up -d --build whisper translation bud

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

test:
	$(COMPOSE) run --rm bud npm test
