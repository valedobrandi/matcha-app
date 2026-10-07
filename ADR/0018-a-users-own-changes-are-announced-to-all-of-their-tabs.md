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
- **Second event:** `{"type": "blocks.changed", "payload": null}`, pushed by `SocialService` to
  the blocker's own sockets after `POST` or `DELETE /social/blocks/{id}`. It never goes to the
  blocked user, who is never told about a block
  ([ADR-0007](0007-the-blocked-user-is-never-told.md)).
- **Third event:** `{"type": "likes.changed", "payload": null}`, pushed by `SocialService` to the
  user's own sockets after every successful `POST` or `DELETE /social/likes/{id}`. The liked user
  already learns of it through a `liked`, `matched` or `unliked` notification.
- **Client:** `RealtimeProvider` reloads the unread count and the notifications list on
  `notifications.read`, as it does on `notification`. On `blocks.changed` it reloads every view
  that hides blocked users, from the same list `useBlock` reloads in the tab that blocked. On
  `likes.changed`, and on a `liked`, `matched` or `unliked` notification, it reloads the views
  that show likes (the relationship, the public profile, the chat list and the open
  conversation), from the same list `useLikes` reloads in the tab that liked. The tab that made
  the change still updates itself from its own request, so it does not depend on its socket; the
  echo it also receives costs one extra reload.
- **Best effort:** `hub.push` logs and drops what it cannot deliver, including an envelope that
  is not JSON, and never raises, so the services call it without a wrapper and the request still
  succeeds. The hub is a required dependency of every service that pushes. Every time a tab's
  socket opens, the first time included, the tab fetches again every query it shows, so an event
  of any type missed while the socket was closed changes nothing. ADR-0011 did this for the
  notifications only.

## Status

Decided on 2026-10-06: `NotificationsService` pushes `notifications.read` after the three
mark-read requests and `RealtimeProvider` reloads on it. Recorded on 2026-10-06 at the owner's
request. Extended on 2026-10-07 after the review of #40: `blocks.changed`, and the best-effort
policy moved into the hub. Extended again on 2026-10-07 with `likes.changed`, once the chat list
([ADR-0012](0012-chat-lists-connections-and-uses-message-notifications-as-unread.md)) showed a
user's own likes in their other tabs. The same day, the reload when the socket opens grew from
the notifications to every query on screen: a `blocks.changed` missed while the socket was closed
was never fetched again.

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

- `test_notifications_service.py` checks the event after each of the three requests and no
  event after a 404. `test_social_service.py` checks that a block and an unblock reach only the
  blocker, and that a refused block sends nothing; it checks the same for a like and an unlike.
  `test_ws_hub.py` checks that an envelope that is not JSON is logged without raising or dropping
  a tab. `RealtimeProvider.test.tsx` checks that the three events mark the cached queries stale,
  that a match or an unlike reloads the chat list while a visit does not, and that every query on
  screen is fetched again each time the socket opens.
- Each mark-read call costs every open tab of the user two requests (the count and the list). A
  block marks ten queries stale, and each tab fetches again only the ones it shows.
- Each time a socket opens, its tab fetches every query it shows once more. That happens when the
  tab loads and after a reconnect, not on every page change, because the socket lives in the
  layout. Every GET is free of side effects (a visit is recorded by its own `POST`), so the extra
  fetch only refreshes the screen.
- New events follow the same rule once a screen shows the changed state. None are added before a
  screen needs them.
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
