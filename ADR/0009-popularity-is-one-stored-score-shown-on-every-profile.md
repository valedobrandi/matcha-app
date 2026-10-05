# ADR-0009: Popularity is one stored score, shown on every profile including your own

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend, Frontend |
| **Date** | 2026-10-05 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Subject IV.2 requires a public "note de popularité" for every user
([`docs/fr.subject.md`](../docs/fr.subject.md), line 136), and leaves its meaning to us as long as
the criteria are coherent (line 174). The score exists as `users.fame_rating`: discovery sorts
and filters by it, and the public profile shows it. No document defines it, and the user's own
profile page shows a hardcoded `10` instead of it
(`frontend/src/pages/profile/MyProfilePage.tsx:77`).

## Decision

Popularity is the stored integer `users.fame_rating`, from 0 to 100:

- +5 the first time a given user likes you (`FAME_LIKE_DELTA`, `backend/modules/social/service.py`)
- +1 the first time a given user visits your profile (`FAME_VISIT_DELTA`)
- it never goes down: an unlike, a repeated like or visit, and a block change nothing
  ([ADR-0005](0005-blocked-users-are-hidden-from-every-list.md))
- it stops at 100 (`UsersRepository.bump_fame`)

Every profile shows this one number, your own included. `GET /users/me` already returns
`fame_rating`, so the own profile page reads it from there.

## Status

Decided on 2026-10-05. The definition was already in the code, and the own profile page now
shows the score from `GET /users/me`.

## Positions

### A — A stored score that only grows (chosen)
Each distinct liker and visitor counts once. Sorting and filtering 500+ profiles reads one
column.

### B — Computed on read from current likes and visits
It follows unlikes, but every discovery sort and filter would aggregate likes and visits for
each candidate. A block would also lower the blocked user's public score, which ADR-0005 avoids.

### C — A rank relative to other users (percentile)
It spreads the top of the scale, but a user's score moves when other people act, with nothing
happening to them. That is hard to explain and to test.

## Argument

A is coherent and can be explained in one sentence: "5 points per person who liked you, 1 per
person who visited you, up to 100". It cannot be farmed by liking and unliking, and it is what
discovery already ranks on.

## Implications

- `MyProfilePage` shows `profile.fame_rating`; a page test checks the value comes from the API.
- The cap is reached after 20 distinct likers, or 100 distinct visitors.

## Related

- [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md) — a block does not change popularity
