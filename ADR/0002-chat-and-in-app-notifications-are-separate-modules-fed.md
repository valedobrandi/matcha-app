# ADR-0002: Chat and in-app notifications are separate modules fed by thin social emit hooks

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-07-30 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The subject requires real-time chat between connected users (IV.6) and in-app
notifications for liked / visited / message / match / unlike events (IV.7). The backend
already has a `notifications` module — but it is the email outbox (verify/reset mail).
Before bde builds chat and notification persistence, the module boundaries must be
fixed so the new code neither bloats `social` nor collides with the email path.

## Decision

Three boundaries:

1. **In-app notifications** are a new concern inside `backend/modules/notifications/`,
   side by side with — and never merged into — the existing email outbox. They own event
   persistence (`liked`, `visited`, `matched`, `unliked`, `message`), list, mark-read,
   and unread count.
2. **Chat** is a new module `backend/modules/chat/` owning message send/list, with authz
   on every write: messages flow only between `connected` (mutually liked) users, and a
   block forbids. Connection derivation stays in `social`.
3. `social/service.py` gets **thin emit hooks** after like / visit / unlike / match: insert
   the notification row(s) and push via the WS hub ([ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md)) — nothing more. One agreed
   call site, no business rules in the hook.

## Status

Decided — locked in the bde ticket. Moves to Approved on team sign-off.

## Group

Backend.

## Assumptions

- The email outbox (`modules/notifications/outbox_repository.py`) works today and is out
  of scope for change (bde ticket).
- `connected` status is already derivable from `social` (mutual likes) and does not need
  re-deriving in chat.
- Migrations `0007`–`0009` are taken; new tables start at `0010`.
- Chat threads can be modelled as pairwise messages queried by user-id pair; no UI
  requirement for an explicit thread table exists yet.

## Constraints

- Chat must call into `social` for connection/block state; it never computes it.
- Notification and chat persistence never lives in `users` or `social` repositories.
- The emit hook site in `social/service.py` is single and agreed between both developers —
  it is the one shared-edit surface, so changes there are coordinated.
- Notification rows store `actor_id` only; display data is joined client-side via
  `GET /users/{id}` ([ADR-0001](0001-public-profile-is-a-projection-in-the-users-module.md)).
  [ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md) (Open)
  replaces this: the list and the live push carry the actor's name.

## Positions

### A — Fold notifications and chat into `social`
Social already sees every triggering event; no hooks needed.

### B — One combined "realtime" module for notifications + chat
They share the WS transport, so one module could own both.

### C — Two dedicated modules with thin emit hooks from social (chosen)
Each concern owns its persistence and API; social only announces events.

## Argument

C keeps `social` focused on relationship rules instead of growing into a god-module
(position A), and keeps chat — a request/response feature with its own authz — from being
entangled with notification fan-out just because both ride the same socket (position B:
shared transport is not shared domain). The cost is the hook indirection in
`social/service.py`; it is justified because it is the minimal seam that lets bde build
both features without repeated edits to social's business logic.

## Implications

- Migrations `0010+` for notification rows and chat messages.
- The emit hooks make notification insertion part of the like/visit/match path — failure
  behaviour there must be decided during implementation (fail the action vs. log and
  continue).
- Hong's notification-center and chat UI (next sprint) build on these APIs plus the WS
  events; no backend redesign should be needed for that UI.
- Unlike/block must disable chat — enforced by chat's authz check, not by deleting rows.

## Related decisions

- [ADR-0001](0001-public-profile-is-a-projection-in-the-users-module.md) — actor display
  on notification lists.
- [ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md) — the transport these
  modules push through.

## Related requirements

Subject IV.6 (chat, ≤10s), IV.7 (notifications, ≤10s, unread badge from any page).

## Related artifacts

- `backend/modules/notifications/` — email outbox (existing) + in-app (to be added;
  anchor the module split with `ADR-0002` when it lands)
- `backend/modules/chat/` (to be added)
- `backend/modules/social/service.py` — emit hook site (anchor with `ADR-0002`)
- `docs/bde-public-profile-and-realtime-foundation.md` (Tasks 3–4)

## Related principles

Layer ownership: business rules in the owning service; no persistence leakage across
modules; transport is not domain.

## Notes

Open at decision time: whether notification insert failures should fail the originating
social action or degrade silently — to be settled in the Task 3 PR with a test either way.
