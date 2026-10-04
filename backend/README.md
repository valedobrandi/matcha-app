# Backend

## Migrations (docker)

SQL under `database/migrations/` is mounted into Postgres
`docker-entrypoint-initdb.d/` via `docker-compose.yml`. Those scripts run **only
on first volume init**.

If you pull new migrations (e.g. `0010` in-app notifications, `0011` chat) onto
an existing local volume, recreate it before expecting the new tables:

```bash
docker compose down -v
docker compose up -d
```

(`-v` deletes the named postgres volume — local data only.)

## Integration tests (real Postgres)

The default `pytest` run needs no database. Tests marked `integration` run the
discovery visibility SQL (suggest, search and name search) on Postgres:

```bash
docker compose up -d database
cd backend && pytest -m integration
```

Each test runs in a transaction that is rolled back, so nothing is committed and no
row is deleted. The tests fail, they do not skip, when Postgres is unreachable. Run
them before you merge a change to the discovery SQL.

## Seed demo data

For discovery/search demos you need enough profiles (≥500 for subject eval).

1. Start a migrated Postgres (fresh volume so all migrations apply — see above).
2. From `backend/` with the venv active and `DATABASE_URL` set:

```bash
python -m database.seed --users 500
```

Default `--users` is already `500`. Every seeded user shares password
`Password123!` (printed again when the script finishes). Prefer a fresh
database; re-running against a populated DB may fail unique email/username
constraints.

## WebSocket smoke (≤10s latency)

With the API running and a valid JWT:

1. Connect: `ws://localhost:8000/ws?token=<jwt>` (token can appear in logs — eval only).
2. In another client, trigger a like/visit/message against that user.
3. Expect a JSON envelope within a few seconds:
   `{ "type": "notification" | "chat.message", "payload": { ... } }`.
