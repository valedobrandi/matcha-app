# ADR-0024: Every access token is a handle on a server-side session

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-09 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

An access token was a JWT the server never stored, valid for a day. Logout only dropped it from the
browser, and neither a password change nor a reset ended the tokens already handed out. A token
copied from a shared computer, or held by someone who learned the old password, kept working
until it expired, and its socket kept receiving the user's notifications and messages. The subject
scores any security flaw 0 (`docs/fr.subject.md:271`).

## Decision

- **Session store** (migration 0018): `auth_sessions` holds one row per issued token (id, user,
  expiry) and `auth_session_revocations` one row per ended session. Both are append-only: a
  session ends by recording its revocation, nothing is updated or deleted.
- **Issuing:** login, 42 login, email verification and password reset open a session, and the JWT
  carries its id as `sid`.
- **Checking:** HTTP auth decodes the token, then checks that its session is open, not revoked and
  not expired; otherwise `401 INVALID_TOKEN`, which the frontend already treats as a logout. The
  socket runs the same check after it registers, so a revocation landing during the handshake
  still closes it.
- **Ending:**
  - `POST /auth/logout` ends the caller's session;
  - a password change ends every other session of the user and keeps the current one;
  - a password reset ends every session and opens a new one for the reset response.
  The ended sessions' sockets close with `1008`, so those tabs log out at once.
- **Frontend:** `signOut` (the Logout button) forgets the token, then tells the server. `logout`
  stays local only: it runs when the server has already ended the session (a 401, a socket closed
  with `1008`), where calling the server again would only add a failed request to the console.

## Status

Decided on 2026-10-09 and implemented in d3a039a (sessions behind every token) and the change that
adds this record (logout, password change and reset). Tokens issued before d3a039a carry no
session and are refused once, so every user logs in again after the deploy.

## Positions

### A — Server-side sessions named by the token (chosen)
Each token can be ended alone (logout) or with the user's other tokens (password change), and the
hub can close exactly the sockets of the ended sessions. One indexed lookup per request.

### B — A per-user token version
The JWT carries a version the server bumps on logout and on a password change. Simpler, but a
logout signs the user out of every device, and a password change also kills the tab that made it
unless the response carries a new token.

### C — Short-lived access tokens with refresh tokens
Limits how long a stolen token works but does not end it on logout, and needs a refresh flow in
every client, for more moving parts than A.

## Argument

A gives each event the scope it should have: logout ends one session, a credential change ends the
others, a reset ends all. Recording revocations instead of updating rows keeps an audit trail and
never destroys data, and checking after the socket registers leaves no window for an ended session
to keep receiving events.
