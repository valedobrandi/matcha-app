"""Fixtures shared by the integration tests (pytest -m integration, real Postgres).

Every test runs in a transaction that is rolled back: nothing is committed and no row is
deleted. The fixtures fail (they do not skip) when Postgres is unreachable, so a missing
database cannot hide a broken query.
"""
import os
import uuid

# Settings refuses to load without a JWT_SECRET; tests need a throwaway one before any import.
os.environ.setdefault("JWT_SECRET", "test-only-secret-not-for-use-0123456789")

import asyncpg
import pytest
import pytest_asyncio

from core.config import settings


@pytest_asyncio.fixture
async def connection():
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3)
    except (OSError, asyncpg.PostgresError) as error:
        pytest.fail(f"Integration tests need Postgres at DATABASE_URL: {error}", pytrace=False)
    transaction = conn.transaction()
    await transaction.start()
    yield conn
    await transaction.rollback()
    await conn.close()


@pytest.fixture
def token() -> str:
    return uuid.uuid4().hex[:10]


@pytest_asyncio.fixture
async def tag_id(connection, token) -> int:
    return await connection.fetchval(
        "INSERT INTO tags (name) VALUES ($1) RETURNING id", f"tag-{token}"
    )
