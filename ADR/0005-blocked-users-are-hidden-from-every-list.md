# ADR-0005: Blocked users are hidden from the visitors, likes-received and notification lists

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Open |
| **Group** | Backend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Subject IV.5 ([`docs/fr.subject.md`](../docs/fr.subject.md), line 198) says a blocked user
"n'apparaîtra plus dans les résultats de recherche et ne générera plus de notifications".
Search, suggestions, the public profile and chat already follow this rule. The visitors list,
the likes-received list and the notification list still show people from before the block.

## Decision

Every list that shows other users hides each user who has an active block with the viewer, in
both directions. This covers:

- `GET /social/visitors`
- `GET /social/likes/received`
- `GET /notifications`, and `GET /notifications/unread-count`, which must match the list

The filter is a read-time condition in each repository query. It uses the same rule as the block
clause in `_VISIBLE_TO_VIEWER_SQL` (active block, either direction).

## Status

Open. The owner decided on 2026-10-04. The implementation is not merged yet. The status becomes
`Decided` when it is.

## Positions

### A — Filter at read time (chosen)
Add the block condition to each list query. Unblocking brings the history back.

### B — Delete or mark rows when the block is created
Rejected: it is destructive, and unblocking cannot restore the history.

### C — Leave the lists as they are
Rejected: it breaks the subject's intent and the owner's rule "do not show a blocked user".

## Argument

Read-time filtering is reversible and changes no write path. One rule applies everywhere, and
new events were already refused by the like and visit rules.

## Implications

- Three queries and the unread count get the block condition. Each gets an integration test on
  real Postgres, as the discovery queries have.
- The block condition now appears in more places. If a fourth query needs it, move it into one
  SQL view or function and record that in a new ADR.
- `likes_received_count` and `visitors_count` on a profile stay totals. They are not
  personalized. Popularity is unchanged.

## Related

- [ADR-0006](0006-a-block-does-not-change-existing-likes.md), [ADR-0007](0007-the-blocked-user-is-never-told.md)
