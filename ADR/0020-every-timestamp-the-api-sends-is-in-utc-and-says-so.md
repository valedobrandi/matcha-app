# ADR-0020: Every timestamp the API sends is in UTC and says so

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-07 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Timestamps live in `TIMESTAMP` columns, which carry no time zone. They are written by `NOW()` on
connections forced to UTC (`backend/core/database.py`), so asyncpg returns naive values that are
UTC by construction. The response models sent them without an offset
(`"2026-10-07T09:30:00"`), although the OpenAPI document declares `format: date-time`, which is
RFC 3339 and requires one. A browser reads a value without an offset as local time, so every
screen that showed a date appended `Z` first. Five copies of that fix-up existed (the visitors,
likes and blocks lists, the notifications page and the chat), and a screen that forgot it would
show times shifted by the user's offset.

## Decision

- **Contract:** every timestamp the API sends is in UTC and ends with its offset,
  `"2026-10-07T09:30:00Z"`.
- **Where:** response models declare their timestamps as `UtcDatetime` (`backend/core/api_model.py`).
  It marks a naive value as UTC and converts a value with another offset to the same instant in
  UTC. It covers the HTTP responses and the socket events built from the same models
  (`notification`, `chat.message`).
- The OpenAPI document does not change (`string`, `date-time`), so the generated frontend types
  do not either ([ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md)).
- The frontend reads a timestamp with `new Date(value)` and nothing else; the five fix-ups are
  gone.
- The columns stay `TIMESTAMP`; the connection pool keeps them UTC.

## Status

Decided on 2026-10-07. Recorded at the owner's request, after the chat screens added the fifth
copy of the fix-up.

## Positions

### A — Mark timestamps as UTC where the response is built (chosen)
One type in the response models; the database and the SQL stay as they are.

### B — Change the columns to `TIMESTAMPTZ`
asyncpg would return values with an offset by itself, but the migration changes all 16 timestamp
columns, and the `connections` view, which reads `likes.updated_at`, has to be rebuilt in the
same migration.

### C — Keep the API and share one frontend helper
One copy instead of five, but every client still has to know a rule that the contract does not
state, and the API keeps breaking the `date-time` format it declares.

## Argument

The values are already UTC; only the label was missing. Adding it where the response is built
fixes every client at once and makes the documented format true.

## Implications

- `test_api_model_contract.py` checks every model reachable from a route's response: each
  timestamp field must send `…Z`, so a new field declared as a plain `datetime` fails the tests.
  It also checks that a value with another offset is sent as the same instant in UTC.
- Repository code that builds these models now gets UTC-aware values, and a naive value never
  equals an aware one, so tests compare with `tzinfo=timezone.utc` values
  (`test_social_connections_integration.py`).
- A time read from the database outside these models, such as the online check in
  `SocialService`, is still naive UTC and keeps its own handling.
- Frontend test fixtures carry `Z`, as the API does. The date-sensitive tests pass in time zones
  from UTC−12 to UTC+14.

## Related

- [ADR-0015](0015-backend-models-are-the-only-source-of-the-api-contract.md) — the backend models
  stay the only source of the contract
- [ADR-0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md) — the socket events whose
  payloads use the same models
