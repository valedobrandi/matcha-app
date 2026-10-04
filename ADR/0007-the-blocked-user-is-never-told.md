# ADR-0007: The blocked user is never told about the block

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Open |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Today the blocked user can see the block. The public profile of a blocked pair returns 403
`BLOCKED`. The relationship endpoint returns `blocked_you`. The page shows "Blocked you". Chat
returns `CHAT_BLOCKED`. The subject ([`docs/fr.subject.md`](../docs/fr.subject.md), line 198)
does not say what the blocked user may learn.

## Decision

The blocked user sees only "profile unavailable". The API answers the blocked user exactly as it
answers for a user that does not exist:

- every endpoint that returns `BLOCKED` today returns 404 `TARGET_USER_NOT_FOUND`
- chat returns `CHAT_USER_NOT_FOUND` instead of `CHAT_BLOCKED`
- the relationship response no longer has a `blocked_you` field

The blocker keeps full knowledge: `blocked_by_me`, the blocked list and the unblock action are
unchanged.

## Status

Open. The owner decided on 2026-10-04. The implementation is not merged yet. The status becomes
`Decided` when it is.

## Positions

### A — Reveal the block (today)
Rejected. A visible block invites retaliation.

### B — Neutral "unavailable" (chosen)
The blocked user cannot tell a block from a missing profile.

### C — Fake success for the blocked user
Rejected. It is deceptive, stores data that goes nowhere and is hard to test.

## Argument

The subject asks blocking to end contact, not to announce it. Option B changes responses, and it
changes one field of the contract.

## Implications

- Remove `blocked_you` from `RelationshipResponse`, regenerate `api.d.ts` and drop the
  "Blocked you" text from the profile page.
- `BLOCKED` and `CHAT_BLOCKED` no longer reach the blocked user. Update the error-code registry
  test and ADR-0004 when the code lands.
- The two cases need a test each: the blocked user and a missing user get identical responses,
  and the blocker still sees `blocked_by_me`.

## Related

- [ADR-0004](0004-user-not-found-codes-separate-caller-from-target.md), [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md), [ADR-0006](0006-a-block-does-not-change-existing-likes.md)
