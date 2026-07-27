# UI_UX_WORKSHOP_FLOW_AND_CHAT_CONTRACT

## Document Status

Canonical product/UI contract for multilingual workshop interaction. This is
the reference document for future learner and Leader UI design.

## Contents

- [Purpose](#purpose)
- [Core Chat Promise](#core-chat-promise)
- [Message Lifecycle](#message-lifecycle)
- [Participant View](#participant-view)
- [Leader View](#leader-view)
- [Bud Context Access](#bud-context-access)
- [Privacy Boundary](#privacy-boundary)
- [Voice And Push To Talk](#voice-and-push-to-talk)
- [Direct Messages](#direct-messages)
- [Translation States And Failure](#translation-states-and-failure)
- [UI Design Consequences](#ui-design-consequences)
- [Acceptance Criteria](#acceptance-criteria)
- [Dependencies](#dependencies)

## Purpose

This contract defines how learners, the Leader, their Buds, and the common
workshop chat remain connected across languages. A visual design may change,
but it must preserve the behavioral and privacy guarantees here.

## Core Chat Promise

Every participant may contribute to the permitted common-room conversation in
their selected native language. Each recipient receives an intelligible
translation in their selected display language while the original meaning is
preserved and visibly available.

The same normalized shared event is supplied to the Buds permitted to observe
that room or group. This shared context is what allows Bud to support the human
partner with awareness of the ongoing workshop interaction. Private Bud
conversations are never included merely because the speaker is present in the
common room.

## Message Lifecycle

1. A learner or Leader writes a message or starts an explicit push-to-talk turn.
2. The application attributes the message and records its original language
   and content.
3. A meaningful completed message is normalized as a shared-room event.
4. The translation service creates recipient-language translations without
   replacing the original.
5. Each recipient sees the original followed by the translation in brackets or
   a clearly labelled translation line beneath it.
6. The permitted shared event is added to the relevant room/group Bud context.
7. A Bud responds only according to its persona, workshop grounding, privacy
   scope, and bounded agency rules.

Translation and Bud reasoning may complete at different times. The UI should
show the original immediately when possible, then update translation or Bud
state visibly rather than blocking the chat indefinitely.

## Participant View

The common chat must provide:

- room or group identity;
- sender display name and timestamp;
- original message text and source language;
- intelligible translation in the learner's selected display language;
- translation-pending or translation-unavailable state;
- a text composer and, where enabled, a push-to-talk control;
- no exposure of another learner's private Bud conversation;
- access for the learner's private Learner Bud to permitted common-room context.

The learner's own sent message remains visible in its original language and may
show the translated form for confirmation. The UI must not make a translation
appear to be the original message.

## Leader View

The Leader common chat must provide:

- the same original-plus-translation representation as the learner view;
- sender attribution and room/group scope;
- the Leader's selected native language and display-language behavior;
- a push-to-talk control for Leader speech when voice chat is enabled;
- a private Leader Bud surface separate from common chat;
- a clear indication when the Leader replies to the room, a group, or one
  learner.

The Leader receives shared-room context through common chat and aggregate
operational signals through the Leader view. The Leader does not automatically
receive private learner-Bud messages.

## Bud Context Access

Bud context is scope-based:

| Context | Learner Bud | Leader Bud | Other learners' Buds |
| --- | --- | --- | --- |
| Common room messages | Yes | Yes | Yes, for the same room |
| Breakout/group messages | Yes, for the learner's group | Yes, when permitted | Yes, only for the same group |
| Learner's private Bud messages | Owner only | No, unless explicitly permitted | No |
| Leader's private Bud messages | No | Owner only | No |

Shared-room context is evidence, not automatic truth. Bud distinguishes a
literal message from a translation and from its own interpretation. If the
translation or meaning is uncertain, Bud preserves the uncertainty and may ask
for confirmation.

## Privacy Boundary

The common chat is visible to its intended room or group audience. A translation
does not widen the audience. A message remains inside the same privacy scope
regardless of how many languages it is rendered into.

Private Bud interactions remain private by default. The application, not the
LLM, decides which normalized events enter each Bud's context window.

## Voice And Push To Talk

Push-to-talk is an explicit capture control for voice contribution to shared
chat. It must begin only after a user action, show microphone activity, stop on
the user's explicit Stop talking action or the 15-second utterance boundary,
produce an attributed transcript, and pass the completed transcript through the same
original/translation/shared-context path as typed chat. It must never become
ambient listening silently.

The text path remains available when voice capture or translation is not ready.

The current Talk implementation is utterance-based: it captures one bounded
turn, sends it to STT, requests translation, then posts the original and
translated text to the selected main-room or breakout-room chat. It does not
broadcast raw audio to every browser. This keeps the demo controllable and
preserves a clear transcript record.

## Direct Messages

Each learner and the Leader has a `CHATS (DM)` workspace. It starts empty and
does not preload the workshop roster. A conversation entry appears only after
an actual private message exists between two users; the view then presents a
chat list and one private thread at a time. Enter sends and Shift+Enter creates
a new line. Direct messages use the separate `private_dm` scope and are not
included in common-room or breakout Bud context by default. A future explicit
consent or escalation rule may permit a selected DM to become shared evidence;
the current demo does not do so.

## Translation States And Failure

The UI must distinguish:

- `translation pending` - original is available and translation is in progress;
- `translated` - a recipient-language translation is available;
- `translation unavailable` - original remains visible and the failure is
  explained;
- `meaning uncertain` - translation exists but a possible meaning gap is
  flagged.

The system must never invent a translation to fill a missing result. Human
corrections remain distinguishable from the original and from AI interpretation.

## UI Design Consequences

Future learner-page design must reserve a clearly identified common-chat
surface rather than embedding it inside the private Learner Bud panel. Each
message unit should make it easy to see who spoke, what they originally said,
what translation is being read, whether it is pending/uncertain, and how to
reply in the learner's own language.

The private Learner Bud surface may help interpret common chat, but it must not
visually blur room conversation and private AI support.

## Acceptance Criteria

- Learner A can send a message in language A and Learner B sees the original
  plus an intelligible translation in language B.
- The Leader can reply in the Leader's language and learners see appropriate
  recipient-specific translations.
- Original text remains preserved when translation fails or is corrected.
- Permitted Buds receive the normalized common-room event; private Bud messages
  remain excluded.
- Bud identifies the difference between original, translation, and
  interpretation.
- Push-to-talk produces the same shared event shape as typed chat.
- Talk is available in the Leader's main-room chat and the learner's breakout
  chat, and posts translated utterance text only after the user turns it on.
- Each role can open Chats (DM), select a workshop contact, and exchange
  private messages without leaking them into Bud's shared context.
- Provider failure is visible and does not fabricate content.
- Common chat and private Bud chat are visually and semantically distinct.

## Dependencies

- `PRD_BUD_AI_DYNAMIC_MULTILINGUAL_WORKSHOPS.md` (`FR-LANG-006`)
- `../03_CONTRACTS/NORMALIZED_EVENT_CONTRACT.md`
- `../03_CONTRACTS/AI_DECISION_CONTRACT.md`
- `../02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_STATE.md` (`LT-071`, `LT-074`, `LT-075`)
- `../02_KRYSTALIZE/K_BUD_AI_CONSTITUTIONAL_JOURNAL.md` (`CJ-069`)
