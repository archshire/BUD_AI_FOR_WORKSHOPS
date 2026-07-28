# Bud AI Build Documentation

Bud AI is a real-time multilingual workshop prototype built with a native
LiveKit runtime.

Start with the [documentation index](docs/00_INDEX.md). The active product
requirements are in the [active PRD](docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md).

## Contents

- [Why Bud AI Exists](#why-bud-ai-exists)
- [Main Areas](#main-areas)
- [How To Use](#how-to-use)
- [Docker Demo](#docker-demo)
- [Same-Network Testing](#same-network-testing)
- [Licensing](#licensing)

## Why Bud AI Exists

Bud AI is built around a simple design thesis: when AI is used as a partner
rather than merely as a tool, it can reduce the human friction that prevents
people from working together effectively.

In a multilingual workshop, that friction can come from:

- misunderstandings that remain after literal translation;
- embarrassment or fear about admitting confusion publicly;
- hesitation to ask for clarification or speak in a group;
- the cognitive load of tracking context across languages and turns;
- quieter participants becoming invisible to the facilitator; and
- facilitators struggling to distinguish an individual difficulty from a
  room-wide pattern.

### More than a tool - AI as a partner

AI as a tool waits for an instruction and performs an operation.

AI as a partner, however, exercises agency bounded by guardrails to help its
human partner achieve a shared goal. It maintains ongoing context with that
partner, makes sense of where the partner is through permitted text or
auditory input, and responds without requiring a fresh prompt each time. Bud
notices relevant signals, offers timely help, asks for clarification, surfaces
patterns, and adapts to its partner's responses.

An AI tool may automate an operation, but it does not operate with this kind
of ongoing, goal-directed agency. This is what distinguishes a partner from a
tool in Bud AI's design.

Bud's agency is deliberately constrained. Bud cannot override the learner's
meaning, expose private conversations, make consequential facilitator
decisions, or treat silence as proof of understanding.

This partner model is evidenced by Bud's private context-grounded support,
signal-driven yellow/red task support, green/yellow/red comprehension sensing,
multilingual meaning repair, privacy-aware facilitator reports, correction
handling, and willingness to wait when the evidence is insufficient. Bud's
common goal is not to replace the teacher or the learner; it is to help the
workshop preserve enough shared meaning for people to keep learning and
collaborating together.

### Demo memory boundary

For this prototype, each Bud has a room- and privacy-scoped Markdown memory
ledger. The application retrieves only the smallest permitted memory slice and
authoritative workshop state before the configured LLM is called; it does not
replay a raw chat transcript or accept a generic completion as workshop truth. Identity,
attendance, task insights, active lesson material, breakout membership, and
permitted chat summaries use source-first application routes. This is
intentionally simple demo infrastructure, not a claim of permanent model
learning. Future builds should use a session-scoped event store,
privacy-keyed retrieval, and rolling summaries.

## Main Areas

- [Source material](docs/00_SOURCE/) - problem statement and external brief.
- [Product documents](docs/01_PRODUCT/) - active PRD, constitution, behavior,
  architecture, capability, and demo-thesis documents.
- [Krystalize decisions](docs/02_KRYSTALIZE/) - constitutional state, journal,
  and handoff artifacts.
- [Contracts](docs/03_CONTRACTS/) - state, event, decision, and tool contracts.
- [Implementation plans](docs/04_IMPLEMENTATION/) - build sequence, provider,
  repository, architecture, and implementation plans.
- [Demo and testing](docs/05_DEMO_AND_TESTING/) - demo scenes, acceptance gates,
  and verification criteria.
- [Archive](docs/archive/) - superseded proposals retained for traceability.
- [Bud AI application](bud-ai/) - runnable prototype source.

The `Krystal/` directory contains the Krystalize method, governance notes, and
templates. It is process material rather than active product documentation.

## How To Use

Begin the evaluation from the learner landing page:

**[Open the Bud AI learner landing page](https://budaiforworkshops-production-a2b7.up.railway.app/)**

1. Choose **Registered learner** or **Join as guest**.
2. Enter the learner details and workshop room code. The demo room is `BUD-101`.
3. Select **Enter learning space** and complete the microphone, document, and
   privacy checks.
4. Activate Learner Bud to enter the live workshop experience.

The Leader workflow is available separately at
`https://budaiforworkshops-production-a2b7.up.railway.app/leader`.

## Docker Demo

Docker Compose runs the five-service demo: Bud, LiveKit, Whisper, NLLB, and
Qwen.

Prerequisites: Docker Engine with Docker Compose v2, and access to the Qwen
GGUF model used by the demo. The first run also downloads and prepares the
Whisper and NLLB model data into persistent Docker volumes, so it may take a
while.

From the repository root, run:

```sh
make up
```

This runs in the foreground. Once the services are ready, open these pages:

- Participant: `http://127.0.0.1:3002/`
- Leader: `http://127.0.0.1:3002/leader`
- Development diagnostics: `http://127.0.0.1:3002/topview`

For microphone testing from other terminals or devices, use the HTTPS gateway
instead of the direct localhost URLs:

- Participant: `https://10.12.7.1:8443/`
- Leader: `https://10.12.7.1:8443/leader`

The browser LiveKit URL must be `wss://10.12.7.1:7880` for those clients.

The Leader starts the workshop room and allocates participants. Each
participant opens the participant URL in their own browser window, enters a
display name, and joins the allocated room. `/topview` is for the development
team and shows live operational data; it is not part of the participant or
Leader workflow. The older `/facilitator` route remains available as a legacy
view, but `/leader` is the current Leader workflow.

### Workshop Source Pack

From the Leader page, choose a `.pptx`, `.pdf`, or `.docx` file in the
**Workshop Source Pack** section and upload it. Google Slides can be exported
as PDF or PowerPoint and uploaded through the same flow. Activate the version
you want Bud to use. The server extracts text locally, preserves slide/page
locations, and uses the active material as shared grounding for Learner Bud
and Leader Bud. Uploaded Source Pack data is stored under `data/source-packs/`
by default, persisted in the Docker `source-packs` volume, and intentionally
ignored by Git.

By default, Qwen uses the host directory `/tmp/bud-qwen-model`. A clean
checkout does not contain model weights, so the first `make up` downloads the
Qwen3 1.7B Q4_K_M GGUF into that directory and reuses it on later launches:

```sh
make up
```

The model file is `Qwen3-1.7B-Q4_K_M.gguf`. To use a different directory or
permitted GGUF URL, override the variables explicitly:

```sh
QWEN_MODEL_MOUNT=/var/tmp/bud-qwen-model \
QWEN_MODEL_FILE=Qwen3-1.7B-Q4_K_M.gguf \
QWEN_MODEL_URL=https://example.invalid/model.gguf \
make up
```

The Qwen container downloads the model only when the configured file is absent.
`make down` preserves the host model directory; `make clean` removes
Docker-managed volumes but does not delete files from `/tmp`.

`make clean` removes Docker-managed volumes but does not delete files from the
host bind mount under `/tmp`.

To use OpenAI instead of local Qwen for Bud replies, set `LLM_PROVIDER=openai`
and provide an API key. The default OpenAI model is `chat-latest`, the current
ChatGPT chat model alias exposed by OpenAI's Chat Completions API; override
`OPENAI_MODEL` if you want a pinned production model.

```sh
LLM_PROVIDER=openai \
OPENAI_API_KEY=sk-... \
OPENAI_MODEL=chat-latest \
make up
```

If the local demo already occupies the default ports, use alternate host
ports while keeping the container ports unchanged:

```sh
LIVEKIT_DIRECT_PORT=7890 BUD_PORT=3012 \
LIVEKIT_PUBLIC_URL=ws://127.0.0.1:7890 \
QWEN_MODEL_MOUNT=/var/tmp/bud-qwen-model \
QWEN_MODEL_FILE=Qwen3-1.7B-Q4_K_M.gguf \
QWEN_MODEL_URL=https://huggingface.co/ggml-org/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf?download=true \
make up
```

To run the stack in the background, use `make up-d`; inspect it with
`make ps` or `make logs`, and stop it with `make down`.

## Same-Network Testing

The default URLs use `127.0.0.1` and work only on the host machine. To test
from another device on the same LAN, find the host's LAN address and configure
the HTTPS gateway and LiveKit with that address. For example, if the host is
`10.12.7.1`:

```sh
LAN_HOST=10.12.7.1 \
LIVEKIT_PUBLIC_URL=wss://10.12.7.1:7880 \
LIVEKIT_NODE_IP=10.12.7.1 \
make up-d
```

Share `https://10.12.7.1:8443/` with learners and use
`https://10.12.7.1:8443/leader` for the Leader view. The HTTPS gateway makes
the page a secure browser context, so participants can grant microphone access.
LiveKit is exposed as secure WebSockets on `wss://10.12.7.1:7880` and keeps
its media ports on TCP `7881` and UDP `7882`. The direct `7883` mapping is
for localhost development only; it is not needed by LAN clients.

The gateway uses a private LAN certificate. On first use, export its root
certificate and install it as trusted on every testing device:

```sh
docker compose cp gateway:/data/caddy/pki/authorities/local/root.crt ./bud-local-ca.crt
```

Then install `bud-local-ca.crt` as a trusted certificate authority in the
device's operating system or browser profile, close and reopen the browser,
and visit the HTTPS link. This is needed once per device; it avoids browser
security warnings and allows the microphone prompt to work normally. The host
firewall must allow TCP `8443`, `7880`, `7881`, and UDP `7882` on the local
network. `LAN_HOST`, `LIVEKIT_PUBLIC_URL`, and `LIVEKIT_NODE_IP` are local
environment configuration and should not be committed.

## Licensing

Original project code and documentation are released under the [MIT License](LICENSE).
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the separate treatment
of dependencies, downloaded models, and image assets.
