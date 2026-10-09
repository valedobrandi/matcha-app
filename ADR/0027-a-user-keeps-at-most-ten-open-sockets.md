# ADR-0027: A user keeps at most ten open sockets

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-09 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The hub keeps every socket a user opens, one per tab
([ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md)), with no upper
bound. With one valid token, a script could open thousands of sockets and keep them alive with
pings, holding memory and file descriptors in the single API process and multiplying the work of
every push to that user.

## Decision

- The hub accepts at most `MAX_SOCKETS_PER_USER = 10` open sockets per user
  (`backend/core/ws_hub.py`). `connect` refuses the eleventh before any database work.
- The endpoint closes a refused socket with `1013` ("Try Again Later").
- The client needs no change: it treats every close code except `1008` as transient and reconnects
  with its backoff (at most 5 s), so a tab over the cap gets its socket as soon as another tab
  closes. Only `1008` (session invalid or ended) logs it out.

## Status

Decided on 2026-10-09 and implemented in the change that adds this record.

## Positions

### A — Refuse the newest socket over the cap (chosen)
Bounded per user, no client change, and the extra tab recovers by itself when a slot frees.

### B — Close the oldest socket to admit the newest
Favours the tab just opened, but two tabs over the cap would keep evicting each other on every
reconnect, unless the client learns a "do not reconnect" code and a rule for when to come back.

### C — No cap, rely on the rate limits
[ADR-0025](0025-sign-in-and-account-recovery-are-rate-limited.md) limits sign-in, not the sockets
a valid token can open.

## Argument

Ten tabs is far above normal use and small enough that one account cannot exhaust the process. The
standard `1013` code fits "come back later", and the existing reconnect loop already does the
right thing with it.
