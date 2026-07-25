# REPO_STRUCTURE

## Status

Draft repository structure for Bud AI MVP.

## Current Documentation And Source Layout

```text
Build_Docs/
  README.md
  docs/
    00_SOURCE/
    01_PRODUCT/
    02_KRYSTALIZE/
    03_CONTRACTS/
    04_IMPLEMENTATION/
    05_DEMO_AND_TESTING/
    archive/
  Krystal/
  bud-ai/
    README.md
    package.json
    .env.example

  apps/
    web/
      src/
        app/
        components/
        features/
          workshop/
          learner/
          help-stuck/
          facilitator/
          meaning-repair/
        livekit/
        styles/

    server/
      src/
        index.ts
        config/
        livekit/
        routes/
        realtime/
        context/
        observation/
        providers/
        state/
        tools/

  packages/
    contracts/
      src/
        state.ts
        events.ts
        decisions.ts
        tools.ts
        schemas.ts

    core/
      src/
        bud-core.ts
        context-router.ts
        decision-engine.ts
        escalation.ts
        privacy.ts
        evidence.ts

    test-fixtures/
      src/
        workshops.ts
        events.ts
        decisions.ts
```

## Ownership Boundaries

### `apps/web`

Owns user experience and local interaction state. It must not become the source of authoritative workshop truth.

### `apps/server`

Owns authoritative runtime state, provider calls, LiveKit token generation, decision validation, and tool execution.

### `packages/contracts`

Owns shared TypeScript types and runtime schemas derived from `/contracts`.

### `packages/core`

Owns Bud reasoning orchestration against normalized events. It must not import LiveKit-specific types.

### `packages/test-fixtures`

Owns repeatable demo and test scenarios. Fixtures may seed workshop setup, but must not hard-code claimed AI reasoning outcomes as if they were dynamic.

## Boundary Rules

- LiveKit-specific objects stay inside `apps/web/livekit` and `apps/server/livekit`.
- Bud Core accepts only `NormalizedEvent`.
- Bud Core outputs only `AiDecision`.
- Application validator owns state mutations and tool execution.
- Provider adapters hide STT, translation, and LLM vendors.
- UI displays original, translation, and interpretation as distinct concepts.

## Naming Conventions

- Product name: Bud AI.
- Short form: Bud.
- Package names may use `bud-ai` or `bud`.
- Types should use `Bud` only when the concept is product-specific; use generic names for portable contracts like `NormalizedEvent`.

## Documentation Placement

Product and process documentation lives under the top-level `docs/` tree.
The `bud-ai/` directory contains runnable application code and only keeps its
README plus service-specific operational notes. Runtime contracts in
`bud-ai/packages/contracts/` are the executable counterparts of the prose
contracts in `docs/03_CONTRACTS/`.
