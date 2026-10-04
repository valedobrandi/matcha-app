"""Runs the migration runner on real Postgres, each test in its own throwaway database.

Not part of the default run: ``pytest -m integration``. The fixture creates a database
with a unique random name and drops only that database afterwards.
"""
import uuid
from pathlib import Path
from urllib.parse import urlparse

import asyncpg
import pytest
import pytest_asyncio

from core.config import settings
from database.migrate import MIGRATIONS_DIR, MigrationError, migrate

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

ALL_VERSIONS = [f.stem for f in sorted(MIGRATIONS_DIR.glob("*.sql"))]


def _dsn_for(database: str) -> str:
    return urlparse(settings.DATABASE_URL)._replace(path=f"/{database}").geturl()


@pytest_asyncio.fixture
async def dsn():
    name = f"migrate_test_{uuid.uuid4().hex}"
    admin = await asyncpg.connect(settings.DATABASE_URL, timeout=3)
    await admin.execute(f'CREATE DATABASE "{name}"')
    try:
        yield _dsn_for(name)
    finally:
        await admin.execute(f'DROP DATABASE "{name}" WITH (FORCE)')
        await admin.close()


async def _apply_by_hand(dsn: str, versions: list[str]) -> None:
    conn = await asyncpg.connect(dsn)
    try:
        for version in versions:
            await conn.execute((MIGRATIONS_DIR / f"{version}.sql").read_text())
    finally:
        await conn.close()


async def _fetch(dsn: str, query: str):
    conn = await asyncpg.connect(dsn)
    try:
        return await conn.fetch(query)
    finally:
        await conn.close()


async def _recorded(dsn: str) -> list[str]:
    rows = await _fetch(dsn, "SELECT version FROM schema_migrations ORDER BY version")
    return [r["version"] for r in rows]


async def _tables(dsn: str) -> set[str]:
    rows = await _fetch(dsn, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    return {r["table_name"] for r in rows}


async def test_should_apply_all_migrations_when_database_is_empty(dsn):
    applied = await migrate(dsn)

    assert applied == ALL_VERSIONS
    assert await _recorded(dsn) == ALL_VERSIONS
    assert {"users", "chat_messages", "in_app_notifications"} <= await _tables(dsn)


async def test_should_record_all_without_rerunning_when_old_database_has_every_migration(dsn):
    await _apply_by_hand(dsn, ALL_VERSIONS)

    applied = await migrate(dsn)

    assert applied == []
    assert await _recorded(dsn) == ALL_VERSIONS


async def test_should_converge_to_latest_when_old_database_has_only_first_nine(dsn):
    await _apply_by_hand(dsn, ALL_VERSIONS[:9])

    applied = await migrate(dsn)

    assert applied == ALL_VERSIONS[9:]
    assert await _recorded(dsn) == ALL_VERSIONS
    assert {"in_app_notifications", "chat_messages"} <= await _tables(dsn)


async def test_should_apply_nothing_when_run_a_second_time(dsn):
    await migrate(dsn)

    assert await migrate(dsn) == []


async def test_should_roll_back_and_not_record_when_a_migration_fails(dsn, tmp_path: Path):
    (tmp_path / "0001_ok.sql").write_text("CREATE TABLE ok_table (id int);")
    (tmp_path / "0002_bad.sql").write_text("CREATE TABLE half_table (id int); SELECT 1/0;")
    (tmp_path / "0003_never.sql").write_text("CREATE TABLE never_table (id int);")

    with pytest.raises(MigrationError, match="0002_bad.sql"):
        await migrate(dsn, tmp_path)

    assert await _recorded(dsn) == ["0001_ok"]
    tables = await _tables(dsn)
    assert "ok_table" in tables
    assert "half_table" not in tables
    assert "never_table" not in tables


async def test_should_roll_back_file_effects_when_recording_the_version_fails(dsn, tmp_path: Path):
    (tmp_path / "0001_ok.sql").write_text("CREATE TABLE ok_table (id int);")
    (tmp_path / "0002_clash.sql").write_text(
        "CREATE TABLE half_table (id int);"
        "INSERT INTO schema_migrations (version) VALUES ('0002_clash');"
    )

    with pytest.raises(MigrationError, match="0002_clash.sql"):
        await migrate(dsn, tmp_path)

    assert await _recorded(dsn) == ["0001_ok"]
    assert "half_table" not in await _tables(dsn)
