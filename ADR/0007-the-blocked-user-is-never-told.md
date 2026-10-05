# ADR-0007: The blocked user is never told about the block

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
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
- unlike (`DELETE /social/likes/{id}`) answers the same 404, for a missing user and for a blocked
  pair, so it cannot create an `unliked` notification across a block
- chat returns `CHAT_USER_NOT_FOUND` instead of `CHAT_BLOCKED`
- the relationship response no longer has a `blocked_you` field

Report and block are the exception. They stay available to the blocked user and answer as for
any existing user, because a blocked user must still be able to report the blocker or block them
back.

The blocker keeps full knowledge: `blocked_by_me`, the blocked list and the unblock action are
unchanged. The profile is hidden from both sides, so the blocker's profile page shows "You
blocked this user" with an Unblock button.

## Status

Decided. The owner decided on 2026-10-04 and the implementation is merged.

## Positions

### A — Reveal the block (today)
Rejected. A visible block invites retaliation.

### B — Neutral "unavailable" (chosen)
No response, field, message or notification tells the blocked user about the block. This does not
make a block impossible to guess: there is no account deletion, so a profile that disappears can
only mean a block, and report and block still answer for the blocker. The promise is that the app
never tells, not that the block cannot be inferred.

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
- The profile page must never show data cached before a block: a refetch that answers 404 drops
  the cached relationship and profile.

## Related

- [ADR-0004](0004-user-not-found-codes-separate-caller-from-target.md), [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md), [ADR-0006](0006-a-block-does-not-change-existing-likes.md)
