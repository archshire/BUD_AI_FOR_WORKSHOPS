# K_BUD_AI_CONSTITUTIONAL_STATE

## Table of Contents

- [Document Metadata](#document-metadata)
- [Project Intent](#project-intent)
- [Problem Statement Alignment Build Gate](#problem-statement-alignment-build-gate)
- [Core Philosophy](#core-philosophy)
- [Locked Truths](#locked-truths)
- [Dependency Map](#dependency-map)
- [Unresolved Issues](#unresolved-issues)
- [Ambiguity Severity Register](#ambiguity-severity-register)
- [Accepted Uncertainty](#accepted-uncertainty)
- [Warning Registry](#warning-registry)
- [Clarification Frontier](#clarification-frontier)
- [Suggested Next Reasoning Focus](#suggested-next-reasoning-focus)
- [Traceability Index](#traceability-index)

## Document Metadata

```yaml
artifact_type: constitutional_state
protocol: KRYSTALIZE
protocol_version: 1
session_id: KRYS-bud-ai-001
project_name: Bud AI
short_name: Bud
created_at: 2026-07-25
updated_at: 2026-07-26
status: implementation_checkpoint
```

## Project Intent

### Current Intent Statement

Bud AI is a real-time multilingual workshop partner for online or hybrid learning environments. Bud helps learners and facilitators preserve shared meaning across language differences through translation, contextual repair, private support, group-level clarification, and facilitator-facing room awareness.

Bud is not a translation-only tool. Its purpose is to help people continue working together when translation alone is insufficient.

### Intent Scope

Bud includes:

- Learner support across private, peer, and room-level contexts.
- Facilitator awareness and synthesis without exposing raw private learner content.
- Real-time multilingual communication across at least two languages.
- Voice and text participation.
- Dynamic interpretation based on live interaction rather than hard-coded demo paths.
- Human correction and AI uncertainty handling.

Bud excludes:

- Claims of production compliance unless implemented and verified.
- Fake permission enforcement.
- Seeded misunderstandings presented as model reasoning.
- Meeting-platform lock-in as the core product identity.
- Arbitrary learner scoring or unsupported learner profiling.

### Source References

- `01_PRODUCT_CONSTITUTION_CANONICAL.md`
- `02_DEMO_THESIS_VIDEO_SPEC_CANONICAL.md`
- `03_PROTOTYPE_CAPABILITY_CONTRACT_CANONICAL.md`
- `04_ADR_001_REALTIME_WORKSHOP_AND_INTEGRATION_ARCHITECTURE_CANONICAL.md`
- `05_SYSTEM_BEHAVIOR_SPEC_v1.0_CANDIDATE.md`
- `06_CONSISTENCY_AND_TRACEABILITY_REPORT.md`
- `PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` (active PRD; restored native-platform direction)
- `docs/archive/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS_V2_ZOOM_FIRST_STALE.md` (stale Zoom-first candidate retained for traceability only)
- `CODEX_KRYSTALIZE_HANDOFF.md`
- Human clarification on 2026-07-25: project AI name is "Bud AI"; short form is "Bud".

## Problem Statement Alignment Build Gate

### Save Point: Mandatory Prototype Requirements Covered

Date: 2026-07-26

The active PRD, constitutional decisions, and implementation have been
reviewed against `docs/00_SOURCE/Problem Statement (Final).pdf`. The current local prototype
meets the PDF's mandatory prototype bar:

1. Both facilitator and learner roles are implemented.
2. Five language options are wired into the local speech/translation path,
   exceeding the requirement for at least two languages.
3. LiveKit provides the real-time workshop connection, with microphone input,
   transcription, captions, translation, multilingual text, and private Bud
   support.
4. The prototype includes explicit speed/latency instrumentation, visible
   failure handling, keyboard-friendly text fallback, and application-enforced
   privacy boundaries.
5. The facilitator and learner flows can be demonstrated dynamically with
   multiple browser clients in a realistic workshop scenario.

`npm test` passes for the current scaffold. The build may therefore be
presented as a working local prototype that satisfies the problem statement.
This is not a production-readiness claim. Accuracy benchmarking across
speakers and noise, public Internet deployment, durable accounts/database
storage, and voice-to-Bud conversational chaining remain explicitly outside
the current demo acceptance claim and are recorded as follow-up work.

## Core Philosophy

### Guiding Principles

- The language barrier does not end when a sentence is translated. It ends when people have enough shared meaning to continue working together.
- Bud must reason across ME, US, and THE ROOM.
- Unknown is a legitimate system state.
- Bud must distinguish observation, interpretation, inference, evidence, confidence, and revision.
- Privacy boundaries are part of the product doctrine, not a later UI detail.
- The product is the intelligence layer, not the meeting platform.

### Non-Goals

- Bud is not merely a multilingual captioning or translation overlay.
- Bud is not a surveillance system for facilitators.
- Bud is not a scripted demo engine.
- Bud is not a Zoom-only product.

### Philosophical Constraints

- Bud must not present guesses as facts.
- Bud must not expose raw private learner-AI content to facilitators without permission.
- Bud must respect participant refusal.
- Bud must prefer WAIT or NO_ACTION when intervention is not justified.

## Locked Truths

Locked truths are statements treated as stable within the current constitutional state.

| ID | Locked Truth | Source | Date Locked | Notes |
| --- | --- | --- | --- | --- |
| LT-001 | The project AI is named "Bud AI". | Human clarification | 2026-07-25 | This supersedes generic naming for active constitutional artifacts. |
| LT-002 | The short form of "Bud AI" is "Bud". | Human clarification | 2026-07-25 | Use "Bud" in product-facing shorthand where appropriate. |
| LT-003 | Existing source docs using "AI Partner" remain valid as canonical lineage and source terminology. | KRYSTALIZE interpretation of existing docs | 2026-07-25 | This prevents traceability loss during renaming. |
| LT-004 | Bud is not a translation-only tool. | Product constitution / PRD | 2026-07-25 | Translation is necessary but insufficient. |
| LT-005 | Bud must support ME, US, and THE ROOM. | Product constitution / system behavior spec | 2026-07-25 | These are core reasoning surfaces. |
| LT-006 | A standalone LiveKit workshop is Bud's primary prototype runtime. | ADR-001, human clarification | 2026-07-25 | Bud Core remains platform-independent; the native runtime lets Bud receive and govern workshop input without depending on an external meeting platform's authorization model. |
| LT-007 | Private learner-AI content must not be exposed raw to facilitators without permission. | Product constitution / PRD | 2026-07-25 | Minimum-necessary operational signals may cross boundaries. |
| LT-008 | The prototype must genuinely support facilitator and learner roles, at least two languages, voice and text, dynamic intelligence, human correction, and WAIT/NO_ACTION. | Prototype capability contract | 2026-07-25 | Demo shortcuts must not violate this. |
| LT-009 | Bud includes a private "Help, I'm Stuck" learner action. | Human-approved teammate recommendation | 2026-07-25 | This is a ME-layer support feature grounded in facilitator transcript/current workshop context. |
| LT-010 | Bud includes adaptive private check-ins for quieter participants. | Human-approved teammate recommendation | 2026-07-25 | This is a ME-layer invitation based on observable low interaction, not a diagnosis of disengagement, confusion, motivation, or personality. |
| LT-011 | For the prototype, the workshop owner/teacher launches the Bud AI server and learner browser clients connect to that workshop instance. | Human clarification | 2026-07-25 | This locks the prototype hosting topology only; it does not settle future deployment. |
| LT-012 | Future integration with an existing meeting platform, including Zoom, remains a possible later direction. | Human clarification | 2026-07-25 | It is not an active MVP dependency or demo claim. |
| LT-013 | The workshop teacher may choose whether Bud is available for a workshop; when Bud is disabled, no learner-level Bud activation occurs. | Human clarification | 2026-07-25 | Workshop-level Bud availability belongs to WorkshopModel approval. Per-learner activation remains a separate lifecycle clarification. |
| LT-014 | The teacher/workshop owner owns WorkshopModel changes; Bud may recommend a change but must not apply one autonomously. Substantive changes create a new approved version, with existing evidence linked to the prior version and new evidence linked to the new version. | Human clarification | 2026-07-25 | Version changes should occur at a deliberate boundary, preferably while paused or between stages. |
| LT-015 | The teacher/workshop owner controls workshop lifecycle transitions: `SETUP -> READY -> ACTIVE <-> PAUSED -> ENDED`. Bud may recommend lifecycle actions but cannot perform them. | Human clarification | 2026-07-25 | Ended workshops are not silently restarted; a new session or explicit new lifecycle instance is required. |
| LT-016 | Learners join through a teacher-generated workshop URL/code, verify the workshop identity, provide a display name and preferred language, and await teacher approval. The server assigns an internal participant ID and supports short-lived reconnect tokens. | Human clarification | 2026-07-25 | The demo deliberately omits login/password accounts to focus on Bud behavior; prototype identity is display-based rather than production authentication. Bud activation and consent remain separate. |
| LT-017 | Bud may observe permitted shared workshop input and use a learner's private Bud conversation to support that learner, but private content remains private by default. Only minimum-necessary operational signals reach the teacher unless the learner explicitly permits raw disclosure. Bud must not treat silence alone as proof of confusion, disengagement, motivation, or personality. | Human clarification | 2026-07-25 | Learners must know when Bud is active and what it may observe; private support should precede teacher escalation. |
| LT-018 | When Bud is workshop-enabled, each learner must explicitly activate Bud. Learners may pause, decline, or revoke it; Bud shows active/paused state and cannot activate autonomously. A reconnect preserves the prior choice but resumes paused until learner confirmation. | Human clarification | 2026-07-25 | Leaving the workshop ends the active Bud session. Workshop-disabled Bud is unavailable. |
| LT-019 | The teacher may manage workshop operations, public/group communication, WorkshopModel revisions, and minimum-necessary facilitator signals, but may not read private learner-Bud content by default, force Bud activation/check-ins, or override a learner's stated meaning. The teacher may pause Bud workshop-wide without inspecting private content. | Human clarification | 2026-07-25 | Teacher authority is operational and bounded by learner privacy and agency. |
| LT-020 | Bud's AI input path uses voice and text only; optional LiveKit camera and screen media may support workshop communication but are not consumed by Bud's AI reasoning in this build. | Human clarification, superseded by CJ-063 | 2026-07-26 | This preserves the latency/privacy boundary while allowing optional realtime presentation media. |
| LT-021 | Bud must prioritize timely, context-current behavior. A slow or stale sensemaking result must not be delivered as if it still applies after the workshop context has moved on. | Human clarification | 2026-07-25 | Exact latency budgets, cancellation, freshness checks, and provider choice remain Item 21 work. |
| LT-022 | The application enforces workshop, participant, group, and privacy scopes. Private Bud contexts are keyed to the correct workshop and participant; Bud may reason only from evidence explicitly permitted for the current scope. | Human clarification | 2026-07-25 | Shared events remain room/group scoped, private evidence remains participant scoped, and concurrent events require ordering and duplicate protection. |
| LT-023 | Bud uses evidence-linked categorical confidence: `unknown`, `low`, `medium`, or `high`. `unknown` is the default when evidence is insufficient; translation or silence alone cannot prove understanding; explicit learner corrections take priority over Bud's inference about that learner's meaning. | Human clarification | 2026-07-25 | Confidence includes rationale, evidence references, freshness, and whether evidence is direct, translated, inferred, corrected, disputed, or incomplete. |
| LT-024 | Corrections create new linked evidence rather than erasing history. The meaning owner has authority over intended meaning; facilitators may correct shared instructions/context; Bud revises dependent inferences and signals. Productive disagreement is not automatically an error. | Human clarification | 2026-07-25 | Bud asks neutral clarification when disagreement may contain a meaning gap and must not pressure agreement. |
| LT-025 | Facilitator signals use a bounded vocabulary: `meaning_gap`, `support_needed`, `participation_pattern`, `translation_risk`, and `system_error`. Signals include scope, summary, evidence, confidence, persistence/consequence, suggested action, timestamps, and status; they are recommendations, not facts. | Human clarification | 2026-07-25 | A single silence event cannot trigger a participation signal; stale or invalidated signals are withdrawn or marked stale. |
| LT-026 | The teacher creates and changes groups. Group and breakout contexts are scoped to membership and clear change boundaries; private learner Bud context never transfers automatically between groups. Bud may recommend regrouping but cannot move learners. | Human clarification | 2026-07-25 | Merges and splits create new shared contexts while preserving prior histories; leaving a group marks inactivity without erasing evidence. |
| LT-027 | The prototype supports trusted-LAN hosting as the guaranteed path and secure public reachability as an optional demonstration path. The teacher still launches the Bud server; public mode uses a protected HTTPS tunnel or relay with short-lived workshop access. | Human clarification | 2026-07-25 | Public reachability is a demo capability, not a claim of production cloud hosting. |
| LT-028 | The former Zoom-first companion proposal is superseded. | Human clarification | 2026-07-25 | It remains documented as stale history because its RTMS/Marketplace authorization dependency made it unsuitable as the core MVP commitment. |
| LT-029 | The former scope reduction that deferred the native workshop platform is superseded. | Human clarification | 2026-07-25 | The native LiveKit workshop is restored as the active MVP direction. |
| LT-030 | The active MVP is a native Bud workshop platform, with LiveKit as the real-time runtime. | Human clarification | 2026-07-25 | Bud can be integrated directly into owned voice, text, privacy, participant, and session flows. Zoom is deferred to a later optional integration. |
| LT-031 | The teacher-owned server creates the LiveKit room when the workshop enters `READY`. After teacher approval, each learner receives a short-lived, participant-bound room token. Learners may connect in `READY`, but voice and text become live workshop input only when the teacher publishes `ACTIVE`. While `PAUSED`, clients remain connected but voice/text publishing is disabled until the teacher resumes `ACTIVE`. When `ENDED`, Bud disconnects and no new workshop input is accepted, but participants may continue ordinary voice/text interaction and translation until the room closes after all participants leave. | Human clarification | 2026-07-25 | A reconnect receives a new token for the same internal participant identity. A room token is not an account/password and does not activate Bud. Teacher-client recovery and timeout behavior are specified by LT-032 and LT-033. |
| LT-032 | For the prototype, the teacher's browser control-client connection acts as the room-availability lease, not the server process itself. If the teacher control client disconnects, the workshop automatically enters `PAUSED`; students remain connected, workshop input is suspended, and the same workshop state can resume when the teacher reconnects. | Human clarification | 2026-07-25 | This is a deliberate demo simplification. The server may remain running while the control client is absent. The two-minute recovery window and closure after expiry are specified by LT-033 and LT-034. A future cloud-hosted version should keep the server and room alive independently of the teacher's browser connection. |
| LT-033 | The prototype uses a two-minute recovery grace period for both the teacher control client and each student client. The teacher's disconnect pauses the workshop while preserving its state; a student's disconnect preserves that student's participant state for reconnection during the same window. After a student's timer expires, that student is removed from the active workshop state and must receive teacher re-approval to return. | Human clarification | 2026-07-25 | The timers are server-side. The student's expired participant state is not silently treated as an active participant. Teacher-timeout behavior remains open. |
| LT-034 | If the teacher does not reconnect within the two-minute recovery window, the prototype closes the workshop. | Human clarification | 2026-07-25 | Closure is distinct from an ordinary `ENDED` transition: the timeout is a recovery failure, while `ENDED` leaves the communication room available for translation until all users leave. |
| LT-035 | The prototype server maintains an append-only workshop event log. Events have stable IDs, timestamps, workshop/participant/group scope, privacy scope, and normalized payloads. After a Bud disconnect or restart, Bud replays permitted events to rebuild current context and resumes without duplicating already-processed events. | Human clarification | 2026-07-25 | The prototype may use a local file such as JSONL. Raw audio is not stored by default. Exact retention, deletion, encryption, and private-content rules remain governed by the later privacy and data-retention clarifications. |
| LT-036 | When a required provider or runtime dependency is unavailable, Bud enters `WAIT` or `NO_ACTION` for the affected capability, shows a visible degraded/unavailable state, preserves permitted incoming events, and resumes processing from the recovered event log when the dependency returns. | Human clarification | 2026-07-25 | Bud must not guess, silently drop permitted evidence, or deliver stale output merely because a dependency is slow or temporarily unavailable. |
| LT-037 | If a delayed AI result no longer matches the current workshop context, Bud discards it and notifies the relevant user that the response was discarded because the context moved on. | Human clarification | 2026-07-25 | Freshness takes priority over completing an old request. The notification is an operational explanation, not a fabricated answer to the stale request. |
| LT-038 | After stale output is discarded, Bud may make one bounded retry using the latest permitted context when the request remains relevant and the provider is available. If that retry is slow or becomes stale, Bud stops and waits for a new interaction. | Human clarification | 2026-07-25 | Bud must not retry indefinitely or repeatedly interrupt the workshop with recovery notifications. Exact latency budgets remain an docs/04_IMPLEMENTATION/provider clarification. |
| LT-039 | For the prototype, Bud acknowledges input within 300 ms, targets a response within 1.5 seconds, and enforces a three-second total deadline including one retry. After the deadline, Bud shows `WAIT` or a processing state and waits for a new interaction rather than delivering stale output. | Human clarification | 2026-07-25 | The budget is a prototype responsiveness target, not a production SLA. It applies after a complete supported input is available for processing. |
| LT-040 | Bud recovery uses periodic checkpoints plus bounded replay. Every normalized event is appended to the event log; compact checkpoints are created after major state changes and approximately every 30 seconds or 50 events. Recovery loads the latest checkpoint and replays only later events, with full-log replay as a fallback when no checkpoint exists. | Human clarification | 2026-07-25 | Replay applies privacy-scope filtering. The checkpoint cadence is a prototype policy and may be tuned during implementation without changing the recovery principle. |
| LT-041 | Prototype workshop records are session-only. The event log is retained while the workshop is active or paused and through the applicable two-minute recovery window. After the workshop closes and all participants leave, raw workshop events and private Bud content are deleted. Minimal non-private demo metrics may be preserved if needed. | Human clarification | 2026-07-25 | The teacher does not receive private Bud content by default. This is a prototype retention boundary, not a production compliance or archival policy. |
| LT-042 | The teacher configures the workshop's supported languages. Each student chooses a preferred language on join and may change it during the workshop; the change applies to new input. Bud preserves original-language evidence alongside translations. If translation is unavailable, Bud shows the original and a visible unavailable state, may retry once, and does not invent a translation. | Human clarification | 2026-07-25 | Participants may be asked to continue in a supported language after a failed retry. The teacher sees the configured language set, not private Bud conversations. |
| LT-043 | Bud's default local reasoning and text-translation model is Qwen3-8B. Voice input uses a separate Whisper-family speech-to-text provider. Qwen runs in non-thinking mode for the low-latency prototype path, while the exact Whisper variant and hardware configuration remain subject to benchmarking. | Human clarification | 2026-07-25 | Qwen3-8B was selected for multilingual coverage, Apache 2.0 licensing, local deployment support, tool/structured-output compatibility, and a practical size/latency balance. Speech recognition is intentionally separated from language reasoning. |
| LT-044 | Adaptive Check-in observes a rolling three-minute window and requires at least three relevant low-interaction opportunities before sending an optional private prompt. It has a ten-minute cooldown; dismissal prevents another invitation during the same workshop stage, and a stage change resets the cooldown. | Human clarification | 2026-07-25 | The pattern is based on observable participation only. Bud must not infer confusion, disengagement, motivation, or personality from quietness. |
| LT-045 | Help, I'm Stuck uses a grounding hierarchy: the learner's private request, current workshop stage/task/objective, the latest facilitator instruction or transcript preferably from the last five minutes, and recent relevant shared events from the current stage. Bud excludes unrelated older material and asks for clarification when context is missing, stale, or ambiguous. | Human clarification | 2026-07-25 | The five-minute rule is a prototype freshness target; an approved current instruction remains usable until superseded. Private support remains private by default. |
| LT-046 | Bud arbitrates competing interventions in this order: privacy/permission and explicit user requests; immediate private learner support; US shared meaning repair; THE ROOM facilitator signals for persistent or room-wide patterns; optional Adaptive Check-in. Bud executes at most one conflicting action per participant/context, suppresses duplicates, and prefers `WAIT` when candidates are equally important. Escalation requires persistence, consequence, or explicit learner/facilitator request. | Human clarification | 2026-07-26 | Arbitration preserves learner agency and prevents multiple simultaneous Bud actions from becoming disruptive. |
| LT-047 | Voice audio may be processed transiently for speech-to-text, but raw microphone audio is not written to the prototype session log. The log stores transcript/events and metadata such as language, timestamp, participant scope, and provider confidence. Bud recovery replays permitted transcript/events rather than recordings. | Human clarification | 2026-07-26 | This reduces privacy, storage, and replay risk. Raw-audio retention remains a future decision requiring explicit consent and retention policy. |
| LT-048 | Provider configurations are demo-ready only after testing at least 20 varied utterances per supported language across speakers, accents, speaking speeds, and mild noise; meeting the 300 ms acknowledgement target, 1.5 second typical response target, and 3 second maximum including one retry; suppressing stale output; preserving original/translation separation; handling provider failure visibly; and writing no raw audio to the session log. | Human clarification | 2026-07-26 | These are acceptance gates for the prototype, not a production SLA or universal language-quality guarantee. The benchmark runs on the actual demo hardware. |
| LT-049 | Cloud hosting is future-only and excluded from the current demo. The demo remains teacher-hosted: the teacher launches the server, students connect to that workshop, and cloud authentication, persistence, tenancy, operations, and cost are not demo requirements. | Human clarification | 2026-07-26 | A secure tunnel may be used for remote demo reachability, but it does not change the teacher-hosted prototype ownership model. |
| LT-050 | Demo acceptance requires observable evidence of: the core multilingual Bud loop; grounded private Help, I'm Stuck support; Adaptive Check-in; comprehension rollup with privacy; teacher authority and learner privacy; and recovery behavior including pause/resume, student reconnect, event replay, stale-result rejection, and visible provider failure. Each scenario must work with varied supported input rather than one scripted sentence. | Human clarification | 2026-07-26 | A scenario passes only when behavior is observable, evidence-linked, and consistent with the constitutional boundaries. |
| LT-051 | Any future Zoom integration must prove authorized input capture, participant mapping, privacy/consent, conversion into the same normalized events used by the native LiveKit runtime, and graceful failure behavior. It remains a separate future adapter and is not an MVP dependency or current capability claim. | Human clarification | 2026-07-26 | Zoom integration may be reopened only after the native Bud workshop is stable and the external authorization/distribution path is separately verified. |
| LT-052 | Bud AI is intentionally designed as a partner rather than a passive tool. Bud exercises bounded agency toward the shared goal of preserving workshop meaning and continued collaboration: it may notice relevant signals, offer support, ask for clarification, summarize, surface patterns, adapt to responses, or wait. It may not override human meaning, expose private content without permission, infer comprehension from silence, or make consequential facilitator decisions. | Human clarification | 2026-07-26 | The partner thesis explains the product purpose while preserving privacy, evidence, participant agency, and facilitator authority. |
| LT-053 | Bud may send a brief private progress summary to a learner after joining and at bounded activity intervals. The summary uses the current workshop prompt and recent permitted shared context, invites green/yellow/red self-reporting, and is limited by a 90-second cooldown. Provider failure uses a bounded fallback rather than inventing workshop facts. | Human clarification / implementation refinement | 2026-07-26 | The summary reduces orientation friction without becoming an interruption loop or changing comprehension state. |
| LT-054 | When the facilitator view loads or reconnects, Bud automatically presents a privacy-aware aggregate room report using the latest explicit comprehension signals. The report includes green, yellow, red, and unknown counts and may identify a qualified difficult recap point; it never includes raw private Bud content or infers a response from silence. | Human clarification / implementation refinement | 2026-07-26 | The manual room scan remains available as an explicit refresh, and the report remains an operational signal rather than a diagnosis. |
| LT-055 | The live workshop has one main media space. At most one screen-share track may be active at a time, and the active share occupies the main presentation area for all authorized subscribers. | Human clarification, CJ-063 | 2026-07-26 | This keeps the workshop visually legible and prevents competing presentations. |
| LT-056 | The facilitator may start and stop the active screen share. Participants may screen-share only when the facilitator has enabled participant sharing for the room. | Human clarification, CJ-063 | 2026-07-26 | The facilitator controls presentation authority; participant sharing is an explicit room permission. |
| LT-057 | If a screen share is already active, a second share request is rejected with a visible explanation. The requester is not queued automatically and the existing share is not replaced silently. | Human clarification, CJ-063 | 2026-07-26 | Replacement would create ambiguity about what the room is viewing; an explicit stop/start action is required. |
| LT-058 | The facilitator camera feed is optional and may be enabled or disabled by the facilitator. When enabled, learners may subscribe to it as the facilitator's live workshop presence feed. | Human clarification, CJ-063 | 2026-07-26 | Camera media is presentation/presence support, not a required AI input. |
| LT-059 | Participant camera video is not required for the live-vid prototype. Participant clients may remain audio/text-first unless a later clarification explicitly expands camera scope. | Human clarification, CJ-063 | 2026-07-26 | This preserves bandwidth, privacy, and implementation focus while still demonstrating facilitator presence. |
| LT-060 | Screen-share audio is optional and is captured only when the browser supports it and the user selects tab audio; it must not be silently routed into Bud's speech-to-text path. | Human clarification, CJ-063 | 2026-07-26 | Shared presentation audio and conversational microphone input have different privacy and attribution semantics. |
| LT-061 | Bud does not inspect, transcribe, summarize, or reason over camera frames or screen-share frames in the live-vid build. Video and screen media remain communication tracks only. | Human clarification, CJ-063 | 2026-07-26 | This avoids introducing AI vision latency, accidental capture, and a new privacy surface. |
| LT-062 | Camera and screen-share media are not written to the prototype event log and are not recorded by the application. The log retains permitted normalized text/transcript events and media status metadata only. | Human clarification, CJ-063 | 2026-07-26 | This preserves the existing session-only retention boundary and avoids silent recording. |
| LT-063 | A facilitator may stop an active participant screen share through an authorized room control. A participant may always stop their own share. | Human clarification, CJ-063 | 2026-07-26 | The control is operational moderation, not access to private Bud conversations or learner meaning. |
| LT-064 | After a screen share ends, the main media space returns to a neutral workshop state and does not automatically promote a camera or another participant share. Reconnection restores permissions but does not silently restart media tracks. | Human clarification, CJ-063 | 2026-07-26 | Media capture requires an explicit user action after reconnect or interruption. |
| LT-065 | The facilitator may upload approved workshop source materials before activating the room. The prototype supports `.pptx`, `.pdf`, and `.docx`; Google Slides is supported through an explicit exported PDF/PPTX import rather than direct Google authorization. | Human clarification, CJ-064 | 2026-07-26 | This keeps the prototype useful without adding Google account authorization and marketplace/API dependencies. |
| LT-066 | Uploaded materials are stored in a workshop-scoped Workshop Source Pack. The application extracts/indexes permitted text and preserves slide, page, or section references. One facilitator-approved version is active for shared Bud grounding at a time. | Human clarification, CJ-064 | 2026-07-26 | The Source Pack gives every Bud a common facilitator-led reference point. |
| LT-067 | The facilitator owns Source Pack activation, replacement, and deletion controls. Bud may retrieve and cite permitted material but may not change the active Source Pack autonomously. | Human clarification, CJ-064 | 2026-07-26 | Human authority remains explicit at the boundary where workshop intent is established. |
| LT-068 | Bud may use the active Source Pack as shared workshop context for private learner support, Facil-Bud support, translation terminology, and room-level synthesis. Learner-private Bud conversations never enter the Source Pack automatically. | Human clarification, CJ-064 | 2026-07-26 | Shared grounding enriches assistance without weakening private-context boundaries. |
| LT-069 | Source Pack versions and source locations are retained on grounding evidence. Replacing the active materials creates a new version and does not rewrite evidence created against a prior version. | Human clarification, CJ-064 | 2026-07-26 | Version links keep reasoning auditable when workshop content changes. |
| LT-070 | When the active Source Pack does not support a workshop-specific answer, Bud must ask for clarification or use `WAIT`/`NO_ACTION`; it must not invent content. When practical, Bud identifies the source slide, page, or section used. | Human clarification, CJ-064 | 2026-07-26 | Source grounding improves usefulness only if unsupported answers remain visibly bounded. |

## Dependency Map

Dependency chains identify what depends on what for semantic stability.

| ID | Dependent Item | Depends On | Severity Tier | Status | Blocking? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DEP-001 | Implementation source architecture | State, event, AI decision, and tool contracts | Tier 3 | clarified | no | Draft contracts now exist in `/docs/03_CONTRACTS/`; implementation can begin against them. |
| DEP-002 | Real-time workshop behavior | STT, translation, LLM routing, and turn detection choices | Tier 3 | unresolved | yes | Provider choices affect latency, cost, and fidelity. |
| DEP-003 | Facilitator dashboard semantics | Privacy doctrine and room-level signal schema | Tier 2 | partially clarified | no | `FacilitatorViewState`, `create_facilitator_signal`, and privacy projection rules are drafted. |
| DEP-004 | Demo scope | Hackathon MVP boundary and native-platform claims | Tier 2 | partially locked | yes | Native LiveKit workshop demonstration is primary; Zoom is not an MVP dependency. |
| DEP-005 | Product naming consistency | Bud AI naming decision and legacy AI Partner source references | Tier 4 | clarified | no | Current artifacts use Bud AI; traceability preserves AI Partner sources. |
| DEP-006 | Implementation documentation bridge | Contracts and canonical Bud doctrine | Tier 3 | clarified | no | Draft implementation docs now exist in `/docs/04_IMPLEMENTATION/`. |
| DEP-007 | Source scaffold | Implementation docs and draft contracts | Tier 3 | clarified | no | Executable dependency-free scaffold remains available as the starting point for the native workshop runtime. |
| DEP-008 | Help, I'm Stuck feature | ME privacy doctrine, lesson transcript/current context, support tool contract | Tier 3 | clarified | no | Contract, docs, scaffold fixture, context retrieval, and tests now include the feature. |
| DEP-009 | Adaptive check-in feature | ME privacy doctrine, observable participation state, cooldown policy, participant agency | Tier 3 | clarified | no | Contract, docs, scaffold observer, fixture, and tests now include private optional check-ins for low observable activity. |
| DEP-010 | Workshop hosting topology | Prototype teacher-hosted server decision, browser client connection flow, future deployment requirements | Tier 2 | partially clarified | yes | The prototype is teacher-hosted locally. A future cloud-hosted server may allow teachers and learners to connect remotely, but deployment, identity, room lifecycle, and operational ownership remain undefined. |
| DEP-011 | Future Zoom integration | Platform-independent normalized events, Zoom authorization/SDK/API capabilities, live input capture path, privacy boundary | Tier 2 | clarified/deferred | no | Future proof requirements are locked: authorized capture, participant mapping, privacy/consent, normalized-event conversion, and graceful failure. Zoom remains outside the MVP. |
| DEP-012 | LiveKit room lifecycle | Teacher-owned lifecycle, teacher approval, token issuance, participant identity, permitted tracks, reconnect behavior | Tier 3 | clarified | no | Room creation, short-lived participant-bound token issuance, `ACTIVE`-only voice/text workshop input, connected-but-publishing-disabled `PAUSED` behavior, translation-only `ENDED` behavior, teacher-control-client availability, two-minute recovery windows, student expiry/re-approval, and teacher-timeout closure are locked. |
| DEP-013 | Failure recovery and context restoration | Server event log, normalized event IDs, privacy scopes, replay ordering, Bud checkpoint/reconnect behavior | Tier 3 | clarified | no | Append-only event logging, permitted-event replay, degraded `WAIT`/`NO_ACTION` behavior, stale-result suppression with user notification, one bounded latest-context retry, prototype latency budget, and checkpoint-plus-bounded-replay recovery are locked. Retention and deletion remain a separate Item 16 privacy/data decision. |
| DEP-014 | Session records and retention | Event-log scopes, workshop closure, participant departure, private-content policy, minimal demo metrics | Tier 2 | clarified | no | Prototype records are session-only and raw/private records are deleted after closure and departure; production retention, encryption, audit access, and compliance remain future work. |
| DEP-015 | Language configuration and fallback | Teacher language configuration, participant preference, original evidence, translation provider availability, fallback UI | Tier 3 | clarified | no | Supported languages, participant preferences, preference changes for new input, original-language preservation, and visible translation failure behavior are locked. |
| DEP-016 | Adaptive Check-in policy | Observable participation windows, relevant opportunities, participant agency, cooldowns, workshop stages | Tier 3 | clarified | no | Three-minute observation, three-opportunity threshold, ten-minute cooldown, dismissal suppression within a stage, and stage-change reset are locked. |
| DEP-017 | Help, I'm Stuck grounding | Learner request, current WorkshopModel stage/task/objective, recent facilitator transcript/instruction, relevant shared events, freshness and privacy scope | Tier 3 | clarified | no | Grounding hierarchy, five-minute transcript freshness target, exclusion of unrelated older material, and clarification-on-insufficient-context are locked. |
| DEP-018 | Intervention arbitration and escalation | ME/US/THE ROOM priorities, privacy and permission, duplicate suppression, cooldowns, persistence and consequence thresholds | Tier 2 | clarified | no | Privacy and explicit requests outrank private support, shared repair, facilitator signals, and optional check-ins; one conflicting action is allowed per participant/context and escalation is bounded. |
| DEP-019 | Provider benchmark and demo readiness | Qwen3-8B, Whisper-family STT, translation routing, turn detection, target hardware, latency and privacy gates | Tier 3 | clarified | no | Benchmark matrix and acceptance gates are locked; exact measured provider configuration remains an implementation result, not a semantic assumption. |
| DEP-020 | Future cloud deployment boundary | Teacher-hosted demo topology, future identity, persistence, tenancy, operations, reachability, and cost | Tier 2 | deferred | no | Cloud hosting is explicitly outside the demo; revisit only for a later production or remote-workshop build. |
| DEP-021 | Demo acceptance and proof | Core loop, privacy, grounding, adaptive check-in, comprehension rollup, teacher authority, native LiveKit runtime, recovery behavior | Tier 2 | clarified | no | Six acceptance areas are locked and should drive the final test plan and judge-facing demo evidence. |
| DEP-022 | AI partner behavior and proactive support | Shared workshop goal, bounded agency, privacy, evidence, participant agency, facilitator authority | Tier 2 | clarified | no | The partner thesis governs proactive summaries, adaptive invitations, room reports, correction, and WAIT behavior without granting autonomous authority. |
| DEP-023 | Proactive learner and facilitator reporting | Current workshop context, comprehension evidence, privacy projection, bounded cooldowns | Tier 3 | clarified | no | Learner summaries remain private and rate-limited; facilitator reports are aggregate-only and appear automatically on facilitator view entry. |

## Unresolved Issues

Unresolved issues are active ambiguities, contradictions, or decisions not yet clarified, deferred, accepted, or escalated.

| ID | Issue | Type | Severity Tier | Impact | Required Action | Reasoning Status | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UI-001 | State JSON schema draft is defined. | dependency | Tier 3 | Previously blocked deterministic implementation and tests. | refine during implementation | Drafted in `docs/03_CONTRACTS/STATE_MODEL_CONTRACT.md`. | clarified |
| UI-002 | Normalized event taxonomy and payload draft are defined. | dependency | Tier 3 | Previously blocked platform-independent adapter boundary. | refine during implementation | Drafted in `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md`. | clarified |
| UI-003 | AI structured decision schema draft is defined. | dependency | Tier 3 | Previously blocked reliable model/tool integration. | refine during implementation | Drafted in `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md`. | clarified |
| UI-004 | Tool names, signatures, permissions, and side effects are bounded in draft form. | dependency | Tier 3 | Previously blocked safe action execution. | refine during implementation | Drafted in `docs/03_CONTRACTS/TOOL_CONTRACT.md`. | clarified |
| UI-005 | Exact STT variant, translation routing, and hardware benchmark remain undecided; the default local LLM direction is Qwen3-8B with a Whisper-family STT provider. | dependency | Tier 3 | Blocks final latency and integration planning, but no longer blocks provider-interface implementation. | benchmark and refine | Qwen3-8B is locked as the default local reasoning/text-translation model; exact Whisper variant, quantization, hardware, and fallback routing remain open. | partially clarified |
| UI-006 | Exact UI visual system and fallback UX are scaffolded but not final. | ambiguity | Tier 3 | Blocks polished production frontend implementation. | refine during frontend work | Dependency-free learner UI now exists with private Bud panel, Help button, composer, and adaptive scan control. Visual system and full fallback UX remain open. | partially clarified |
| UI-007 | Zoom-first proof is a stale candidate, not an active MVP requirement. | dependency | Tier 2 | Would affect future adapter work only. | revisit only if Zoom integration is reopened | RTMS/Marketplace authorization and distribution requirements made the candidate unsuitable for the current core build. | deferred |
| UI-008 | Live lesson-transcript retrieval mechanism for Help, I'm Stuck is not yet provider-wired. | dependency | Tier 3 | Blocks production-quality transcript/current-activity grounding from live providers. | refine during provider/state work | Grounding policy is locked: learner request, current stage/task/objective, latest facilitator context with a five-minute freshness target, and relevant current-stage events; missing or ambiguous context triggers clarification. | partially clarified |
| UI-009 | Live participation analytics is scaffolded but not provider-scheduled. | dependency | Tier 3 | Blocks production-quality periodic detection from LiveKit/frontend voice/text/reaction streams. | refine during LiveKit/frontend work | The policy is locked at a three-minute window, three relevant opportunities, ten-minute cooldown, and stage-based dismissal reset; implementation still needs live provider scheduling. | partially clarified |
| UI-010 | Future cloud-hosted workshop deployment is not yet specified. | accepted uncertainty | Tier 2 | Affects server reachability, room lifecycle, identity, persistence, and operational ownership after the local prototype. | revisit before cloud deployment work | Preserve cloud hosting as a future option without changing the teacher-hosted prototype assumption. | deferred |
| UI-011 | A future Zoom integration path is not yet specified. | ambiguity | Tier 2 | Determines future adapter feasibility and claims only. | clarify only before future Zoom adapter implementation | The native Bud platform is the active MVP. | deferred |
| UI-012 | WorkshopModel authoring and approval workflow is not fully specified. | dependency | Tier 2 | The operational compass may be interpreted differently by the teacher, Bud, and runtime. | clarify before workshop lifecycle implementation | Source docs define a human-approved WorkshopModel but not its authoring, validation, or approval steps. | open |
| UI-013 | WorkshopModel versioning and change semantics are not specified. | dependency | Tier 2 | Mid-workshop changes could invalidate state, evidence, and success criteria. | clarify with workshop lifecycle | Version identity, effective time, and migration behavior remain open. | open |
| UI-014 | Evidence and confidence semantics are not fully operationalized. | dependency | Tier 2 | Bud could make inconsistent claims or expose unsupported certainty across surfaces. | clarify before model/provider wiring | The doctrine defines evidence before judgment, but exact representation and calibration remain open. | open |
| UI-015 | Correction, disagreement, and revision workflow is not fully specified. | dependency | Tier 2 | Human corrections may fail to update downstream meaning, state, or facilitator projections consistently. | clarify before shared-state implementation | Contracts include correction and disputed states, but authority and propagation rules remain open. | open |
| UI-016 | Facilitator signal vocabulary and thresholds are not fully specified. | dependency | Tier 2 | Teacher-facing signals could become noisy, overreaching, or inconsistent with minimum-necessary projection. | clarify before facilitator UI | Signal types exist in draft form; trigger thresholds and presentation rules remain open. | open |
| UI-017 | Language configuration and language-change behavior are not fully specified. | ambiguity | Tier 3 | Translation, Bud replies, UI labels, and participant preferences could diverge during a live workshop. | clarify before real language pipeline wiring | The product requires at least two languages, but runtime preference and change semantics remain open. | open |
| UI-018 | Group and breakout semantics are not fully specified. | dependency | Tier 2 | US reasoning, event scope, privacy, and room patterns depend on stable group membership rules. | clarify before multi-group implementation | GroupState exists, but creation, movement, breakout, and merge behavior remain open. | open |
| UI-019 | Intervention arbitration and escalation ordering are not fully specified. | dependency | Tier 2 | Competing Bud actions could produce duplicate, conflicting, or wrongly scoped interventions. | clarify before concurrent decision handling | The doctrine names minimum-sufficient intervention, but arbitration and escalation rules remain open. | open |
| UI-020 | Acceptance and demonstration proof criteria are not fully specified. | dependency | Tier 2 | The project could claim success without proving the required privacy, agency, grounding, and integration behaviors. | clarify before final demo claims | Demo documents identify evidence to show, but pass/fail thresholds and proof fixtures remain open. | open |

## Ambiguity Severity Register

Severity affects questioning priority, escalation priority, and clarification frontier ordering. Severity does not create governance authority.

| Tier | Meaning | Active Items | Notes |
| --- | --- | --- | --- |
| Tier 1 | Constitutional / Identity destabilizing | None currently active | Naming has been clarified as Bud AI / Bud. |
| Tier 2 | Structural dependency destabilizing | DEP-004, DEP-010, DEP-011, UI-007, UI-010 through UI-016, UI-018 through UI-020 | WorkshopModel, authority, lifecycle, identity, privacy, evidence, correction, groups, intervention, hosting, Zoom, and proof boundaries affect product coherence. |
| Tier 3 | Implementation destabilizing | DEP-002, UI-005, UI-006, UI-008, UI-009, UI-017 | Provider decisions, UI/fallback behavior, live context and participation ingestion, and language-change behavior remain open after scaffold. |
| Tier 4 | Cosmetic / Low-risk | DEP-005 | Naming file convention is clarified. |

## Accepted Uncertainty

Accepted uncertainty is uncertainty intentionally preserved by human authority or project context.

| ID | Uncertainty | Rationale for Acceptance | Scope | Revisit Trigger |
| --- | --- | --- | --- | --- |
| AU-001 | Provider/model selections may remain unresolved during constitutional artifact generation. | Contracts can define boundaries before provider selection. | STT, translation, LLM, turn detection. | Before implementation wiring or benchmarking. |
| AU-002 | Legacy documents may continue to use "AI Partner". | They are canonical source lineage and should not be rewritten silently. | Existing canonical docs. | If the human requests a full rename pass. |
| AU-003 | Future builds may host the Bud AI server in the cloud so the teacher and students connect to a shared remote workshop instance. | The human requested this as a future possibility, while the prototype remains teacher-hosted locally. | Post-prototype deployment topology. | Before cloud deployment, multi-workshop hosting, or remote operational support is implemented. |
| AU-004 | Local/open-source model inference is the preferred low-latency provider direction, but the exact model, quantization, hardware, and fallback path remain unresolved. | Local inference may reduce network/API dependence, but speed and quality must be measured rather than assumed. | Provider/model architecture and latency work. | Before real provider wiring and benchmarking. |

## Warning Registry

Warnings must use exact KRYSTALIZE syntax.

| ID | Warning Syntax | Severity Tier | Issue | Implications | Warning-Linked Rationale | Clarification or Deferral Requested | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-001 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 3 | Implementation depended on state, event, AI decision, and tool contracts that were not yet generated. | Coding before contracts risked semantic drift and demo shortcuts. | The handoff required semantic integrity before implementation. | Contracts generated in `/docs/03_CONTRACTS/`. | resolved |
| W-002 | [WARNING :: AMBIGUITY] | Tier 4 | "AI Partner" remains in source docs while current constitutional artifacts use "Bud AI". | Untracked renaming could make traceability brittle. | Human clarified product name after canonical source docs were written. | Preserve AI Partner as lineage unless full rename is requested. | open |
| W-003 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 3 | Help, I'm Stuck depends on live lesson transcript/current-activity provider wiring for production grounding. | The scaffold now resolves stored context, but must not claim production transcript alignment until LiveKit/provider context ingestion exists. | The feature is accepted and scaffold-grounded; production provider wiring remains incomplete. | Implement transcript/current-activity ingestion during provider work. | open |
| W-004 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 3 | Adaptive check-in depends on LiveKit/frontend scheduling and richer activity analytics for production periodic behavior. | The scaffold can now generate low-activity observations from stored shared evidence, but must not claim production LiveKit-driven periodic detection until scheduler and provider events are wired. | The feature is accepted and scaffold-observed; adapter-driven participation analytics are still incomplete. | Wire observation scans to LiveKit/frontend activity streams before production demo claims. | open |
| W-005 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | Future cloud hosting depends on decisions about remote server reachability, workshop/room lifecycle, participant identity, persistence, and operational ownership. | The prototype must not be described as cloud-hosted or production multi-workshop infrastructure. | The human introduced cloud hosting as a future build direction while keeping the teacher-hosted prototype topology. | Revisit the deployment boundary before implementing cloud hosting. | open |
| W-007 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | The former Zoom-first demonstration depended on selecting a permitted capture path, authorization model, and evidence/privacy boundary. | It could not be claimed without external entitlement and verification. | RTMS/Marketplace setup and distribution constraints made Zoom unsuitable as the current core MVP dependency. | Retained as historical rationale; revisit only if Zoom integration is reopened. | deferred |
| W-008 | [WARNING :: UNRESOLVED_DEPENDENCY] | Tier 2 | The contracts contain draft structures for WorkshopModel, evidence/confidence, correction, signals, groups, arbitration, and acceptance, but their operational semantics are not yet clarified. | Semantically final multi-client, facilitator, provider, or demo claims could encode assumptions that later require cross-document rewrites. | Fresh full-document review identified nine additional gates beyond the original 15. | Clarify the ranked CG-016 through CG-024 branches at the appropriate point in the queue. | open |
| W-009 | [WARNING :: INTENT_CHANGE_DETECTED] | Tier 2 | Earlier team material described a live video/voice/text workshop; the human now narrows the MVP to voice and text only to protect latency and scope. | Video must not remain an accidental MVP requirement or create conflicting architecture/demo claims. | The human explicitly chose to exclude video and prioritize current-context, low-latency Bud behavior. | Update active PRD and implementation claims; preserve video only as historical source context or future option. | open |
| W-010 | [WARNING :: INTENT_CHANGE_DETECTED] | Tier 2 | The earlier LiveKit-first primary-demo emphasis was temporarily replaced by a Zoom-first companion candidate. | The candidate created external authorization, entitlement, and distribution dependencies that conflicted with the intent to build Bud natively. | The Zoom-first direction was not completed as a KRYSTALIZE clarification decision. | Superseded by W-012 and retained as history. | resolved |
| W-013 | [WARNING :: INTENT_CHANGE_DETECTED] | Tier 2 | The earlier prototype recovery proposal would have made participants leave or require re-addition when the teacher control client disconnected. | That behavior would interrupt student continuity and contradict the clarified desire for the whole session to pause while students remain connected. | Human explicitly changed the recovery intent to automatic session pause with state preservation. | Replace participant removal with automatic `PAUSED`; clarify the reconnection grace period next. | resolved |
| W-011 | [WARNING :: INTENT_CHANGE_DETECTED] | Tier 2 | The timeboxed MVP had temporarily deferred the native workshop platform for Zoom integration proof. | That scope reduction would make core Bud behavior depend on external Zoom configuration. | The human re-evaluated the dependency after examining RTMS/Marketplace requirements. | Superseded by W-012 and retained as history. | resolved |
| W-012 | [WARNING :: INTENT_CHANGE_DETECTED] | Tier 2 | The project is restoring the native LiveKit workshop as the active MVP and marking the Zoom-first PRD candidate stale. | Active PRD, build sequence, and clarification priority must return to native-platform work; Zoom claims must be removed from the MVP. | A Zoom adapter requires Marketplace/RTMS setup, authorization, entitlement, and constrained app distribution, while a native platform gives Bud direct control of workshop data and privacy boundaries. | Continue with CG-005, the LiveKit room and media lifecycle clarification. | open |

## Historical Clarification Register

This register records the areas that required clarification during the journey. It is retained as historical rationale and is closed for the current MVP; it is not an active blocker list.

| Gate | Area Requiring KRYSTALIZE | Severity | Questions That Must Be Stabilized | Blocks |
| --- | --- | --- | --- | --- |
| CG-001 | Workshop lifecycle and authority | Tier 2 | Who creates a workshop, starts it, pauses it, ends it, restarts it, and has authority over those actions? | Server lifecycle, teacher controls, room state |
| CG-002 | Learner joining and identity | Tier 2 | How does a learner receive the join link/code, identify themselves, reconnect, and avoid joining the wrong workshop? | Browser joining, participant mapping, privacy |
| CG-003 | Bud activation lifecycle | Tier 2 | Does each learner's private Bud activate immediately on join, after consent, or after an explicit "Start Bud" action? What pauses or ends it? | Private context creation, consent, UI state |
| CG-004 | Prototype network topology | Tier 2 | Is the teacher-hosted server reachable only on the teacher's machine, across a trusted local network, or through a configured public tunnel? | Join URL, server binding, security expectations |
| CG-005 | LiveKit room and media lifecycle | Tier 3 | When is a LiveKit room created, who receives tokens, which voice/text tracks are permitted, and what happens on disconnect or reconnect? | Voice, transcript ingestion, room adapter |
| CG-006 | Privacy, consent, and visibility | Tier 2 | What may Bud observe, what remains private, what minimum-necessary signals may reach the teacher, and what requires learner consent? | ME / THE ROOM projections, logging, tools |
| CG-007 | Teacher controls and intervention boundaries | Tier 2 | What can the teacher see, initiate, dismiss, correct, or override, and what must remain learner-controlled? | Facilitator UI, permissions, human authority |
| CG-008 | Multi-learner workshop behavior | Tier 2 | How are multiple Bud contexts isolated, how are shared events scoped, and how does the server prevent cross-learner leakage? | State model, concurrency, privacy tests |
| CG-009 | Adaptive Check-in policy | Tier 3 | What observation window, cooldown, quiet period, dismissal behavior, and re-invitation rules are acceptable? | Scheduler, participation analytics, learner agency |
| CG-010 | Help, I'm Stuck grounding | Tier 3 | Which facilitator transcript, current activity, and workshop evidence may ground the explanation, and how recent must it be? | Context resolver, transcript pipeline, evidence display |
| CG-011 | Data retention and session records | Tier 2 | What is stored, for how long, who can access it, and what is deleted when a workshop ends? | Persistence, privacy, future cloud hosting |
| CG-012 | Failure and recovery behavior | Tier 3 | What should Bud do when the teacher server, browser, LiveKit room, transcript provider, or model disconnects or becomes uncertain? | WAIT / NO_ACTION, reconnect UX, provider adapters |
| CG-013 | Future cloud deployment boundary | Tier 2 | When does the project move from teacher-hosted workshops to cloud hosting, and who owns authentication, operations, tenancy, and cost? | Cloud architecture, production claims |
| CG-014 | Provider and model choices | Tier 3 | Which STT, translation, LLM, and turn-detection providers meet the required latency, quality, privacy, and budget constraints? | Real-time behavior, deployment, benchmarking |
| CG-015 | Future Zoom integration proof mode | Tier 2 | If Zoom is reopened later, what must it prove, how does Bud receive permitted input, and what authorization and privacy conditions apply? | Future Zoom adapter, RTMS/SDK path, participant mapping, consent, capture pipeline, demo claims |
| CG-016 | WorkshopModel authoring and approval | Tier 2 | Who drafts the objective, stages, tasks, outcomes, success conditions, supported languages, participant/group structure, and Bud availability; what does Bud propose; and what must the teacher explicitly approve? | Workshop lifecycle, state initialization, success criteria, Bud availability |
| CG-017 | WorkshopModel versioning and change semantics | Tier 2 | Can the model change after the workshop starts, who may change it, when does a new version take effect, and how are existing evidence and state associated with old versus new versions? | State revisions, evidence, persistence |
| CG-018 | Evidence and confidence semantics | Tier 2 | What counts as evidence for each claim, how is confidence represented, and when must Bud use unknown, ask for clarification, or request human confirmation? | Decisions, state updates, provider prompts |
| CG-019 | Correction, disagreement, and revision workflow | Tier 2 | Who may correct STT, translation, interpretation, or state; how does correction propagate; and when does disagreement remain productive rather than become an error? | US meaning repair, revisions, facilitator view |
| CG-020 | Facilitator signal vocabulary and thresholds | Tier 2 | Which operational signals may reach the teacher, what evidence and persistence thresholds trigger them, and how are stale or resolved signals handled? | THE ROOM projection, teacher controls, privacy |
| CG-021 | Language configuration and change behavior | Tier 3 | Who chooses languages, can preferences change during a workshop, and what happens when Bud cannot translate or answer in the requested language? | STT/translation, Bud activation, UI fallback |
| CG-022 | Group and breakout semantics | Tier 2 | Who creates and changes groups, how do breakout rooms affect shared context, and what happens when learners move, merge, or leave groups? | US state, room patterns, privacy |
| CG-023 | Intervention arbitration and escalation | Tier 2 | How are simultaneous candidate actions ordered, deduplicated, suppressed, or escalated across ME, US, and THE ROOM? | Decision engine, tools, teacher/learner agency |
| CG-024 | Acceptance and demonstration proof | Tier 2 | What observable pass/fail evidence proves the core loop, privacy boundary, grounding, adaptive check-in, teacher authority, and native workshop runtime? | Demo claims, test plan, release boundary |

### Clarification Order

The recommended order is: CG-016, CG-017, CG-001, CG-002, CG-006, CG-003, CG-007, CG-008, CG-018, CG-019, CG-020, CG-022, CG-004, CG-005, CG-012, CG-011, CG-021, CG-009, CG-010, CG-023, CG-014, CG-013, CG-024, and CG-015. This ordering starts with the WorkshopModel and authority chain, then stabilizes identity, privacy, activation, shared-state semantics, and the native LiveKit lifecycle. CG-015 is deferred because Zoom is not an active MVP dependency. CG-024 is listed near the end because acceptance criteria should reflect the stabilized meaning, while its test dimensions should be prepared in parallel.

Until CG-001 through CG-008 are sufficiently clarified, implementation should remain scaffold-level and must not claim a complete multi-client LiveKit workshop or production deployment.

## Clarification Ordering Rule

| ID | Rule | Rationale | Consequence |
| --- | --- | --- | --- |
| COR-001 | Before beginning a substantial KRYSTALIZE clarification pass, first rank the unresolved areas by dependency and clarify the highest-order decisions before lower-order decisions. | The human identified that clarifying the wrong area first can force rewriting across constitutional, contract, implementation, and integration documentation. | Do not begin provider, platform, UI, or feature-specific clarification until the authority, lifecycle, identity, privacy, and context decisions they depend on are sufficiently stable. |

This is a process rule for protecting cross-document consistency. It does not prevent urgent clarification when implementation reality exposes a higher-severity ambiguity; it requires that the new branch be ranked before work continues.

## Clarification Frontier

The active clarification frontier is closed. The tables below preserve the historical shape of the frontier for traceability; they are not current requests for human clarification.

### Active Clarification Question

| Priority | Active Question | Severity Tier | Why It Matters | Dependency Impact | Reasoning Status |
| --- | --- | --- | --- | --- | --- |
| 24 | Completed: future Zoom integration must prove authorized capture, participant mapping, privacy/consent, normalized-event conversion, and graceful failure. | Tier 2 | The final clarification item is resolved while preserving Zoom as deferred future scope. | Determines future adapter scope and verification gates only; it does not block the native MVP. | closed |

### Historical Adjacent Branches

| ID | Branch | Severity Tier | Relationship to Active Question | Blocked Until |
| --- | --- | --- | --- | --- |
| BR-001 | Learner lifecycle and identity | Tier 2 | WorkshopModel authority must be stable before lifecycle is detailed. | CG-017 is clarified. |
| BR-002 | Privacy and consent | Tier 2 | Visibility rules depend on authority and lifecycle. | CG-001 through CG-003 are clarified. |
| BR-003 | Evidence, correction, and intervention | Tier 2 | Shared meaning and teacher signals depend on evidence semantics. | CG-018 is clarified. |
| BR-004 | Provider/model selection | Tier 3 | Contracts abstract providers, but real wiring requires choices. | CG-018, CG-021, and CG-012 are clarified. |
| BR-005 | Future Zoom proof mode | Tier 2 | Zoom is deferred; no active MVP work depends on its technical boundary. | Reopen only after the native workshop is stable. |
| BR-006 | Cloud deployment | Tier 2 | Cloud is a future option, not a current prototype capability. | CG-013 is reached in the order. |

### Historical Blocked Questions

| ID | Blocked Question | Depends On | Severity Tier | Reasoning Status |
| --- | --- | --- | --- | --- |
| BQ-001 | Which STT provider should Bud use? | Evidence, language, failure, and budget constraints | Tier 3 | blocked pending CG-018, CG-021, CG-012, and implementation planning |
| BQ-002 | What persistence layer should Bud use? | Retention policy, model versioning, and MVP deployment needs | Tier 3 | blocked pending CG-017 and CG-011 |
| BQ-003 | What facilitator signals are allowed? | Signal vocabulary, privacy, and threshold clarification | Tier 2 | blocked pending CG-006 and CG-020 |

## Current Next Work

Upgrade the executable text-first Bud AI scaffold using:

- `docs/03_CONTRACTS/STATE_MODEL_CONTRACT.md`
- `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md`
- `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md`
- `docs/03_CONTRACTS/TOOL_CONTRACT.md`
- `docs/04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md`
- `docs/04_IMPLEMENTATION/REPO_STRUCTURE.md`
- `docs/04_IMPLEMENTATION/MVP_BUILD_SEQUENCE.md`
- `docs/04_IMPLEMENTATION/PROVIDER_ABSTRACTION_PLAN.md`
- `docs/05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md`
- `bud-ai/`

All 24 ranked clarification items are now clarified, deferred, or explicitly bounded. No further human clarification is required before implementation. The next work pass is implementation against the native LiveKit MVP. Exact provider measurements, UI polish, and wiring details are engineering tasks governed by the locked contracts; the Zoom adapter and cloud deployment remain future work and must not be treated as current demo capabilities.

## Traceability Index

Use this section to preserve machine/human-readable traceability.

| Trace ID | Related Item | Source | Linked Journal Entry | Notes |
| --- | --- | --- | --- | --- |
| TR-001 | Bud AI naming | Human clarification on 2026-07-25 | CJ-001 | Current constitutional artifacts use `K_BUD_AI...`. |
| TR-002 | Not translation-only doctrine | `01_PRODUCT_CONSTITUTION_CANONICAL.md` | CJ-001 | Preserved as core philosophy. |
| TR-003 | ME / US / THE ROOM | `01_PRODUCT_CONSTITUTION_CANONICAL.md`, `05_SYSTEM_BEHAVIOR_SPEC_v1.0_CANDIDATE.md` | CJ-001 | Preserved as core reasoning model. |
| TR-004 | LiveKit-first architecture | `04_ADR_001_REALTIME_WORKSHOP_AND_INTEGRATION_ARCHITECTURE_CANONICAL.md` | CJ-001 | Primary implementation path. |
| TR-005 | Contract-first requirement | `CODEX_KRYSTALIZE_HANDOFF.md`, `06_CONSISTENCY_AND_TRACEABILITY_REPORT.md` | CJ-001 | Next work focus. |
| TR-006 | State model contract | `docs/03_CONTRACTS/STATE_MODEL_CONTRACT.md` | CJ-002 | Draft implementation contract generated. |
| TR-007 | Normalized event contract | `docs/03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md` | CJ-002 | Draft implementation contract generated. |
| TR-008 | AI decision contract | `docs/03_CONTRACTS/AI_DECISION_CONTRACT.md` | CJ-002 | Draft implementation contract generated. |
| TR-009 | Tool contract | `docs/03_CONTRACTS/TOOL_CONTRACT.md` | CJ-002 | Draft implementation contract generated. |
| TR-010 | Implementation plan | `docs/04_IMPLEMENTATION/IMPLEMENTATION_PLAN.md` | CJ-003 | Draft implementation bridge generated. |
| TR-011 | Repository structure | `docs/04_IMPLEMENTATION/REPO_STRUCTURE.md` | CJ-003 | Draft source layout generated. |
| TR-012 | MVP build sequence | `docs/04_IMPLEMENTATION/MVP_BUILD_SEQUENCE.md` | CJ-003 | Draft build sequence generated. |
| TR-013 | Provider abstraction plan | `docs/04_IMPLEMENTATION/PROVIDER_ABSTRACTION_PLAN.md` | CJ-003 | Provider choices remain explicit open decisions. |
| TR-014 | Test and demo plan | `docs/05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md` | CJ-003 | Draft proof plan generated. |
| TR-015 | Executable scaffold | `bud-ai/` | CJ-004 | Dependency-free Node scaffold generated and verified. |
| TR-016 | Help, I'm Stuck feature | `docs/03_CONTRACTS/TOOL_CONTRACT.md`, `bud-ai/apps/server/src/core/bud-core.js`, `docs/05_DEMO_AND_TESTING/TEST_AND_DEMO_PLAN.md` | CJ-005 | Feature accepted and added as private ME support flow. |
| TR-017 | Adaptive participation observer | `bud-ai/apps/server/src/observation/participation-observer.js`, `bud-ai/apps/server/src/runtime.js`, `bud-ai/tests/run-tests.js` | CJ-008 | Scaffold now generates low-activity observations from recent shared evidence and routes them through the existing private adaptive check-in decision path. |
| TR-018 | Learner UI surface | `bud-ai/apps/web/src/app/`, `bud-ai/apps/server/src/index.js`, `bud-ai/tests/run-tests.js` | CJ-009 | Dependency-free learner UI and local API now expose private Bud thread, Help button, private composer, and observation scan control. |
| TR-019 | Prototype teacher-hosted topology and future cloud option | Human clarification / future-build note | CJ-010 | Prototype remains teacher-hosted; cloud hosting is preserved as future accepted uncertainty. |
| TR-045 | AI Partner design thesis | `README.md`, `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`, `docs/04_IMPLEMENTATION/ARCHITECTURE.md` | CJ-062 | Bounded agency toward shared workshop meaning is distinguished from passive tool behavior. |
| TR-046 | Proactive learner summary | `bud-ai/apps/server/src/index.js`, `bud-ai/apps/web/src/app/app.js`, `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` | CJ-062 | Private summary behavior and the 90-second cooldown are recorded. |
| TR-047 | Automatic facilitator room report | `bud-ai/apps/server/src/index.js`, `bud-ai/apps/web/src/app/facilitator.js`, `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` | CJ-062 | Aggregate report appears on facilitator view entry without requiring a prompt. |
| TR-048 | Live-vid media boundary | `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`, `docs/04_IMPLEMENTATION/ARCHITECTURE.md` | CJ-063 | Optional LiveKit camera/screen media is separated from the voice/text AI input path. |
| TR-049 | Single main screen-share rule | `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`, `docs/04_IMPLEMENTATION/ARCHITECTURE.md` | CJ-063 | One active screen share occupies the main media space; no silent replacement or queueing. |
| TR-050 | Media privacy and permissions | `docs/01_PRODUCT/PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` | CJ-063 | Facilitator controls participant sharing; no media recording or AI vision processing in this build. |
