# Matcha

Dating app: FastAPI + PostgreSQL backend, React + Vite frontend.

## Run

```
cp .env.example .env     # then set JWT_SECRET (see the file) and the Mailtrap key
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8000 (OpenAPI at `/docs`)

Migrations run when the backend container starts.

## Seed demo profiles

With the stack running:

```
docker compose exec backend python -m database.seed --users 20
```

## Tests

```
cd backend && python -m pytest                  # unit and router tests
cd backend && python -m pytest -m integration   # SQL on a real Postgres (needs DATABASE_URL, migrated)
cd frontend && npm run test:run                 # vitest
cd frontend && npm run lint && npm run build
```

Architecture decisions are in [`ADR/`](ADR/README.md). The API contract is generated from the
backend: after changing a response model run `npm run gen:api` in `frontend/`.
