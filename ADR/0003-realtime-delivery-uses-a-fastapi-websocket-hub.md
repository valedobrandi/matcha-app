# ADR-0003: Realtime delivery uses a FastAPI WebSocket hub

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-07-30 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The subject caps delivery latency for chat messages (IV.6) and notifications (IV.7) at
10 seconds, and requires the new-message indicator and unread badge to work from any
page. A transport must be chosen before bde implements chat/notifications and before
Hong builds UI that subscribes to events.

## Decision

A single FastAPI WebSocket hub: one authenticated connection per user, pushing both
notification and chat events in the envelope
`{ "type": "notification" | "chat.message", "payload": { ... } }`. Anonymous sockets are
never accepted. The email outbox remains a separate channel and is unchanged.

[ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md) changes
"one connection per user" to one connection per open tab: the hub pushes each event to all of a
user's sockets.
It also adds the only message a client sends: `{"type":"ping","payload":null}`, which the
server answers with `{"type":"pong","payload":null}` on the same socket, so a tab can tell a
dead socket from a quiet one.

## Status

Decided — locked in the bde ticket. Moves to Approved on team sign-off.

## Group

Backend.

## Assumptions

- The subject's latency budget is ≤10s (fr.subject.md IV.6/IV.7), so polling at a short
  interval would technically pass — realtime push is a quality choice, not the only
  compliant one.
- The app runs as a single backend process in local docker for evaluation; no multi-node
  fan-out is required, so an in-process connection registry suffices.
- FastAPI's native WebSocket support is available in the existing stack; no new
  dependency is needed.

## Constraints

- Every WS connection is authenticated before any event is delivered.
- New event types extend the envelope's `type` field; the envelope shape itself is the
  contract the frontend subscribes to and must stay stable once Hong's UI ships.
- Features needing realtime delivery push through the hub — no side-channel polling
  endpoints added per feature.

## Positions

### A — Client polling of REST endpoints
Poll unread count and messages every few seconds; fits the 10s budget with no new
infrastructure.

### B — Server-Sent Events
One-directional push over HTTP; enough for notifications, but chat send still goes over
REST and a second mechanism.

### C — WebSocket hub (chosen)
One bidirectional connection per user carrying all event types.

## Argument

C is the only option that gives both features one delivery path and leaves headroom for
the chat UI next sprint without a transport migration. Polling (A) multiplies request
load with 500+ seeded users on the evaluation box and makes "from any page" badges a
per-page timer concern. SSE (B) still needs a second mechanism for chat. The cost of C —
connection lifecycle and an auth handshake — is paid once in the hub.

## Implications

- A WS auth scheme must be picked in the Task 5 PR (JWT query param vs. first-message
  auth) and documented; this is the one unresolved sub-decision.
- Frontend gains a single subscription point for the next sprint's notification center
  and chat UI.
- Latency must be verified against the 10s budget in local docker before the task is
  called done.

## Related decisions

- [ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) — the
  modules whose events this hub transports; their emit hooks call the hub.

## Related requirements

Subject IV.6 (≤10s chat delivery, indicator from any page), IV.7 (≤10s notifications,
badge from any page).

## Related artifacts

- WebSocket hub module (to be added in bde Task 5; anchor the connection registry with
  `ADR-0003` when it lands)
- `docs/bde-public-profile-and-realtime-foundation.md` (Task 5)

## Related principles

Transport is not domain: the hub delivers envelopes and holds no business rules.

## Notes

WS auth mechanism (query-param JWT vs. first-message auth) is open; the decision lands in
the Task 5 PR description. Whatever is picked, unauthenticated sockets are rejected.
