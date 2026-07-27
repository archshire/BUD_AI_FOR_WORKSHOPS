# bud23 vs bud_ai Local Comparison Report

Date: 2026-07-27

Comparison basis:

- Target/current tree: `/home/emma/Workspace/hackathon/bud23`
- Source/other tree: `/home/emma/Workspace/hackathon/bud_ai`
- Compared local filesystem state, not remote Git state.
- Ignored noise while reviewing: `.git`, `node_modules`, `__pycache__`, `.pytest_cache`, local `.env`, generated quality reports, and local agent/config folders.

## Executive Summary

`bud23` and `bud_ai` are no longer simple UI variants. `bud23` has the richer workshop/document/task-oriented surface: registered/guest entry flow, role-specific legacy pages, Source Pack page extraction, learning-plan draft/lock handling, task completion/comprehension tracking, local state persistence, and broader privacy/event scopes.

`bud_ai` is stronger in live speech intelligence: hosted Groq STT fallback/primary mode, transcript cleanup, sentence buffering, room-wide live transcript/captions, LLM-backed translation, transcript-grounded Bud answers, periodic learner check-ins, chapter-based comprehension rollups, and a much broader automated test/quality harness.

Recommended import posture: do not copy `bud_ai` wholesale. Import its speech/transcript/check-in/test improvements selectively into `bud23`, while preserving `bud23`'s Source Pack, task response, persistence, and richer contract surface.

## Validation Baseline

I ran `npm test` in both local app directories after allowing the test runner to bind `127.0.0.1`.

- `../bud_ai/bud-ai`: passed, output: `All Bud AI scaffold tests passed.`
- `./bud-ai`: failed in `tests/run-tests.js` at line 428. The failing expectation is that `/api/state` contains a workshop prompt including `Define success criteria`.

This means `bud_ai` currently has the stronger local regression baseline. Before importing larger changes into `bud23`, fix or consciously update the failing `bud23` test expectation.

## File Inventory Highlights

Major additions in `bud_ai`:

- `bud-ai/apps/server/src/checkin/checkin-scheduler.js`
- `bud-ai/apps/server/src/transcript/sentence-buffer.js`
- `bud-ai/apps/server/src/transcript/transcript-log.js`
- `bud-ai/apps/server/src/providers/groq-stt.js`
- `bud-ai/apps/server/src/providers/llm-translate.js`
- `bud-ai/apps/server/src/providers/transcript-hygiene.js`
- `bud-ai/tests/quality/*`
- `docs/05_DEMO_AND_TESTING/QUALITY_TESTING_GUIDE.md`
- `docker-compose.override.yml`

Major files present only in `bud23`:

- `bud-ai/apps/server/src/bud-memory.js`
- `bud-ai/apps/server/src/config/leader-bud-config.js`
- `bud-ai/apps/server/src/config/learner-bud-config.js`
- Role/legacy web files: `leader.*`, `learner.*`, `participant.*`, `participant-setup.*`, `dm.js`, `talk.js`, `*_v1.*`
- `bud-ai/demo-materials/*`
- `bud-ai/scripts/generate_demo_materials.py`
- `docs/01_PRODUCT/UI_UX_WORKSHOP_FLOW_AND_CHAT_CONTRACT.md`

Large modified/shared files:

- `bud-ai/apps/server/src/index.js`
- `bud-ai/apps/web/src/app/app.js`
- `bud-ai/apps/web/src/app/facilitator.js`
- `bud-ai/apps/stt/whisper_service.py`
- `bud-ai/tests/run-tests.js`
- `docker-compose.yml`
- `bud-ai/.env.example`
- `bud-ai/apps/server/src/source-pack.js`
- `bud-ai/apps/server/src/state/in-memory-state-store.js`
- `bud-ai/packages/contracts/src/constants.js`
- `bud-ai/packages/contracts/src/validators.js`

## Feature Matrix

| Area | bud23 | bud_ai | Recommendation |
| --- | --- | --- | --- |
| Live STT | Local Whisper via `/api/transcribe`; simpler chunk handling. | Adds Groq hosted STT, local fallback, prompt continuity, transcript hygiene, and better Whisper filtering/concurrency. | Take/adapt. High value. Preserve local fallback. |
| Sentence assembly | Translates each transcript chunk directly. | Buffers fragments until sentence/pause/flush; avoids translating half-thoughts. | Take. Core improvement. |
| Live captions | Participant/facilitator mostly render their own transcribe response. | Room-wide transcript feed through `/api/transcript/live`, lazy per-language caption translation, shared caption panels. | Take/adapt. Strong product fit. |
| Translation | Local NLLB/dev path; includes Malay mapping in NLLB. | LLM translation through Groq/Gemini/Qwen/NLLB fallback; prompt/context-aware; but NLLB loses Malay mapping and health endpoint. | Adapt, not copy. Keep `bud23` NLLB health and Malay support. |
| Bud answer grounding | Source Pack and current prompt grounding; `bud23` also has Bud memory files. | Adds live transcript context to learner/facilitator Bud replies. | Merge into `bud23` answer path. |
| Periodic check-ins | Manual/adaptive check-ins and task/page comprehension. | Word-count-triggered, model-judged check-ins with chapter-based comprehension rollups. | Take concept and scheduler. Integrate with `bud23` task/page model. |
| Source Pack | Richer: pages endpoint, learning plan draft/lock, docx block/table parsing. | Simpler: removes pages endpoint, learning plan APIs, and docx block parsing. | Keep `bud23`. Add transcript context around it. |
| State persistence | Optional state persistence via `BUD_STATE_FILE`; task responses stored. | Removes persistence and task responses; adds per-chapter comprehension reports. | Merge chapter reports without losing persistence/task responses. |
| Contracts | Includes `task_completed`, `private_dm`, `private_facilitator_ai`. | Narrows privacy validation and removes `task_completed`. | Keep/expand `bud23`; do not import narrowing blindly. |
| Facilitator UI | Document/timer/task-oriented, Leader Bud wording. | More live-media/caption oriented, Facil-Bud wording, chapter rollup. Removes timer/document overview. | Selectively merge captions/media/check-in rollup; preserve document/timer if needed. |
| Participant UI | Branded SUTD landing and separate participant access files. | Single in-app learner workspace with live media, captions, private Bud, shared discussion. | Product decision needed. If `bud23` branding matters, graft features into existing shell. |
| Tests | Smaller JS suite; currently failing local smoke assertion. | Larger JS suite plus audio/translation quality harness; passes locally. | Take tests early, then adapt assertions to `bud23`. |
| Docker/dev ops | Qwen host bind default, state/memory volumes. | Qwen Docker volume default, healthcheck, `reload`/`rebuild`, worker/env knobs, override file. | Take dev workflow pieces, keep persistence volumes. |

