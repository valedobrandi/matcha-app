# ADR — Architecture Decision Records

<!-- keywords: ADR, architecture decision record, architectural decision, design decision,
     technical decision, rationale, trade-off, alternatives considered, superseded -->

Every architectural decision in this repository is recorded here. Read this index before
refactoring across module boundaries, replacing a dependency, or changing a public
contract — each row is a choice someone made deliberately, and the linked file says why.
If a change would overturn a decision, update its ADR (or supersede it) instead of
silently contradicting it.

Template: Tyree & Akerman, *Architecture Decisions: Demystifying Architecture*,
IEEE Software 22(2), 2005.

Status vocabulary: `Open` · `Pending` · `Decided` · `Approved` · `Superseded` · `Rejected`

`Open` means the decision is taken but its implementation is not merged yet. It becomes `Decided` when it is.

| ADR | Title | Status | Group | Date |
|-----|-------|--------|-------|------|
| [0001](0001-public-profile-is-a-projection-in-the-users-module.md) | Public profile is a projection in the users module | Decided | Backend | 2026-07-30 |
| [0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) | Chat and in-app notifications are separate modules fed by thin social emit hooks | Decided | Backend | 2026-07-30 |
| [0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md) | Realtime delivery uses a FastAPI WebSocket hub | Decided | Backend | 2026-07-30 |
| [0004](0004-user-not-found-codes-separate-caller-from-target.md) | "User not found" codes separate the caller account from a target | Decided | Backend | 2026-10-04 |
| [0005](0005-blocked-users-are-hidden-from-every-list.md) | Blocked users are hidden from the visitors, likes-received and notification lists | Decided | Backend | 2026-10-04 |
| [0006](0006-a-block-does-not-change-existing-likes.md) | A block does not change existing likes or connections | Decided | Backend | 2026-10-04 |
| [0007](0007-the-blocked-user-is-never-told.md) | The blocked user is never told about the block | Decided | Backend, Frontend | 2026-10-04 |
| [0008](0008-the-blocked-pairs-view-owns-the-block-rule.md) | The `blocked_pairs` view is the only definition of an active block | Decided | Backend | 2026-10-05 |
| [0009](0009-popularity-is-one-stored-score-shown-on-every-profile.md) | Popularity is one stored score, shown on every profile including your own | Decided | Backend, Frontend | 2026-10-05 |
| [0010](0010-an-unspecified-orientation-is-matched-as-bisexual.md) | An unspecified orientation is kept as unknown and matched as bisexual | Decided | Backend, Frontend | 2026-10-05 |
| [0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md) | One socket per tab feeds notifications into the query cache | Open | Backend, Frontend | 2026-10-05 |
| [0012](0012-chat-lists-connections-and-uses-message-notifications-as-unread.md) | Chat lists your connections and uses message notifications as its unread signal | Open | Backend, Frontend | 2026-10-05 |
| [0013](0013-visibility-sql-is-tested-on-a-real-postgres.md) | Visibility SQL is tested on a real Postgres | Decided | Backend | 2026-10-04 |
| [0014](0014-frontend-server-state-goes-through-tanstack-query.md) | Frontend server state goes through TanStack Query | Decided | Frontend | 2026-10-04 |
| [0015](0015-backend-models-are-the-only-source-of-the-api-contract.md) | Backend models are the only source of the API contract | Decided | Backend, Frontend | 2026-10-04 |
| [0016](0016-one-playwright-journey-checks-the-real-ui.md) | One Playwright journey checks the real UI | Decided | Frontend | 2026-10-04 |
