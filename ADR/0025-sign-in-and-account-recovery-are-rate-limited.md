# ADR-0025: Sign-in, registration and account recovery are rate limited

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-09 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Nothing bounded how often a client could call the anonymous auth endpoints. A script could guess
passwords at full speed, create accounts in bulk, or make the API send verification and reset
emails to one address over and over, through the owner's Mailtrap account. The subject scores any
security flaw 0 (`docs/fr.subject.md:271`).

## Decision

- **Limiter** (`backend/core/rate_limit.py`): an in-process sliding window per key. A refused
  request answers `429 TOO_MANY_REQUESTS` with a `Retry-After` header. Stale keys are swept once the
  map grows, at amortized constant cost, so many distinct keys cannot exhaust memory.
- **Limits** (`backend/modules/auth/controller.py`):

  | Endpoint | Per client address | Per account or email |
  |----------|--------------------|----------------------|
  | `POST /auth/login` | 20 per minute | 10 failed attempts per 15 minutes per username and address |
  | `POST /auth/register` | 10 per 15 minutes | — |
  | `POST /auth/forgot-password`, `POST /auth/resend-verification` | 10 per 15 minutes, shared | 3 per 15 minutes per email, shared |
  | `POST /auth/reset-password` | the same shared 10 per 15 minutes | — |

- The per-client limit is a dependency resolved before the service, so a refused request never
  takes a database connection. Only failed logins count against an account, so signing in often
  never locks a user out.
- **Frontend:** the code has its own message, "Too many attempts. Please wait a few minutes and try
  again."

## Status

Decided on 2026-10-09 and implemented in the change that adds this record. Amended the same day
after review 194b81b: login failures are counted per username and address, not per username.

## Positions

### A — In-process limiter in the API (chosen)
No new service or dependency, and it matches the single-process deployment the hub already
assumes ([ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md)).

### B — A shared store such as Redis
Needed once the API runs as several processes, but today it would add a service to deploy and keep
running for no gain.

### C — A library such as slowapi
Does the same counting through decorators that need the raw request in every endpoint, and adds a
dependency to install in every environment (the dev container reloads on this tree).

## Argument

The limits stop guessing, bulk sign-ups and mail bombing while staying far above what one person
does. Login failures are counted per username and address together: a key shared by every address
would let anyone who knows a username, shown on every profile, lock its owner out with ten wrong
passwords every fifteen minutes. The cost is that a guessing attack spread over many addresses is
bounded per address only; the password rules (no dictionary words, mixed case and digits) keep it
impractical. Counting only failures keeps the key from locking out an owner who signs in often. If
the API is ever scaled to several processes, the limiter moves to a shared store behind the same
`check`/`hit` interface.
