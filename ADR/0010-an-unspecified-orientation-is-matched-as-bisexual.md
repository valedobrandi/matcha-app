# ADR-0010: An unspecified orientation is kept as unknown and matched as bisexual

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-05 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Subject IV.3 says a user who has not specified an orientation must be treated as bisexual
([`docs/fr.subject.md`](../docs/fr.subject.md), line 144). Today a user cannot leave it
unspecified:

- the profile input requires it (`UserProfileInput.sexual_preference`,
  `backend/modules/users/schemas.py:32`), and so does the form (`frontend/src/schemas/users.ts:7`)
- the `profile_completeness` view requires it (migration 0012)
- discovery returns nothing for a viewer without one (`backend/modules/discovery/service.py:48`),
  and a candidate without one never matches (`backend/modules/discovery/repository.py:118`)

## Decision

- The orientation is optional. `NULL` means "not specified", and the form offers that answer.
- A generated column, `users.matching_preference = COALESCE(sexual_preference, 'bisexual')`, is
  the only place the default lives. Discovery reads it for the viewer and for the candidates.
  No query or Python check repeats the default.
- `profile_completeness` no longer requires an orientation. The gender stays required, because
  matching needs it.
- Profiles show the user's own answer, so "Not specified" stays visible as such.

## Status

Decided on 2026-10-05: migration 0014, discovery reading `matching_preference`, an optional
orientation in the API, and "Not specified" in both profile forms.

## Positions

### A — Store `bisexual` when the field is left empty
The simplest change, with no query to touch. The profile then states a choice the user never
made, and other users see it.

### B — Keep `NULL` and write the default wherever discovery reads the orientation
The default is then repeated in SQL and in the Python viewer check: the same drift that
[ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md) removed for blocks.

### C — Keep `NULL`, and let one generated column own the default (chosen)
The user's answer and the matching rule stay apart, and the rule has one owner.

## Argument

C follows the pattern of `profile_completeness` (migration 0012) and `blocked_pairs` (ADR-0008):
the database owns the rule once, and queries read it. Its cost is one migration.

## Implications

- A new migration adds the `STORED` generated column and recreates `profile_completeness`
  without the orientation; `EFFECTS` in `backend/database/migrate.py` gets its entry.
- `UserProfileInput.sexual_preference` and the frontend schema become optional; regenerate
  `frontend/src/types/api.d.ts`.
- `get_viewer_context` and `list_profiles` use `matching_preference`;
  `_viewer_orientation_usable` checks only the gender.
- Tests on real Postgres: a user with no orientation is matched as bisexual as a viewer and as a
  candidate, and a profile without an orientation counts as complete.

## Related

- [ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md) — one owner per rule
