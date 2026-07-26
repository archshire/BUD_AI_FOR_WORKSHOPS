# AI Partner for Multilingual Workshops — Team Overview

*A plain-language companion to `PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md`. Read this first to get oriented; go to the active PRD for exact requirements, acceptance criteria, and edge cases.*

---

## Contents

- [What Are We Building?](#1-what-are-we-building-in-one-sentence)
- [The Problem](#2-the-problem-in-human-terms)
- [The Three AI Modes](#3-the-three-modes-the-ai-operates-in)
- [Users](#4-who-are-the-users)
- [Workshop Context](#5-what-grounds-the-ai--the-workshop-context)
- [Example Session](#6-walking-through-a-real-session)
- [Principles](#8-the-principles-holding-all-of-this-together)
- [Definition of Done](#9-what-done-looks-like)

## 1. What are we building, in one sentence?

A **live video/voice/text workshop app** (like a purpose-built Zoom) where an **AI assistant sits with every participant and the facilitator**, helping people understand each other across languages — not just translating words, but noticing confusion, helping repair misunderstandings, and giving the facilitator a real-time read on how the room is actually doing.

It is a **standalone app**, not a plugin on top of Zoom. We're building our own call/chat environment (using LiveKit, an open real-time communication engine) so the AI can be woven directly into the experience instead of bolted onto someone else's platform. A Zoom integration might come later, but it's not what we're proving first.

---

## 2. The problem, in human terms

Translating words is easy-ish. The actual hard problem in a multilingual workshop is:

- A learner nods along but didn't really get the instruction.
- A learner is confused but too embarrassed to say so in front of the group.
- Two people "translate" fine but still talk past each other.
- The facilitator is juggling 10+ people across languages and has no idea who's actually stuck.

Translation alone doesn't fix any of this. Our product is the layer that helps humans get to **shared understanding**, not just shared vocabulary.

---

## 3. The three "modes" the AI operates in

Everything the AI does falls into one of three scopes. This is the mental model to hold onto — almost every feature below is one of these three.

| Scope | Who it's for | What it does |
|---|---|---|
| **ME** | One participant | Privately checks in on that person's understanding of the current task, offers help, lets them correct the AI if it's wrong |
| **US** | Two (or more) participants | Helps repair a misunderstanding *between* people when translation alone didn't bridge the gap |
| **THE ROOM** | The facilitator | Synthesizes what's happening across the whole workshop and offers recommendations |

The AI behaves the same way in all three: it watches, forms a *tentative* opinion, checks its evidence, decides whether to say something or just wait, and updates itself when it learns more. It never presents a guess as a fact.

---

## 4. Who are the users?

- **Workshop Owner / Teacher** — defines what the workshop is about, its stages, and what "success" looks like, before it goes live. (For our prototype, this can be a pre-built template rather than a live setup wizard.)
- **Facilitator** — runs the live session. Talks to the room, and can also talk *to the AI* to ask how things are going.
- **Participant** — joins, speaks/types in their own language, gets translated content, and has a private AI assistant of their own.
- **The AI Partner itself** — not a fourth "user," but a bounded actor. It can observe, suggest, ask, and flag things — but it can't unilaterally change the workshop, expose private information, or overrule a human decision.

---

## 5. What grounds the AI — the Workshop Context

Before anything goes live, the system needs a **WorkshopModel**: the workshop's objective, its stages, the current task/instruction, what a successful outcome looks like, and readiness conditions. Think of this as a lightweight digitized version of the workshop brief/curriculum.

This means the AI isn't reasoning in a vacuum — when it evaluates whether someone seems on track, it's comparing their input against **the actual task they're supposed to be doing right now**. And it can always explain *which* task/objective it's using when it makes a judgment call.

Important guardrail: the AI can't quietly redefine what "success" means mid-workshop. That stays under human control.

---

## 6. Walking through a real session

### Setup (before anyone joins)
The facilitator opens a workshop that already has a WorkshopModel loaded (objective, stages, tasks, success criteria — either pre-approved by a teacher or a seeded template for the demo).

### Joining
Participants and the facilitator join the same live session. Each participant picks their language. Everyone sees a short notice: *this is a shared workshop space, and some of what you say publicly may be used to help facilitate the session.*

### During the workshop — the ME scenario
Ana (Spanish speaker) is working on the current task. She sends a message that suggests she's misunderstood the instruction — not with keywords the app is scripted to catch, but through the actual content of what she said, evaluated against the current task.

Her private AI Partner doesn't jump straight to "you're wrong." It first checks in gently:
> *"Quick check — where are you at with this?"*

If Ana clarifies she's fine, the AI updates its understanding and backs off — it doesn't keep flagging a resolved non-issue. If she confirms she's stuck, the AI can offer contextual help. If Ana pushes back and says "no, I get it, this is my answer" — the AI accepts that correction; it does not argue or keep insisting it was right.

### During the workshop — the US scenario
Ben (English speaker) hears something from Ana, translated, but still isn't sure what she meant. He asks his own private AI Partner: *"What did she mean by that?"*

The AI doesn't hand back a flat re-translation and call it done. It reasons about intent and answers with appropriate humility:
> *"I think she may mean X rather than Y, based on the context. Want me to help confirm with her?"*

If Ben agrees, the AI can route a bounded confirmation back to Ana — the AI is a go-between, not the final authority on what Ana meant. And critically: if Ana and Ben actually understood each other and just disagree, the system must **not** relabel that as a misunderstanding needing to be "fixed."

### During the workshop — the THE ROOM scenario
The facilitator, mid-session, asks their dashboard: *"How's everyone doing?"*

Instead of a raw transcript dump, they get a synthesized answer: e.g., three participants across two languages are showing signs of confusion on the same task — a possible pattern, not a certainty. If the AI has something substantive to suggest, it lays out: what appears to be happening, why it matters, its confidence level, what's already been tried, its recommendation, what it can help do, and what decision is still the facilitator's call.

The facilitator can accept or reject this. If they reject it, the AI respects that and doesn't nag again unless something materially new happens.

### Privacy, throughout
Everything Ana or Ben says to their *private* AI Partner stays private by default — the facilitator dashboard never gets raw private chat logs. If a private issue is relevant to facilitation (e.g., "participant needs support"), the facilitator only sees a minimal, generic operational signal — not the sensitive details. If the facilitator ever wants more than that, the participant gets an explicit permission request and can say no — and "no" is final, not worked around with a paraphrase.

---

## 7. Feature list at a glance

**Must work, and work convincingly (not just in a scripted demo):**
- Live multi-person voice + text workshop session
- At least 2 languages, real-time translation triggered per complete thought (not word-by-word)
- Original text, translated text, and the AI's interpretation are always kept distinguishable — never silently merged
- Participants can dispute a translation; disputed translations get re-evaluated, not just accepted
- ME: private, evidence-based check-ins and help for each participant, correctable by the participant
- US: AI-assisted peer meaning repair between two participants
- THE ROOM: facilitator can query for a synthesized, privacy-safe view of the whole workshop, with pattern detection and recommendations
- Privacy boundaries enforced by the app itself (not just "asked nicely" of the AI) — private content requires explicit permission to surface, and refusal is honored
- The AI can also choose to do **nothing** — not every blip needs an intervention

**Nice-to-have if time allows:** richer setup flow, more languages, a Zoom adapter, nicer dashboard polish.

**Explicitly not in scope for this build:** psychological profiling of learners, an overall "learner score," fully autonomous workshop control, perfect translation, production-grade compliance, Zoom/Meet feature parity.

---

## 8. The principles holding all of this together

1. **Human agency is never displaced.** The AI proposes, checks, and recommends — humans decide, correct, and can always overrule it.
2. **Everything is provisional until confirmed.** "Unknown" is a legitimate state — the AI isn't forced to guess.
3. **The AI questions itself first.** If something looks like a misunderstanding, the AI also considers whether *its own* translation/transcription might be the actual problem before blaming the learner.
4. **Privacy is structural, not promised.** Enforcement happens in the app's permission logic, not just in how the AI is prompted to behave.
5. **Minimum necessary sharing.** Even when private info does inform facilitator support, only the generic operational consequence crosses over — not the sensitive detail.

---

## 9. What "done" looks like

We'll know the prototype is working when a teammate (or judge) can run a real session, vary what they say naturally, and watch the whole loop happen live: real input → preserved meaning → translation → contextual reasoning → a provisional, evidence-backed judgment → a bounded action or a deliberate wait → a human response → the AI updating itself → a useful, privacy-respecting insight reaching the facilitator. If it only works because we hard-coded the "confused participant" line, it doesn't count.
