# ADR-0018: A user's own changes are announced to all of their tabs, which reload what changed

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-06 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Every tab keeps its own TanStack Query cache and its own socket
([ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md)). The hub pushes
an event to all of a user's sockets when someone else acts: a `notification` or a
`chat.message`. When the user acts in one tab (marks a notification read, marks all of them
read, or opens a conversation,
[ADR-0012](0012-chat-lists-connections-and-uses-message-notifications-as-unread.md)), only that
tab updates its cache, from its own request. The user's other tabs and devices keep the old
unread count until they reload on focus or on the next event, so two windows side by side
disagree. The chat screen will mark message notifications read every time a conversation is
opened and every time a message arrives in an open one.

## Decision

- **Rule:** when a request changes server state that the user's other tabs show, the backend
  service that owns the change pushes an event to all of that user's sockets, after the write.
- **Facts, not data:** the event says what happened and the client decides what to reload. The
  payload carries no new values, and the server never names the client's cache keys.
- **First event:** `{"type": "notifications.read", "payload": null}`, pushed by
  `NotificationsService` after `POST /notifications/{id}/read`, `POST /notifications/read-all`
  and `POST /chat/conversations/{peer_id}/read`. It is sent after every successful call, even
  when nothing was unread, because a reload is harmless. It is not sent when the notification is
  missing (404).
- **Client:** `RealtimeProvider` reloads the unread count and the notifications list on
  `notifications.read`, as it does on `notification`. The tab that made the change still updates
  itself from its own request, so it does not depend on its socket; the echo it also receives
  costs one extra reload.
- **Best effort:** a failed push is logged and the request still succeeds. A tab that missed the
  event reloads when its socket opens again (ADR-0011).

## Status

Decided on 2026-10-06: `NotificationsService` pushes `notifications.read` after the three
mark-read requests and `RealtimeProvider` reloads on it. Recorded on 2026-10-06 at the owner's
request.

## Positions

### A — The server announces the change; tabs reload (chosen)
It reaches every tab and every device, keeps the server as the only source of truth, and cannot
leave a wrong count when events arrive out of order, because every reload reads the current
state.

### B — The server pushes the new values, such as the new counts
It saves a request per tab, but two events arriving out of order can leave a wrong count, and
the payload would be a second copy of a response shape that is not generated from the backend
models ([ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md)).

### C — Tabs tell each other in the browser (BroadcastChannel)
No server change, but it reaches only the tabs of one browser, not another device, and every
mutation needs its own client code.

### D — Rely on the reload when a tab gets focus
TanStack Query already does it, but two visible windows, or a phone and a laptop, disagree
until the user clicks.

## Argument

The hub already fans out to every tab, and `RealtimeProvider` already turns events into reloads
(ADR-0011); the missing piece was announcing the user's own changes. Facts keep the server
unaware of how each client caches, and reloading makes duplicate, missed or reordered events
harmless.

## Implications

- `test_notifications_service.py` checks the event after each of the three requests, no event
  after a 404, and that a failing push does not fail the request. `RealtimeProvider.test.tsx`
  checks that `notifications.read` marks the cached count and list stale.
- Each call costs every open tab of the user two requests (the count and the list).
- New events follow the same rule once a screen shows the changed state, for example a block
  made in one tab while another tab shows a list. None are added before a screen needs them.
- Event names are strings repeated in `RealtimeProvider`. Generating them from backend models,
  as the HTTP types are (ADR-0015), is a separate step.
- The hub lives in one process ([ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md),
  ADR-0011). With several workers, only the inside of `hub.push(user_id, event)` would change,
  for example to Postgres LISTEN/NOTIFY; the services that push would not.

## Related

- [ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md) — its envelope gains
  `notifications.read`
- [ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md) — the socket
  per tab and the reload on every open that this rule relies on
- [ADR-0012](0012-chat-lists-connections-and-uses-message-notifications-as-unread.md) — the
  conversation read request that sends the event
- [ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md) — why the event
  carries no values
