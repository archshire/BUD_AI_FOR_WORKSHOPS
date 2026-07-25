# TEST_AND_DEMO_PLAN

## Status

Draft test and demo plan for Bud AI MVP.

## Goal

Prove Bud is a bounded but genuine real-time multilingual workshop partner, not a scripted translation demo.

## Problem Statement Traceability

The current local prototype satisfies the mandatory requirements in
`Problem Statement (Final).pdf`:

- **Both roles:** facilitator and learner views, including Facil-Bud and
  learner-specific Bud surfaces.
- **At least two languages:** English, Spanish, Simplified Chinese, Burmese,
  and French are configured in the local speech/translation path.
- **Real-time learning scenario:** LiveKit room connection, microphone input,
  live transcription/captions, translation, multilingual text, and private
  support can be shown with multiple browser clients.
- **Response speed, accuracy, accessibility, and privacy:** latency is
  measured, provider failure is visible, text is available as a fallback with
  keyboard submission, and private learner-Bud content is not projected to the
  facilitator by default.

This is a **working local prototype** claim for the judging demo. It does not
claim production deployment, broad language-accuracy validation, durable
accounts/database storage, or voice-to-Bud conversational responses. Those
remain follow-up work rather than blockers for the PDF's minimum requirements.

## Test Layers

### Contract Tests

Must verify:

- Valid normalized events pass schema validation.
- Invalid event payloads fail.
- Valid AI decisions pass schema validation.
- Tool calls without evidence fail.
- Raw private content cannot be sent to facilitator view without permission.
- WAIT and NO_ACTION are accepted decisions.

### Core Behavior Tests

Must verify:

- Evidence-linked state update.
- Unknown when evidence is insufficient.
- Correction revises dependent inference.
- Disputed translation reopens state.
- Productive disagreement can remain unresolved.
- Facilitator decision remains human-owned.

### Integration Tests

Must verify:

- Text message -> normalized event -> Bud decision -> validated tool -> state update.
- Private check-in remains private.
- Help, I'm Stuck response remains private and grounded in workshop context.
- Help, I'm Stuck asks privately for clarification rather than inventing an explanation when context cannot be resolved.
- Help, I'm Stuck prioritizes the learner request and current stage/task/objective, uses facilitator context within the five-minute freshness target, and excludes unrelated older material.
- Facilitator text question -> Facil-Bud -> local Qwen reply remains private to the facilitator and is grounded in the current workshop prompt.
- Adaptive check-in remains private, optional, and grounded only in observable low interaction over time.
- Group meaning repair reaches only intended group.
- Facilitator signal contains minimum-necessary operational projection.

### Provider Tests

Must verify:

- STT partials do not trigger heavy reasoning by default.
- Completed utterance triggers translation when needed.
- Translation failure preserves original evidence.
- Malformed LLM output is rejected.

## Demo Scenes

### Scene 1 - Setup And Roles

Show facilitator and at least two learners in a workshop using different languages.

Proves:

- Roles exist.
- Multilingual setup exists.
- Bud is part of the workshop, not just a caption box.

### Scene 2 - ME Private Support

A learner privately signals confusion or asks Bud for help.

Proves:

- Bud can support an individual.
- Private content does not automatically reach the facilitator.
- Bud can ask for clarification or provide bounded support.

### Scene 2A - Help, I'm Stuck

A learner taps **Help, I'm Stuck** during the activity.

Proves:

- Learner can trigger the flow from a visible private UI action.
- Bud can generate a simplified explanation from permitted workshop context.
- The explanation stays aligned with the facilitator's teaching.
- Missing context produces a private clarification prompt rather than invented lesson content.
- The response remains private unless the learner permits disclosure.
- Bud invites correction or follow-up instead of pretending perfect certainty.

### Scene 2B - Adaptive Check-in

A learner has low observable activity over a rolling three-minute window with at least three relevant low-interaction opportunities. The application generates a `participation_observation` event from recent shared workshop activity.

Proves:

