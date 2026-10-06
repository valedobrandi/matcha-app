# ADR-0011: One socket per tab feeds notifications into the query cache

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Open |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-05 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Subject IV.7 requires real-time notifications, within 10 seconds, for a like, a profile visit, a
message, a like back and an unlike from a connected user, with the unread state visible from any
page ([`docs/fr.subject.md`](../docs/fr.subject.md), lines 208-234). The backend side exists:
`GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read` and
`POST /notifications/read-all`, and the hub pushes `{type: "notification", payload}`
([ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md)). The frontend has neither a
socket nor a notification screen, and three gaps stand in the way:

- A notification carries only `actor_id`.
  [ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) planned one
  `GET /users/{id}` per actor to show a name.
- The hub keeps one socket per user and closes the older one when a new one connects
  (`backend/core/ws_hub.py`). A second tab silently stops receiving events, and two tabs that
  reconnect would keep replacing each other.
- Nothing in the frontend opens or owns a socket.

## Decision

- **Actor names:** `NotificationOut` carries an `actor` object (`id`, `username`, `first_name`,
  `last_name`) in place of `actor_id`. The list reads it in the same query (as `VisitorOut`
  does), and the insert returns it, so the live push carries it too.
- **Every tab:** the hub keeps every open socket of a user and pushes each event to all of them.
- **One client:** a `RealtimeProvider` in the authenticated layout opens one socket per tab with
  the access token (`/ws?token=`, ADR-0003). It reconnects with a backoff from 1 s capped at 5 s,
  which resets only once a connection has stayed up for 10 s. When the server closes with code
  1008 (invalid or expired token), it logs out, as an HTTP 401 does.
- **Query cache:** socket events go into the TanStack Query cache. A `notification` event marks
  the unread count and the `notifications` list stale, so a mounted badge or list fetches them
  again. The server stores the notification before it pushes it, so that fetch includes it, and
  the badge always shows the server's count; the cache never depends on how the list is paged.
  Every time the socket opens, the first time included, both queries are fetched again, because
  events may have been missed before the socket joined the hub.
- **Screens:** the header shows a bell with the unread count on every page. A `/notifications`
  page lists them ("Bob liked you"). Opening one marks it read and goes to the actor's profile,
  or to the chat for a message. "Mark all as read" calls `read-all`.

## Status

Open. Recorded on 2026-10-05 at the owner's request. The implementation is not merged yet. The
status becomes `Decided` when it is.

## Positions

### A — A socket per tab that feeds the query cache (chosen)
Components keep reading server state through hooks, and the socket only updates the cache.

### B — Poll the unread count every few seconds
It fits the 10-second budget, but ADR-0003 rules polling out, and it multiplies requests.

### C — One shared socket for all tabs, through a leader tab (BroadcastChannel)
One connection per user, but electing and handing over the leader adds failure modes for no
gain at this scale.

### D — Keep one socket per user, and tell the replaced tab not to reconnect
The older tab then stops receiving events without telling the user.

For actor names, fetching `GET /users/{id}` per actor (ADR-0002) was rejected: it costs one
request per actor in every list, and a live notification cannot show a name until that request
returns. Flat fields (`actor_username`, ...) were rejected too: the actor is one thing the screen
shows and links to (`/users/{id}`), and a nested object keeps the field names of the other user
cards.

## Argument

The query cache is already where this app keeps server state; mutations such as `useBlock`
invalidate it. Feeding socket events into it gives every screen the same data with no second
store. Fan-out in the hub is a few lines and makes all tabs behave the same.

## Implications

- The hub maps each user to a set of sockets; `test_ws_hub.py` covers two sockets for one user
  and closing one of them.
- Open: sockets per user are not capped. A dead socket stays in the hub until uvicorn's
  keepalive ping times out (20 s interval, 20 s timeout by default). Revisit in the security
  review.
- The notification list query and the insert join `users`; `test_notifications_integration.py`
  checks both on a real Postgres. `frontend/src/types/api.d.ts` is regenerated.
- Frontend tests intercept the socket with MSW (`ws.link`): a pushed notification and every open
  mark the cached count and list stale, the backoff grows to 5 s and resets after a stable
  connection, and code 1008 logs out. No screen reads these queries until the bell and the list
  exist.
- Delivery against the 10-second budget (ADR-0003): 13 ms from a visit request to the frame
  arriving in the tab (not a rendered badge), measured locally in headless Chrome on 2026-10-06.
  After an outage, the next attempt comes at most 5 s after the server is back, so the refetch
  lands within the budget.
- The hub lives in process memory, so the backend runs one uvicorn worker (`backend/Dockerfile`,
  `docker-compose.yml`). With more workers, a push would reach only the sockets of its worker.
- Open: a half-open socket (after a sleep or a network switch) is not detected, because the client
  never sends. TanStack's refetch on window focus and on reconnect, left on in
  `createQueryClient`, refresh the data but not the socket.
- The chat screen ([ADR-0012](0012-chat-lists-connections-and-uses-message-notifications-as-unread.md))
  uses the same provider for `chat.message` events.

## Related

- [ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) — its "actor_id
  only, names joined by the client" constraint is replaced here
- [ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md) — its "one connection per
  user" becomes one connection per tab
- [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md) — notifications from a blocked
  pair are never listed or sent
