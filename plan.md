# Plan

## Goal

Fix all Thermos P0/P1 findings in the matcha auth stack: restore backend boot, repair register/login/password-reset/OAuth flows, align frontend with backend endpoints, and harden docker env wiring.

## Premises

1. Layering stays controller → service → repository; outbox enqueue remains in repository transactions for now (no refactor to service orchestration in this pass).
2. OAuth callback stays `POST /auth/callback/42?code=`; frontend bridge page exchanges the redirect code with sessionStorage-bound `state` CSRF protection.
3. Constraint names follow Postgres default naming for UNIQUE on `users.email` and `users.username` (`users_email_key`, `users_username_key`).
4. Email outbox worker continues in-process for dev; stale recovery uses 10-minute threshold.
5. Tests are minimal smoke tests for auth service hashing/JWT only.

## Chunks

| # | Name | Files / scope | Status |
|---|------|---------------|--------|
| 1 | Email pipeline fixes | `backend/workers/outbox_handlers.py`, `backend/integrations/mailtrap_client.py` | done |
| 2 | Auth repository + service | `backend/modules/auth/repository.py`, `backend/modules/auth/service.py` | done |
| 3 | Auth controller copy | `backend/modules/auth/controller.py` | done |
| 4 | Frontend API layer | `frontend/src/api/client.ts`, `frontend/src/api/auth.ts`, `frontend/src/schemas/auth.ts` | done |
| 5 | Frontend auth pages | `frontend/src/pages/auth/*`, `frontend/src/auth/oauthState.ts` | done |
| 6 | Frontend routes | `frontend/src/app/routes.tsx` | done |
| 7 | Docker env | `docker-compose.yml` | done |
| 8 | Auth service tests | `backend/requirements.txt`, `backend/tests/test_auth_service.py` | done |

## Completed chunks

- Chunk 1: Fixed Callable typing, password-reset Mailtrap wiring, email subject copy.
- Chunk 2: Fixed USER_COLUMNS SQL, exc.constraint_name, plain.encode password hashing.
- Chunk 3: Enumeration-safe forgot-password response message.
- Chunk 4: ApiError detail fallback, resendVerification + fortytwoCallback API, resend schema.
- Chunk 5: OAuth/resend/verify pages, StrictMode guards, OAuth state CSRF protection.
- Chunk 6: Registered /auth/callback/42 and /auth/resend-verification routes.
- Chunk 7: DATABASE_URL env interpolation, VITE_API_URL + VITE_FT_* for frontend.
- Chunk 8: pytest deps + auth service smoke tests.
