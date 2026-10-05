# ADR-0016: One Playwright journey checks the real UI

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Frontend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The frontend had hook and page tests, a green build and a live API check, but nobody had run the
UI in a browser. Those tests cannot see a page that is wired wrong or breaks in a real browser.
The project's testing policy (`AGENTS.md`, "E2E budget") allows about 10 Playwright specs for
critical journeys only, and only once the cheaper test layers exist.

## Decision

One Playwright spec, `frontend/e2e/discovery-like.spec.ts`, covers the critical journey: log in,
open the suggestions, open a profile and like it. The CI `e2e` job runs it against a migrated,
seeded database and the real backend and frontend. The UI was also audited once in a real
browser on 2026-10-04: no console error and no overflow on six pages, at 1280 and 375 pixels
wide.

A new spec must explain in its pull request why cheaper layers cannot cover it.

## Status

Decided and implemented in `6905942`. The options were first analysed with the Jev decision
engine on 2026-10-04, which also preferred B.

## Positions

### A — No browser check
It relies on hook tests and the build, which cannot see a broken page.

### B — One manual browser run now, then one spec (chosen)
It catches defects at once, then keeps the main journey covered in CI.

### C — One spec before anything else
Same coverage, but the merge waited on stabilizing the spec.

### D — The full suite of about 10 specs now
It costs the most, and flaky specs would get ignored.

## Argument

One journey through login, discovery, a profile and a like touches every layer at once: auth,
discovery SQL, the public profile and the like rule. More specs belong to features that the
cheaper layers cannot cover.

## Implications

- The chat and notification screens ([ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md),
  [ADR-0012](0012-chat-lists-connections-and-uses-message-notifications-as-unread.md)) are
  candidates for a second journey, because the 10-second delivery can only be seen end to end.
- The spec needs `E2E_USERNAME` set to a seeded user; CI picks the first one.

## Related

- [ADR-0013](0013-visibility-sql-is-tested-on-a-real-postgres.md) — the database layer below it
