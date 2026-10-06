# Backend

## Migrations

`python -m database.migrate` (run from `backend/`) applies `database/migrations/*.sql`
in filename order and records each in `schema_migrations`. Each file runs in its own
transaction; a failing file rolls back and stops the run. A second run applies nothing.

`docker compose up` runs it before starting uvicorn, so existing volumes receive new
migrations on the next start; `down -v` is no longer needed. A database created by the
old docker init scripts (tables but no `schema_migrations`) is converged on first run:
migrations whose tables/columns already exist are recorded as applied, the rest are applied.

## Integration tests (real Postgres)

The default `pytest` run needs no database. Tests marked `integration` run the
discovery visibility SQL (suggest, search and name search) on Postgres:

```bash
docker compose up -d database
cd backend && python -m database.migrate && pytest -m integration
```

Each test runs in a transaction that is rolled back, so nothing is committed and no
row is deleted. The tests fail, they do not skip, when Postgres is unreachable. Run
them before you merge a change to the discovery SQL.

## Seed demo data

For discovery/search demos you need enough profiles (≥500 for subject eval).

1. Start a migrated Postgres (`docker compose up`, or run the migration runner — see above).
2. From `backend/`, download the synthetic face pool once (about 210 MB into `seed_assets/`, ignored by git):

```bash
python scripts/download_seed_faces.py
```

   The seed gives each user 2 photos from it (1,790 faces, so up to 895 users without repeats). Without the pool it uses the 55 faces committed in `database/seed_faces/` (resized JPEGs), so faces repeat across users and the seed prints a warning. CI relies on this and downloads nothing. The faces are the [StyleGAN3 Synthetic Face Image Dataset](https://zenodo.org/records/18177207), CC BY-NC 4.0 (non-commercial use only), minus the faces listed in `scripts/seed_faces_excluded.txt`. The committed faces are a resized JPEG subset of the same dataset, shared under the same licence.
3. From `backend/` with the venv active and `DATABASE_URL` set:

```bash
python -m database.seed --users 500
```

Default `--users` is already `500`. The first seeded user is `SEED_USERNAME`
and every seeded user's password is `SEED_PASSWORD`, both read from the
environment (`.env`); the script stops without them. Prefer a fresh
database; re-running against a populated DB may fail unique email/username
constraints.

## WebSocket smoke (≤10s latency)

With the API running and a valid JWT:

1. Connect: `ws://localhost:8000/ws?token=<jwt>` (token can appear in logs — eval only).
2. In another client, trigger a like/visit/message against that user.
3. Expect a JSON envelope within a few seconds:
   `{ "type": "notification" | "chat.message", "payload": { ... } }`.
