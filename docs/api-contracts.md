# API contracts — auth session

## GET /auth/me

Requires: `Authorization: Bearer <access_token>`

Response fields:

- `id` — auth owns
- `username` — auth owns
- `email` — auth owns
- `first_name`, `last_name` — auth owns
- `email_verified` — auth owns
- `profile_completed` — read by auth; set by profiles module when ready
- `has_password` — auth owns (false for OAuth-only users)

Errors: `{ detail, code, field }` with codes `MISSING_TOKEN`, `INVALID_TOKEN`, `EXPIRED_TOKEN`

Token TTL: 1 day