- Empty-room silence does not trigger a check-in.
- Active learners are skipped.
- Learner can view and dismiss the private prompt in the Bud panel.
- Bud privately offers optional paths: ask a question, request clarification, keep listening, or contribute.
- Bud does not label the learner as confused or disengaged.
- The participant can ignore, dismiss, or respond without facilitator exposure of raw private content.
- The policy enforces a ten-minute cooldown and does not re-invite after dismissal during the same workshop stage.
- A workshop stage change resets the cooldown.

### Scene 2C - Periodic Learner Summary

After a learner joins, Bud privately provides a short progress summary based
on the current workshop prompt and recent shared context. The learner can use
the green/yellow/red controls to report understanding or continue privately.

Proves:

- The learner receives useful orientation without needing to ask an open-ended
  question first.
- The summary stays in the learner's private Bud thread.
- The 90-second cooldown prevents repetitive interruption.
- Provider failure falls back to a bounded, clearly scoped summary.

### Scene 3 - US Meaning Repair

Two learners appear aligned by translation but differ in intended meaning.

Proves:

- Translation success does not equal shared meaning.
- Bud proposes interpretation and asks peers to confirm or repair.
- Humans own the meaning.

### Scene 4 - THE ROOM Facilitator Awareness

The facilitator receives an evidence-backed operational signal.

Proves:

- Bud can synthesize room state.
- Raw private content remains hidden.
- Recommendation leaves consequential decision with facilitator.

### Scene 4B - Automatic Room Report

Open or reconnect the facilitator view after comprehension responses exist.
Bud immediately presents the latest aggregate report, including response
denominator, green/yellow/red/unknown counts, and any qualified difficult
recap point. The manual scan remains available as an explicit refresh.

Proves:

- The facilitator receives room awareness without first prompting the AI.
- No response remains unknown.
- The report contains aggregate operational evidence, not private learner
  messages or a diagnosis.

### Scene 4A - Facil-Bud Private Support

The facilitator asks Facil-Bud for a concise summary or help interpreting the
current workshop prompt.

Proves:

- The facilitator has a distinct AI surface rather than using a learner Bud.
- Facil-Bud uses the local Qwen provider.
- Facil-Bud content remains facilitator-private and does not become learner
  or room evidence automatically.

### Scene 5 - Correction And Revision

A participant says the translation or interpretation is wrong.

Proves:

- Original, translation, and interpretation are distinct.
- Bud revises state.
- Confidence can decrease or return to unknown.

### Scene 6 - WAIT / NO_ACTION

Bud observes weak evidence and chooses restraint.

Proves:

- Bud is not over-interventionist.
- Unknown/restraint is treated as intelligence.

## Judge Variation Checklist

The demo should tolerate:

- Different participant wording.
- Different confusion phrasing.
- A correction after Bud has inferred something.
- A facilitator declining or ignoring a recommendation.
- A participant declining permission.
- A learner asking Help, I'm Stuck with different confusion wording.

## Done Criteria

### Provider Benchmark Gate

- Test at least 20 varied utterances per supported language across speakers, accents, speaking speeds, and mild background noise.
- Verify input acknowledgement within 300 ms, typical Bud response within 1.5 seconds, and a 3 second maximum including one retry.
- Verify stale output is discarded, original and translation remain distinct, provider failures show visibly, and raw audio is not written to the session log.
- The browser displays per-chunk STT, translation, and total pipeline timings;
  late responses with an older speech sequence are discarded and visibly noted.

### Final Demo Acceptance

- Demonstrate the core multilingual Bud loop with varied supported input.
- Demonstrate grounded private Help, I'm Stuck support.
- Demonstrate Adaptive Check-in.
- Demonstrate comprehension rollup without exposing private content.
- Demonstrate teacher lifecycle authority and learner privacy.
- Demonstrate pause/resume, student reconnect, event replay, stale-result rejection, and visible provider failure.

- Learner flow works dynamically.
- Facilitator flow works dynamically.
- At least two languages are represented.
- Voice and text are both represented or fallback is clearly disclosed.
- Evidence links are visible in logs or UI.
- Privacy boundary is enforced by application logic.
- README can be followed by another person.
- Limitations are stated honestly.
