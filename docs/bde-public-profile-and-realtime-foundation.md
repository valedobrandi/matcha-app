# bde — Public profile + chat/notifications backend

**Owner:** Bernardo (valedobrandi) · **Branch:** `feature/public-profile-and-realtime-foundation`
**Depends on:** social + discovery backend already on `main`
**Unblocks:** Hong public profile page — via Task 1, merge it early
**Coordination:** [sprint-plan.md](sprint-plan.md) · **Decisions:** [ADR-0001](../ADR/0001-public-profile-is-a-projection-in-the-users-module.md), [ADR-0002](../ADR/0002-chat-and-in-app-notifications-are-separate-modules-fed.md), [ADR-0003](../ADR/0003-realtime-delivery-uses-a-fastapi-websocket-hub.md)

Each task below is one reviewable PR (or stacked commit), in merge order. The checkboxes
under each task **are** the definition of done — no separate outcomes list.

---

## Task 1 — Public profile read · subject IV.5 · **UNBLOCKS HONG**

> Subject: any user can view another profile — everything except email and password —
> including fame rating, online status, and last connection.

- [ ] `PublicProfile` schema in `backend/modules/users/schemas.py` — no email/password/tokens (ADR-0001)
- [ ] `UsersService.get_public_profile(viewer_id, target_id)`; block check via existing `SocialRepository`
- [ ] Route `GET /users/{user_id}`, registered after all `/me/*` routes; auth required
- [ ] Failures: `401` unauthenticated, `404` missing or blocked either way, answered alike (`TARGET_USER_NOT_FOUND`, ADR-0007)
- [ ] Tests: projection excludes email; blocked → 404; missing → 404 (service + router)

**Response fields:** `id`, `username`, `first_name`, `last_name` (required) ·
`gender`, `sexual_preference`, `age`, `bio`, `location_label` (optional) ·
`fame_rating` · `last_connection`, `is_online` (existing ~900s online rule) ·
`tags[]`, `photos[]` (same shapes as self-profile lists).

## Task 2 — Seed 500 profiles · subject III (eval: ≥500 profiles)

> Subject: the database must contain at least 500 distinct profiles.

- [ ] `python -m database.seed --users 500` runs against a fresh migrated DB
- [ ] Seeded users can log in (demo path stays usable)
- [ ] Usage documented (README or seed docstring) so Hong can demo discovery with volume

## Task 3 — In-app notifications · subject IV.7

> Subject: notify within 10s when the user is liked, visited, messaged, matched
> (like-back), or unliked by a connection; unread badge reachable from any page.

- [ ] Migration `0010+` for notification rows (`id`, `user_id`, `type`, `actor_id`, `entity_id?`, `read_at?`, `created_at`); types: `liked` `visited` `matched` `unliked` `message`
- [ ] In-app notifications in `backend/modules/notifications/` — email outbox untouched (ADR-0002): list, mark-read, unread count
- [ ] Emit hooks in `social/service.py` after like / visit / unlike / match — single agreed call site (ADR-0002)
- [ ] Store `actor_id` only; FE joins display data via `GET /users/{id}`
- [ ] Tests: each event type creates the right row(s); unread count; mark-read

## Task 4 — Chat persistence + authz · subject IV.6

> Subject: connected (mutually liked) users chat; unlike or block disables chat.

- [ ] Migration for messages (`id`, `from_user_id`, `to_user_id`, `body`, `created_at`) — pairwise, no thread table (ADR-0002)
- [ ] Module `backend/modules/chat/`: send + list; authz on every write — only `connected`, block forbids; connection derivation stays in `social`
- [ ] `message` notification emitted on send (rides Task 3)
- [ ] Tests: connected can send/list; not-connected → forbidden; blocked → forbidden

## Task 5 — WebSocket transport · subject IV.6/IV.7 (≤10s)

> Subject: chat and notifications delivered within 10 seconds.

- [ ] WS hub, one authenticated connection per user; anonymous sockets rejected (ADR-0003)
- [ ] **Decide in this PR:** JWT query param vs first-message auth — document the choice
- [ ] Push envelope `{ "type": "notification" | "chat.message", "payload": { ... } }`
- [ ] Wire Task 3 hooks + Task 4 send to push through the hub
- [ ] Verify delivery latency ≤10s in local docker

---

## Out of scope

Notification center / chat UI (Hong, next sprint) · video/audio bonus · fame or
discovery ranking changes · reopening auth · renaming `location_label` · touching
migrations `0007`–`0009` or the email outbox.

## Testing

Per repo testing strategy: TDD the service rules (projection/block, chat authz,
notification creation); router integration tests for the HTTP boundary; no FE tests, no
e2e in this epic.
