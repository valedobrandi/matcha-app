# ADR-0005: Blocked users are hidden from the visitors, likes-received and notification lists

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
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
- `likes_received_count` and `visitors_count` on `GET /users/me` and `GET /users/{id}`, which must
  match the owner's lists

The filter is a read-time condition in each repository query. Each query reads the
`blocked_pairs` view, the only definition of an active block in either direction
([ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md)).

## Status

Decided. The owner decided on 2026-10-04 and the implementation is merged.

## Positions

### A — Filter at read time (chosen)
Add the block condition to each list query. Unblocking brings the history back.

### B — Delete or mark rows when the block is created
Rejected: it is destructive, and unblocking cannot restore the history.

### C — Leave the lists as they are
Rejected: it breaks the subject's intent and the owner's rule "do not show a blocked user".

## Argument

Read-time filtering is reversible and changes no write path. One rule applies everywhere, and
no new event can be created between a blocked pair: like, unlike, visit and chat answer it as a
missing user ([ADR-0007](0007-the-blocked-user-is-never-told.md)).

## Implications

- The three lists, the unread count and the two profile counts get the block condition. Each
  gets an integration test on real Postgres, as the discovery queries have.
- The block condition lives in the `blocked_pairs` view
  ([ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md)).
- A count is the size of the owner's list, so the number on a profile never disagrees with the
  list it summarizes. It does not depend on who views the profile. A first draft kept the counts
  as totals: a total beside a filtered list showed the blocked user that someone was hidden.
- `fame_rating` is a stored score. A block does not change it.
- A new kind of event must refuse a blocked pair, as like, unlike and visit do.

## Related

- [ADR-0006](0006-a-block-does-not-change-existing-likes.md), [ADR-0007](0007-the-blocked-user-is-never-told.md), [ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md)
