# ADR-0015: Backend models are the only source of the API contract

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Some frontend types were generated from OpenAPI and others were written by hand, such as
`frontend/src/types/auth.ts`. Two backend classes named `OkResponse` produced awkward generated
names. `npm run gen:api` read a running backend on port 8000, which another process held on the
development machine. Response fields with defaults came out optional in the generated types,
although the server always sends them. Nothing checked that the generated file was up to date.

## Decision

- The pydantic response models are the only source of truth for request and response shapes.
- `backend/scripts/export_openapi.py` writes the OpenAPI document from the app object, so no
  server or port is needed. `npm run gen:api` turns it into `frontend/src/types/api.d.ts`.
- Frontend type files only alias generated types.
- Response models inherit `ApiModel` (`backend/core/api_model.py`), so fields with defaults are
  required in the schema.
- Class names are unique, for example `SocialOkResponse` and `NotificationOkResponse`.
- The CI `contract` job regenerates the file and fails when it differs from the committed one.

## Status

Decided and implemented in `30a3309` and the `contract` CI job. The options were first analysed
with the Jev decision engine on 2026-10-04, which preferred B by a 0.03 margin; the team chose C.

## Positions

### A — Leave as is
Hand-written types drift from the backend without anyone noticing.

### B — Alias the types, rename the classes, export without a server
It fixes today's drift but nothing stops the next one.

### C — B, plus a CI drift check and one base class for responses (chosen)
A forgotten regeneration fails the build.

## Argument

Two hand-maintained copies of a shape drift silently. Only the CI check catches a pull request
that changes a model and forgets to regenerate the types.

## Implications

- Changing a response model means changing the pydantic model, running `npm run gen:api` and
  adapting callers. Never edit `api.d.ts` by hand.
- zod in the frontend validates user input only, never server responses.
- `AGENTS.md`, section "Contract: Single Source of Truth", states the same rules for day-to-day
  work.

## Related

- [ADR-0004](0004-user-not-found-codes-separate-caller-from-target.md) — error codes are part of
  the generated contract
