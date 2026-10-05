# ADR-0004: "User not found" codes separate the caller account from a target

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The frontend logs the user out when an API error has the code `USER_NOT_FOUND`, because
that code means the caller's own account is gone. `GET /users/{id}` also returned
`USER_NOT_FOUND` for a missing *target*. The public profile page was safe only because it
called the relationship endpoint first, which already returned a target code.

## Decision

`USER_NOT_FOUND` means one thing: the account of the caller does not exist. Every
"target does not exist" error uses a different code. `GET /users/{id}` now raises
`TargetUserNotFoundException` (`TARGET_USER_NOT_FOUND`, HTTP 404).

| Code | Raised by | Meaning | Frontend |
|------|-----------|---------|----------|
| `USER_NOT_FOUND` | users module (`/users/me`, account and profile edits), HTTP 401 | The caller's account is gone | Logs out (any 401 with a token) |
| `TARGET_USER_NOT_FOUND` | users module (`GET /users/{id}`), social module, HTTP 404 | The profile the caller asked for does not exist | Shows a message |
| `CHAT_USER_NOT_FOUND` | chat module | The chat recipient does not exist | No message mapped yet |
| `NOTIFICATION_NOT_FOUND` | notifications module | The notification does not exist | No message mapped yet |

A new module that reports a missing target adds a code to this table instead of reusing
`USER_NOT_FOUND`.

[ADR-0007](0007-the-blocked-user-is-never-told.md) adds one rule: a user who is blocked, in
either direction, gets the same `TARGET_USER_NOT_FOUND` (or `CHAT_USER_NOT_FOUND`) as for a
missing target. The `BLOCKED` and `CHAT_BLOCKED` codes were removed.

## Amendment (2026-10-04)

A session whose user no longer exists is an authentication failure, so `USER_NOT_FOUND` now
returns HTTP **401** instead of 404 (`UserNotFoundException` in `users/handlers.py`). The
frontend client logs out on any 401 that carried a token and no longer inspects the code.
A 404 never logs the user out.

## Status

Decided. Chosen with the Jev decision engine (run 2, decision 2): option b scored 0.97
against 0.47 for keeping the old code, with cross-check confidence 0.99.

## Group

Backend.

## Assumptions

- Only one client exists today: the frontend. Only `usePublicProfile.ts` reads the code
  from `GET /users/{id}`, and the i18n map already has a message for
  `TARGET_USER_NOT_FOUND`, so no frontend change is needed.
- The users handler maps HTTP status by exact exception type. Each new exception class
  needs its own entry in `_EXCEPTION_STATUS` or it returns 400.

## Constraints

- A missing target must never log a valid user out.
- No new error-handling layer in the frontend.

## Positions

### A — Keep the current codes
Safety depends on the order of two calls. Rejected: one reordered call logs users out.

### B — A separate code for a missing target (chosen)
One new exception class, one handler entry, one raise site. Safe by contract.

### C — Verify with `GET /users/me` before logging out
Touches many frontend call sites (22 references to `USER_NOT_FOUND`), adds a request, and
leaves one code with two meanings. Rejected.

## Argument

Option B moves the safety rule from call order into the contract, so it cannot break by
accident. The change is small: seven `UserNotFoundException` raise sites exist in the
users service, and only the target lookup in `get_public_profile` changes.

## Implications

- Any other client of `GET /users/{id}` must treat `USER_NOT_FOUND` as "my account".
- Reopen this ADR if a delete-account feature is added, if a third module needs a
  not-found code, or if the frontend gets one shared error-handling layer.

## Related

- [ADR-0001](0001-public-profile-is-a-projection-in-the-users-module.md) — the endpoint
  this decision changes.
