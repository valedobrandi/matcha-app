# ADR-0021: The socket token travels in the first frame, never in the URL

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-07 |
| **Supersedes** | the `/ws?token=` part of [ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md) |
| **Superseded by** | — |

## Issue

The browser opened the socket at `/ws?token=<jwt>`, the scheme [ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md)
left open. A URL is written to access logs, proxy logs and browser history, so the access token,
valid for a day, could leak from any of them. The API logs mask it since #51, but logs outside the
API do not. The subject scores any security flaw 0 (`docs/fr.subject.md:271`). The browser
WebSocket API cannot set an `Authorization` header, and the app does not use cookies, so the token
needs another place.

## Decision

- **Handshake:** the client opens `/ws` with no credential and sends
  `{"type":"auth","payload":{"token":"<jwt>"}}` as its first frame.
- **Server** (`backend/modules/realtime/controller.py`):
  - accepts the connection and waits up to 5 s for that frame;
  - closes with `4408` when nothing arrives in time; the client reconnects;
  - closes with `1008` when the first frame is anything else, or its token is invalid, expired or
    has no `exp`; the client logs out, as before;
  - otherwise registers the socket in the hub and sends `{"type":"ready","payload":null}`;
  - closes with `1008` when the token's `exp` passes while the socket is open.
- **Client** (`RealtimeProvider`): sends the auth frame on open and starts pinging and
  refetching on `ready`, not on open. A socket is "connected" only once the hub holds it, so no
  event can be missed between the refetch and the registration. No ping is sent before `ready`.
- The hub only registers sockets; accepting them is the endpoint's job.

## Status

Decided on 2026-10-07 and implemented in #53: the owner chose the first-frame handshake after the
hand-in review flagged the token in the URL. A live login on the dev stack reached `ready` and
answered a ping with `pong`.

## Positions

### A — Token in the first frame (chosen)
No new endpoint and no stored state; the token never appears in a URL.

### B — One-time ticket in the URL
An HTTP call returns a short-lived ticket that the socket URL carries and the server burns on
use. The URL leaks only a used ticket, but it needs a new endpoint and a ticket store with
expiry, for no gain over A at this size.

### C — Session cookie
The browser sends it on connect by itself, but login uses a Bearer token, so this means
redesigning authentication and adding an Origin check against cross-site socket hijacking.

## Argument

A keeps the credential out of every URL with the smallest change: one frame on each side and a
`ready` reply that keeps "connected means registered" true. Closing at `exp` keeps a long-open
socket from outliving the token that opened it.
