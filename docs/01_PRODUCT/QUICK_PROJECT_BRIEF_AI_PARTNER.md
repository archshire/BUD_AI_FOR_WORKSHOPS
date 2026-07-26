# Quick Project Brief --- AI Partner for Multilingual Workshops

## Contents

- [What Are We Building?](#what-are-we-building)
- [How the Idea Evolved](#how-the-idea-evolved)
- [ME, US, and THE ROOM](#me--us--the-room)
- [Observe Before Judging](#a-key-design-principle-the-ai-observes-before-it-judges)
- [Privacy](#privacy-is-part-of-the-architecture)
- [Hackathon Scope](#what-we-are-actually-building-for-the-hackathon)
- [How We Reached the PRD](#how-we-got-to-the-prd)

## What are we building?

We are building a prototype for an **AI Partner that actively supports
people during real-time multilingual workshops**.

The central idea is that **translation alone does not guarantee
understanding**.

Someone can receive a perfectly reasonable translation and still
misunderstand the task, miss the intended meaning of another
participant, become lost, or struggle to participate. Meanwhile, a
facilitator managing many people cannot easily know who understands,
where problems are emerging, or when intervention would help.

Our product adds an **AI partnership layer** to the workshop.

Unlike a passive tool that simply waits for commands, the AI Partner can
observe permitted workshop interactions, evaluate what appears to be
happening, notice possible misunderstandings or meaning gaps, offer
appropriate support, and update its understanding as participants
respond.

The guiding principle is:

> **AI initiative without displacement of human agency.**

The AI can notice, ask, help, interpret and recommend---but humans
retain control over their meaning, privacy and consequential decisions.

## How the idea evolved

We started with the hackathon problem of **real-time cross-language
communication for learners and facilitators**.

As we explored the problem, we realized that simply building another
translation interface would miss the deeper issue:

> **The language barrier does not end when words are translated. It ends
> when people have enough shared meaning to continue working together.**

That led us to design the AI around three levels:

### ME → US → THE ROOM

**ME** is the participant's personal AI Partner. It helps the individual
understand the task, notices possible difficulty from their actual
input, checks rather than assumes, provides contextual support, and
learns from the participant's response.

**US** deals with shared meaning between people. For example, two
participants may technically receive translations but still
misunderstand each other's intended meaning. The AI can help interpret
the context, propose what may have been meant, and help the humans
clarify---without pretending it knows someone's intention with
certainty.

**THE ROOM** is the facilitator's AI Partner. It synthesizes what is
happening across participants and groups so the facilitator can see
emerging patterns, possible blockers, and where intervention may help.
It can recommend an action and explain what it can help with, while
leaving the decision with the facilitator.

## A key design principle: the AI observes before it judges

We deliberately rejected the idea that the AI should simply label people
as *confused*, *engaged*, *disengaged*, or assign mysterious learner
scores.

Instead:

**Observation → Interpretation → Provisional Inference → Action or Wait
→ New Evidence → Revision**

If someone is silent, for example, the AI should not automatically
decide they are disengaged.

It may simply **not know yet**.

If appropriate, it can ask:

> "Quick check---where are you at?"

The human's answer becomes new evidence.

This makes the AI's understanding **dynamic and revisable rather than a
permanent profile of the person**.

## Privacy is part of the architecture

We also distinguished between **public workshop space and private
participant--AI space**.

A facilitator should not automatically be able to read someone's private
conversation with their AI Partner.

The AI can instead surface the **minimum useful operational signal**,
such as:

> "This participant may benefit from additional clarification."

If the facilitator needs access to private content, permission must be
requested where that capability exists, and the participant can refuse.

So the facilitator gets useful awareness **without the system becoming
surveillance disguised as AI assistance**.

## What we are actually building for the hackathon

We deliberately separated the **future vision** from what we must
genuinely prove now.

The prototype is designed around a **platform-independent AI Partner
Core**, with a lightweight **LiveKit-based real-time workshop
environment** as the primary way to demonstrate it.

The prototype must genuinely demonstrate:

**voice + text → multilingual communication → AI observation and
reasoning → participant support → peer meaning repair → facilitator
awareness → privacy-aware action**

At least two languages will be supported in the tested prototype.

Zoom/Google Meet integrations and a more sophisticated multi-agent
architecture are possible future directions, but they are **not allowed
to distract us from proving the core intelligence first**.

## How we got to the PRD

We did not jump directly from an idea into coding.

We progressively clarified:

**Hackathon Problem → Product Philosophy → Product Constitution → Demo
Thesis → Prototype Capability Contract → Architecture Decision → System
Behavior Specification → Red-Team Stress Testing → PRD**

Along the way, we deliberately tried to break our own thinking.

We asked questions such as:

-   What if the AI is wrong about a learner?
-   What if silence simply means the learner is thinking?
-   What if two people disagree but understand each other perfectly?
-   What if the translation itself caused the misunderstanding?
-   What if private information influences an AI signal?
-   What happens when the facilitator disagrees with the AI?
-   When should the AI intervene---and when should it simply **wait**?

Those questions shaped the final PRD.

So the documentation may look extensive, but it exists because we wanted
the **code to emerge from a coherent product philosophy rather than
allowing implementation convenience to accidentally define the
product**.

## The simplest way to understand our product

Think of the system as this loop:

> **People communicate → AI observes → AI tries to understand what is
> happening in context → AI helps at the smallest appropriate level →
> humans respond and retain agency → AI updates its understanding →
> facilitator gains useful awareness when needed.**

The goal of the hackathon prototype is **not to build the entire future
platform**.

It is to prove, convincingly and with integrity, that this core idea
actually works:

> **AI can become an active but bounded partner in multilingual
> collaboration---not merely translating what people say, but helping
> people reach and maintain shared meaning.**
