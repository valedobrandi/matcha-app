# ADR-0008: The `blocked_pairs` view is the only definition of an active block

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-05 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

[ADR-0005](0005-blocked-users-are-hidden-from-every-list.md) added the "active block in either
direction" condition to the visitors, likes-received and notification queries. With discovery and
`SocialRepository.is_blocked_either_way`, the same condition existed as four hand-copied SQL
fragments, read by seven queries and kept in line only by "twins" comments. ADR-0005 said to move
it into one SQL view or function once a fourth query needed it. The like and visitor counts now
need it too.

## Decision

Migration `0013_create_blocked_pairs_view` creates the `blocked_pairs` view. It has one row per
direction of each active block: `(user_id, other_user_id)`. Every query that hides blocked users
reads it with `NOT EXISTS (SELECT 1 FROM blocked_pairs bp WHERE bp.user_id = <viewer> AND
bp.other_user_id = <other user>)`. No query repeats the block condition.

Queries that need the direction (`blocked_by_me`, the blocked list, block and unblock) still read
`blocks`.

## Status

Decided on 2026-10-05, in the same pull request as ADR-0005 to ADR-0007.

## Positions

### A — A view (chosen)
Postgres expands a view inside the query, so it plans the condition like hand-written SQL. Each
half of the `UNION ALL` can use the partial indexes on active blocks.

### B — A SQL function `is_blocked_either_way(a, b)`
Rejected. Postgres does not inline a function whose body has a subquery, so it calls the function
once per candidate row.

### C — One SQL fragment in Python, formatted into each query
Rejected. The rule stays in application strings, and every query needs string formatting to use
it.

## Argument

The `profile_completeness` view (migration 0012) already owns the profile-completed rule the same
way. A change to what counts as an active block, such as an expiry date, now touches one view.

## Implications

- A new query that hides blocked users reads `blocked_pairs`, never `blocks`.
- `backend/tests/test_block_visibility_integration.py` and
  `backend/tests/test_discovery_visibility_integration.py` run the view on real Postgres.

## Related

- [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md), [ADR-0007](0007-the-blocked-user-is-never-told.md)
