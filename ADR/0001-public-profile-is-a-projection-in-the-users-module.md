# ADR-0001: Public profile is a projection in the users module

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-07-30 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The subject (IV.5) requires viewing another user's profile — everything except email and
password — with fame rating, online status, and last connection. Hong's public profile
page is blocked until a backend read-by-id exists. It must be decided now which module
owns that endpoint and what shape it returns, before bde implements it and Hong types
the frontend hook against it.

## Decision

`GET /users/{id}` lives in `backend/modules/users/` and returns a dedicated
`PublicProfile` projection: identity fields, gender/preference/age/bio, fame rating,
`location_label`, photos, tags, `last_connection`, `is_online` — never email, password,
or token/secret fields. Auth is required; blocks are enforced via the existing social
semantics (`BlockedException` → 403); a missing user is 404.

## Status

Decided — locked in the bde ticket and implemented against by both developers. Moves to
Approved if the team formally signs off.

## Group

Backend.

## Assumptions

- The subject forbids exposing email and password on profile consultation (fr.subject.md
  IV.5) and requires fame rating, online status, and last connection to be shown.
- Block semantics (`BlockedException`, the ~900s online window) already exist in the
  `social` module on `main` and can be reused rather than redefined.
- The self-profile payloads (`/auth/me`, `/me/*`) contain private fields and therefore
  cannot double as the public contract.

## Constraints

- Any future field added to `PublicProfile` must be safe for an arbitrary authenticated
  viewer; private fields are added to self-profile schemas only.
- Frontend code must not assume email exists on public views.
- The `social` module remains the owner of block/online rules; `users` calls into it and
  must not duplicate that logic.

## Positions

### A — Public read in the `social` module
Social already owns viewer-to-target semantics (blocks, relationship). The endpoint could
live there.

### B — Reuse the self-profile schema with fields stripped at the router
One schema, filtered per caller.

### C — Dedicated `PublicProfile` projection in `users` (chosen)
The profile data is owned by `users`; a separate schema makes the public surface explicit
and unstrippable by accident.

## Argument

C keeps data ownership where the data lives (`users` owns profile rows; `social` owns
relationships) and makes the no-email invariant structural: a field absent from the schema
cannot leak, whereas position B leaks the moment a filter is forgotten. Position A would
put a plain data read into a module whose job is interaction rules, coupling every future
profile-field change to `social`.

## Implications

- `users` gains a read path that consults `SocialRepository` for the block check — an
  accepted, one-directional dependency.
- Hong regenerates `frontend/src/types/api.d.ts` after this lands and types the public
  profile hook from it.
- Tests must assert the projection excludes email (a schema regression test, not just a
  happy-path test).

## Related decisions

- [ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) — the
  notification list stores `actor_id` only and relies on this endpoint for actor display.

## Related requirements

Subject IV.5 (profile consultation), III security constraints (no private-data leaks).

## Related artifacts

- `backend/modules/users/schemas.py` — `PublicProfile` (to be added; anchor the schema
  with `ADR-0001` when it lands)
- `backend/modules/users/` service + router — `GET /users/{user_id}`
- `docs/bde-public-profile-and-realtime-foundation.md` (Task 1)

## Related principles

Layer ownership: business data stays in its owning module; contracts are explicit schemas,
not filtered supersets.

## Notes

The 403-vs-404 question for blocked viewers was resolved in favour of 403 via the existing
`BlockedException`, for consistency with the social handlers. Superseded by
[ADR-0007](0007-the-blocked-user-is-never-told.md): a blocked pair now gets 404
`TARGET_USER_NOT_FOUND`, and `BlockedException` no longer exists.
