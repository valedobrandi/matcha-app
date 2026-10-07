# Matcha

Dating app: FastAPI + PostgreSQL backend, React + Vite frontend.

## Run

```
cp .env.example .env     # then set JWT_SECRET (see the file), the Mailtrap key and the seed login
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000 (OpenAPI at `/docs`)
- Database shell: `docker compose exec database psql -U postgres -d matcha` (it asks for `POSTGRES_PASSWORD` from `.env`)

Migrations run when the backend container starts. The backend refuses to start without
`JWT_SECRET` or `MAILTRAP_API_KEY`, and its error names the missing one
([ADR-0019](ADR/0019-the-backend-refuses-to-start-without-a-required-setting.md)).

## Seed demo profiles

For 1,790 distinct faces, download the synthetic face pool once (about 210 MB, kept out of git in `backend/seed_assets/`); without it the seed reuses the 55 faces committed in `backend/database/seed_faces/`, so faces repeat across users and CI needs no download. Then seed with the stack running, on a fresh database (the evaluation needs at least 500 profiles):

```
python3 backend/scripts/download_seed_faces.py
docker compose exec backend python -m database.seed --users 500
```

Every seeded user gets 2 photos, the first as the profile photo, and the pool holds enough faces for up to 895 users. The faces are the [StyleGAN3 Synthetic Face Image Dataset](https://zenodo.org/records/18177207) (CC BY-NC 4.0, non-commercial use only), minus the faces listed in `backend/scripts/seed_faces_excluded.txt`, which look like minors. The committed faces are a resized JPEG subset of the same dataset, shared under the same licence.

Log in as `SEED_USERNAME` with `SEED_PASSWORD`, both from `.env`; every seeded account shares that
password.

## Tests

```
cd backend && python -m pytest                  # unit and router tests
cd backend && python -m pytest -m integration   # SQL on a real Postgres (needs DATABASE_URL, migrated)
cd frontend && npm run test:run                 # vitest
cd frontend && npm run lint && npm run build
```

Architecture decisions are in [`ADR/`](ADR/README.md). The API contract is generated from the
backend: after changing a response model run `npm run gen:api` in `frontend/`.
