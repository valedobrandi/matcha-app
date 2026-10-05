# ADR-0012: Chat lists your connections and uses message notifications as its unread signal

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Open |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-05 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Subject IV.6 requires connected users (mutual likes) to chat in real time, within 10 seconds, and
every page to show when a new message arrives ([`docs/fr.subject.md`](../docs/fr.subject.md),
lines 202-206). The backend sends and lists messages between two connected users
(`POST` and `GET /chat/messages/{peer_id}`), creates a `message` notification and pushes a
`chat.message` event to the recipient (`backend/modules/chat/service.py`). A chat screen still
lacks three things:

- No endpoint lists the people a user can chat with.
  [ADR-0006](0006-a-block-does-not-change-existing-likes.md) requires that list to leave out
  blocked pairs.
- History is paged oldest first, with an offset (`ORDER BY created_at ASC`,
  `backend/modules/chat/repository.py:35`). The first page shows the start of a conversation,
  not its latest messages, and each new message shifts the offsets.
- Nothing marks a message as read, and the sender's other tabs never see a sent message.

## Decision

- **Connections:** `GET /social/connections` lists connected users with no active block, with
  their display names, newest connection first. Social owns "connected"
  ([ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md)), and the block
  rule comes from `blocked_pairs` ([ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md)).
- **History:** `GET /chat/messages/{peer_id}?before={message_id}&limit=50` returns the latest
  messages older than `before` (or the latest ones without it), newest first. The screen shows
  them in time order and loads older pages on scroll.
- **Unread:** the `message` notifications are the unread signal; messages get no read state of
  their own. Opening a conversation calls `POST /chat/conversations/{peer_id}/read`, which marks
  that peer's unread `message` notifications read through the notifications service. Chat
  already makes the same kind of call to create them. `GET /notifications/unread-count` also
  returns `unread_messages`, so the header can mark the chat link.
- **Live:** each message is pushed as `chat.message` to both users, so every open tab of either
  user shows it ([ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md)).
  The open conversation adds it through the query cache.
- **Screens:** `/chat` lists the connections, and `/chat/:peerId` shows the conversation with a
  message box. A "Chat" item in the sidebar shows a dot when `unread_messages` is above zero.

## Status

Open. Recorded on 2026-10-05 at the owner's request. The implementation is not merged yet. The
status becomes `Decided` when it is.

## Positions

### A — Message notifications are the unread signal (chosen)
One unread state, already written for every message, shared by the bell and the chat link.

### B — A read marker per conversation in chat
It allows an unread count per conversation, but it is a second unread state that must always
agree with the bell's message notifications.

### C — No read handling
Message notifications would stay unread after the user has read the conversation.

For history, offset paging from the oldest message was rejected for the reasons in the issue. A
`before` cursor keeps pages stable while new messages arrive.

## Argument

The subject asks for a chat between connected users and a new-message signal on every page, not
for read receipts or per-conversation counters. A reuses what already exists: the notification
written on every message, and the socket from ADR-0011. The connection list stays in social,
where "connected" is already computed.

## Implications

- `SocialRepository` lists connections from mutual active likes minus `blocked_pairs`, with an
  integration test on Postgres: a blocked pair is left out, and unblocking brings it back
  (ADR-0006).
- `ChatRepository.list_messages` pages with `before`, newest first; router and service tests
  follow, and `frontend/src/types/api.d.ts` is regenerated.
- The notifications module gains "mark read by actor and type" and `unread_messages` in
  `UnreadCountOut`.
- `ChatService` pushes `chat.message` to the sender as well as the recipient.
- Frontend tests use MSW for HTTP and the socket: sending, receiving a live message, and
  opening a conversation that marks its message notifications read.
- Measure delivery against the 10-second budget in the pull request.

## Related

- [ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md), [ADR-0006](0006-a-block-does-not-change-existing-likes.md), [ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md), [ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md)
