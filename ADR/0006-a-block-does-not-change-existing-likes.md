# ADR-0006: A block does not change existing likes or connections

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Subject IV.5 ([`docs/fr.subject.md`](../docs/fr.subject.md), lines 190 and 198) says that
removing a like stops notifications and disables chat, and that a block stops notifications and
chat. It does not say whether a block removes an existing like or connection.

## Decision

A block never changes a like row. It is a separate rule that every feature checks: search,
lists, profile, likes, visits, chat and notifications. Unblocking restores the previous state,
including a connection.

## Status

Decided. The owner decided on 2026-10-04 and the implementation is merged.

## Positions

### A — Keep the likes (chosen)
The block and the like stay independent facts.

### B — Deactivate the likes when a block is created
Rejected. It would send an `unliked` notification to the blocked user and reveal the block
([ADR-0007](0007-the-blocked-user-is-never-told.md)). A silent special case adds complexity. The
connection would be lost for good.

## Argument

Each fact has one owner, and a block is reversible. Blocking has no notification side effect.

## Implications

- `connected` can be true while a block is active. Every consumer checks the block first. Chat
  already does.
- A future list of connected users, needed by the chat screen, must leave out blocked pairs.
- Tests: chat refuses a blocked pair, the connected list omits it, and unblocking restores both.

## Related

- [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md), [ADR-0007](0007-the-blocked-user-is-never-told.md)
