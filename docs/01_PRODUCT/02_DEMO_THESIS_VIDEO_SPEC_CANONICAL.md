# Demo Thesis / Video Demo Specification

**Status:** Canonical reconstructed edition

## Contents

- [Demo Thesis](#demo-thesis)
- [Target Structure](#target-structure)
- [Problem Framing](#problem-framing)
- [Scene 1: Learner Support](#scene-1--facilitator--learner-translation-plus-understanding-support)
- [Scene 2: Meaning Repair](#scene-2--peer--peer-meaning-repair-beyond-translation)
- [Scene 3: Privacy](#scene-3--privacy-and-facilitator-awareness)
- [Scene 4: Room Awareness](#scene-4--the-room-facilitator-ai-as-master-of-workshop-states)
- [Demo Integrity Requirements](#demo-integrity-requirements)
- [Tech-Stack Narrative](#tech-stack-narrative)

## Demo thesis

The demonstration must prove that the product does more than translate speech.

> **It helps humans recover and maintain shared meaning across language differences while preserving agency, privacy, and facilitator authority.**

The video is evidence of a working system, not a scripted substitute for one.

## Target structure

Approximate pacing:

- **30–45 seconds:** problem and thesis.
- **90–120 seconds:** product scenarios proving the required capabilities.
- **45–60 seconds:** architecture/tech stack, feasibility, and why the architecture supports adoption and future growth.

## Problem framing

Show that literal translation alone does not guarantee understanding.

Real-time learning can fail because learners:
- miss instructions;
- hesitate to participate;
- misunderstand intended meaning;
- struggle to express ideas;
- misunderstand peers even when translation exists.

Facilitators struggle to know who understands, who needs help, and whether an issue is individual or systemic.

## Scene 1 — Facilitator → Learner: translation plus understanding support

1. Facilitator gives a workshop instruction in one language.
2. Learner receives supported translation/captioning after a meaningful utterance boundary.
3. Learner's response reveals possible misunderstanding.
4. AI Partner evaluates the response against the approved workshop task/context.
5. AI performs a friendly private calibration/check-in rather than declaring the learner “confused.”
6. AI clarifies in the learner's preferred/native language.
7. Learner responds; state is revised.
8. If unresolved, AI can signal the facilitator with minimum necessary operational meaning.

**Evidence proved:** multilingual support, dynamic evaluation, learner agency, context-aware assistance, non-scripted intelligence, bounded escalation.

## Scene 2 — Peer → Peer: meaning repair beyond translation

1. Two participants interact across languages.
2. Translation is provided at meaningful utterance completion.
3. Despite translation, a participant perceives a possible mismatch in meaning.
4. Participant asks their AI Partner what the peer likely meant.
5. AI uses original utterance, translation shown, recent context, and workshop context to propose a contextual interpretation with appropriate uncertainty.
6. Where necessary, AI offers to help confirm meaning with the original speaker.
7. Humans clarify/confirm and shared meaning is repaired.

**Evidence proved:** translation is not treated as equivalent to understanding; original/translation/interpretation remain distinct; AI supports meaning repair without claiming certainty over human intent.

## Scene 3 — Privacy and facilitator awareness

1. Participant has a private AI interaction.
2. Facilitator asks for workshop/participant state.
3. Facilitator receives an operational signal, not raw private content.
4. If facilitator requests private chat/context, participant permission is requested.
5. A refusal is respected.

**Evidence proved:** public/private boundary, trust, application-enforced agency, useful facilitation without surveillance-by-transcript.

## Scene 4 — THE ROOM: facilitator AI as master of workshop states

1. Multiple participant/group signals accumulate.
2. AI identifies a recurring pattern across participants/groups.
3. AI distinguishes correlation from proven cause.
4. Facilitator receives:
   - what appears to be happening;
   - why it matters;
   - evidence/confidence;
   - what support has already been attempted;
   - a recommendation;
   - what the AI can help do.
5. Facilitator decides.

Example:
> “Several participants across two groups appear to share the same misunderstanding about the expected output. This may indicate an instruction-, translation-, or context-level issue. I recommend clarifying before progressing. I can draft a concise clarification.”

**Evidence proved:** ME → US → THE ROOM, pattern synthesis, facilitator partnership, bounded initiative, human authority.

## Demo integrity requirements

The same intelligence shown in the video must respond meaningfully to varied judge inputs within documented prototype limits.

Do not:
- hard-code misunderstanding triggers;
- use fixed demo timing to fake intervention;
- seed recommendations and present them as reasoning;
- fake private-permission enforcement;
- claim Zoom/Meet integrations unless actually working.

The demo may use a seeded workshop scenario and constrained languages/participants if disclosed.

## Tech-stack narrative

Explain:

- platform-independent AI Partner Core;
- normalized events;
- LiveKit-first standalone workshop for reproducible real-time voice/text;
- utterance-level translation rather than fragment-level translation;
- application-controlled state/permissions/tools;
- Zoom as a secondary/future adapter depending on implemented scope;
- future production direction toward event routing, durable state, privacy-aware orchestration, and specialized workflows.

> **The product is the intelligence layer, not the meeting platform.**
