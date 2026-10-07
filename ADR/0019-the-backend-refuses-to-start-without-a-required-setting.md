# ADR-0019: The backend refuses to start without a setting it cannot work without

<!-- keywords: ADR, architecture decision record, architectural decision, design decision, technical decision, rationale, trade-off, alternatives considered, superseded -->

| Field | Value |
|-------|-------|
| **Status** | Decided |
| **Group** | Backend |
| **Date** | 2026-10-07 |
| **Supersedes** | — |
| **Superseded by** | — |

## Issue

The subject requires an email with a unique link after registration and a password reset by
email ([`docs/fr.subject.md`](../docs/fr.subject.md), lines 112 and 114), and no error, warning
or notice on the server console (line 267). Those emails leave through the email outbox worker
and Mailtrap. `MAILTRAP_API_KEY` defaulted to an empty string, so a backend started without it
ran as if nothing was wrong, while the worker failed every 5 seconds, even with nothing to send
("email outbox worker batch failed", with a traceback), and no verification email could ever be
sent. `JWT_SECRET`, by contrast, has no default: the backend does not start without it. The
README already lists the Mailtrap key among the settings to fill in.

## Decision

- **Rule:** a setting the app cannot work without has no default. `Settings` refuses to load
  without it, so the backend stops at startup with an error that names the setting.
  `JWT_SECRET` already worked this way; `MAILTRAP_API_KEY` now does too, and a blank value is
  refused like a missing one.
- **No leak:** the error never repeats the values it read (`hide_input_in_errors`), so no secret
  reaches the console.
- **Tests and CI:** the test setup and the OpenAPI export set a random throwaway key, as they do
  for `JWT_SECRET`, and CI generates one per run. No key is written in the repository.
- `build_mailtrap_client` no longer checks for an empty key, because none can reach it.

## Status

Decided on 2026-10-07. Recorded at the owner's request, after the chat work found the worker's
error loop.

## Positions

### A — Refuse to start without the key (chosen)
The missing setting is named before anyone tries to register, and the rule is the one
`JWT_SECRET` already follows.

### B — Run without mail and keep the worker quiet
Building the client only when mail is queued, or logging once, keeps the console clean, but the
app runs with registration broken: verification emails wait in the outbox, and the failure shows
only when someone registers.

### C — Keep the empty default
Every install without the key logs a traceback every 5 seconds.

## Argument

Email verification is part of the mandatory subject, so an install without a mail key is not a
working install. Stopping at startup turns a silent, delayed failure into one clear message at the
moment the setting is missing.

## Implications

- A local `.env` must hold `MAILTRAP_API_KEY`, as the README already says. Until it does,
  `docker compose up` stops the backend container with the error.
- `test_config.py` checks that a missing or blank key stops the settings with an error that names
  it, and that the key never appears in the error about another setting.
- A key that is set but wrong is still found only when Mailtrap refuses a send; the worker logs
  that delivery failure and retries, as before.
- A new setting the app cannot work without follows the same rule: no default, a test, and a
  throwaway value in the test setup and in CI.

## Related

- [ADR-0002](0002-chat-and-in-app-notifications-are-separate-modules-fed.md) — the email outbox,
  in the notifications module, that sends with this key