## High-Value Imports

1. Transcript infrastructure:
   - `transcript/transcript-log.js`
   - `transcript/sentence-buffer.js`
   - `/api/transcript`, `/api/transcript/live`
   - caption translation cache logic

2. STT reliability:
   - Groq STT provider with local fallback
   - transcript hygiene provider
   - Whisper service hallucination guards, prompt support, `ThreadingHTTPServer`, `WHISPER_NUM_WORKERS`

3. Translation quality:
   - `providers/llm-translate.js`
   - context-aware translation call path
   - fallback to local NLLB
   - keep `bud23` NLLB `/health` and Malay language mapping

4. Check-in system:
   - `checkin/checkin-scheduler.js`
   - chapter-stamped comprehension responses
   - facilitator rollup by chapter
   - `/api/checkins`

5. Test/quality harness:
   - expanded `tests/run-tests.js` cases around transcript, sentence buffer, check-ins, and HTTP behavior
   - `tests/quality/*`
   - `docs/05_DEMO_AND_TESTING/QUALITY_TESTING_GUIDE.md`

## Risky or Conflicting Changes

Do not directly copy these without reconciliation:

- `bud-ai/apps/server/src/source-pack.js`: `bud_ai` removes `pages`, learning-plan storage, draft/lock support, enriched DOCX block parsing, and table parsing.
- `bud-ai/apps/server/src/state/in-memory-state-store.js`: `bud_ai` removes persistence and `task_responses`.
- `bud-ai/packages/contracts/src/constants.js` and `validators.js`: `bud_ai` removes `task_completed`, `private_dm`, and `private_facilitator_ai` support or validation coverage.
- `bud-ai/apps/translation/nllb_service.py`: `bud_ai` removes `/health` and Malay mapping.
- `bud-ai/apps/web/src/app/index.html`: `bud_ai` replaces the SUTD landing/access experience with the app workspace. Good if this is the desired product direction, wrong if registered/guest flow is still needed.
- `bud-ai/apps/web/src/app/facilitator.html`: `bud_ai` removes workshop timer and learner document overview UI in favor of live media/captions.
- `README.md`: `bud_ai` removes the demo memory boundary section, while `bud23` still has memory implementation.

## Suggested Import Order

1. Stabilize `bud23` baseline.
   - Fix or update the failing `npm test` assertion in `bud-ai/tests/run-tests.js:428`.
   - Confirm whether `Define success criteria` is still the intended seeded prompt.

2. Import isolated modules first.
   - Add `transcript/`, `checkin/`, and provider modules.
   - Add unit tests for these modules before wiring them into the server.

3. Upgrade STT and translation path.
   - Port Groq/local fallback and transcript cleanup into `transcribeAudio`.
   - Port sentence buffering and flush/speaking endpoints.
   - Keep existing local service health endpoints and language mappings.

4. Add room transcript/captions.
   - Add transcript log writes after assembled speech.
   - Add `/api/transcript/live` and frontend polling.
   - Update participant and facilitator UI with live captions without discarding `bud23` flow decisions.

5. Add check-ins and chapter rollups.
   - Integrate check-in scheduler with transcript log.
   - Merge chapter reports into existing comprehension/task response data.
   - Keep task/page comprehension if it remains product-critical.

6. Import quality harness.
   - Bring `tests/quality` and docs.
   - Use it to compare STT/translation before and after each provider change.

7. Reconcile frontend direction.
   - Decide whether `bud23` should keep SUTD access/branding or adopt `bud_ai`'s immediate app workspace.
   - Merge features after that decision, not before.

## Open Product Questions

- Should the learner entry experience remain the SUTD registered/guest landing, or should the app open directly into the learner workspace?
- Is the workshop timer still required for the demo/facilitator flow?
- Are task/page-level comprehension responses still required, or should chapter-level check-ins become the main comprehension model?
- Should `Leader Bud` be renamed to `Facil-Bud` everywhere?
- Is persistent demo memory still desired, or should transcript-grounded context replace the Markdown memory store?
- Is Malay support still required in the translation service?

## Bottom Line

`bud_ai` contains the stronger live-workshop intelligence layer. `bud23` contains the stronger workshop/document/product scaffolding. The best merge is a graft: keep `bud23` as the host product, import `bud_ai`'s transcript, STT, translation, check-in, and quality-testing systems, and reconcile UI/contract differences deliberately.
