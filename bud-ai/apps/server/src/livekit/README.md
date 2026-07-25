# LiveKit Adapter

The adapter now owns the first teacher-hosted room boundary:

- participant-bound short-lived token generation;
- optional explicit room creation with a two-minute departure grace period;
- room and participant metadata;
- browser client access through `/api/livekit/token`.

The following remains for the next implementation items:

- token generation;
- LiveKit webhook/event translation;
- room participant mapping;
- audio track handling;
- conversion into `NormalizedEvent`.

Bud Core must not import LiveKit-specific objects.
