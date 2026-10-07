# ADR-0014: Frontend server state goes through TanStack Query

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Frontend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The frontend hooks fetched data inside `useEffect` and kept loading, error and data state by
hand. The `react-hooks/set-state-in-effect` lint rule flagged the pattern. `usePagination`
needed a hand-written guard against stale responses, and the visit tracker had hand-written
retries.

## Decision

Every server read goes through TanStack Query (`useQuery`, `useInfiniteQuery`), and every write
through `useMutation`, which then invalidates the queries it affects. One `QueryClient`
(`frontend/src/api/queryClient.ts`) never retries a 4xx error and retries other errors twice.

Effects remain only to start a one-shot action when a page opens (email verification, the 42
callback, recording a visit) or to fill a form once its data has loaded.

## Status

Decided and implemented in `35323e6` ("move server state to TanStack Query"). The options were
first analysed with the Jev decision engine on 2026-10-04, which preferred D by a 0.02 margin;
the team moved every hook at once. On 2026-10-07 the writes still made by hand in pages and
components (login, registration, the password and verification emails, the profile and account
tabs) moved onto `useMutation` as well.

## Positions

### A — Keep the effect pattern and record the debt
No change, but every new hook copies the pattern and the lint findings grow.

### B — Adopt TanStack Query in every data hook (chosen)
One pattern, and the library handles caching, stale responses and retries.

### C — Use it only for new hooks
Two patterns live side by side and confuse the next change.

### D — Try it on one hook first
It yields numbers before deciding, but leaves the code with two patterns until the follow-up
lands.

## Argument

The MSW tests intercept HTTP and never mock hooks, so they carried over unchanged and proved the
move kept behavior. Having two data patterns at once was the main risk of C and D.

## Implications

- A new data hook uses the query cache. Its tests use MSW with `renderWithAuth`, whose
  `QueryWrapper` turns retries off.
- A write that changes what other screens show invalidates their queries, as `useBlock` does.
- The realtime socket ([ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md))
  writes into the same cache.

## Related

- [ADR-0011](0011-one-socket-per-tab-feeds-notifications-into-the-query-cache.md)
