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

Status vocabulary: `Pending` · `Decided` · `Approved` · `Superseded` · `Rejected`

| ADR | Title | Status | Group | Date |
|-----|-------|--------|-------|------|
| [0001](0001-public-profile-is-a-projection-in-the-users-module.md) | Public profile is a projection in the users module | Decided | Backend | 2026-07-30 |
| [0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) | Chat and in-app notifications are separate modules fed by thin social emit hooks | Decided | Backend | 2026-07-30 |
| [0003](0003-realtime-delivery-uses-a-fastapi-websocket-hub.md) | Realtime delivery uses a FastAPI WebSocket hub | Decided | Backend | 2026-07-30 |
| [0004](0004-user-not-found-codes-separate-caller-from-target.md) | "User not found" codes separate the caller account from a target | Decided | Backend | 2026-10-04 |
