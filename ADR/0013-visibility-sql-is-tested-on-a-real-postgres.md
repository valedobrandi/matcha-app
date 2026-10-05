# ADR-0013: Visibility SQL is tested on a real Postgres

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-04 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

Discovery decides who a viewer may see with one shared SQL fragment, `_VISIBLE_TO_VIEWER_SQL`:
not the viewer, a completed profile, no active block. A mistake there leaks profiles, so it is
privacy-critical. No test ran that SQL: `backend/tests/test_discovery_repository.py` is an
in-memory copy of the rules, and its own docstring says it is not a Postgres runner.

## Decision

Tests marked `integration` run the repository SQL on a real, migrated Postgres:

- `pytest -m integration` runs them against `DATABASE_URL`; `backend/pytest.ini` keeps them out
  of the default run.
- Each test runs in a transaction that is rolled back (`backend/tests/conftest.py`).
- The fixtures fail, they do not skip, when Postgres is unreachable, so a missing database
  cannot hide a broken query.
- CI runs them in the `backend-integration` job, with a Postgres service.

The in-memory copy stays as a fast unit test of the same rules.

## Status

Decided and implemented. The options were first analysed with the Jev decision engine on
2026-10-04, which also preferred B.

## Positions

### A — Keep the in-memory copy only
No setup, but it can drift from the SQL without any test noticing.

### B — Integration tests on a real Postgres (chosen)
Only running the SQL proves it.

### C — Move the rule into a database view
It gives the rule one owner, but a view still needs a test that runs it. The project later did
this for parts of the rule: `profile_completeness` (migration 0012) and `blocked_pairs`
([ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md)), both covered by these tests.

## Argument

The main risk with B was tests that need a database and get skipped until they rot. Failing
instead of skipping, and running in CI, removes that risk.

## Implications

- Every query that hides users gets an integration test, as ADR-0005 did with
  `test_block_visibility_integration.py`.
- Integration tests today: `test_discovery_visibility_integration.py`,
  `test_profile_completeness_integration.py`, `test_block_visibility_integration.py` and
  `test_migrate_integration.py`.

## Related

- [ADR-0005](0005-blocked-users-are-hidden-from-every-list.md), [ADR-0008](0008-the-blocked-pairs-view-owns-the-block-rule.md)
