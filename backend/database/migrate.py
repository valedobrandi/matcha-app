"""Applies backend/database/migrations/*.sql in filename order.

Usage (from ``backend/``):
    python -m database.migrate

Each file runs in its own transaction together with its ``schema_migrations`` row.
A failing file rolls back and stops the run. Nothing is ever dropped or deleted.

Databases created by the old docker init scripts have the tables but no
``schema_migrations``. On the first run against such a database, each migration whose
effects are already present (read-only ``information_schema`` probe) is recorded as
applied without running it; the rest are applied normally.
"""
import asyncio
import sys
from pathlib import Path

import asyncpg

from core.config import settings

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

# Effect of each migration: ("table", name), ("view", name) or ("column", "table.column").
EFFECTS: dict[str, tuple[str, str]] = {
    "0001_create_users": ("table", "users"),
    "0002_create_email_outbox": ("table", "email_outbox"),
    "0003_add_password_reset": ("column", "users.password_reset_token"),
    "0004_add_users_profile_fields": ("column", "users.latitude"),
    "0005_add_tags_and_user_tags": ("table", "user_tags"),
    "0006_add_user_photos": ("table", "user_photos"),
    "0007_add_location_label_and_consent": ("column", "users.location_consent"),
    "0008_add_likes_and_visits": ("table", "visits"),
    "0009_add_blocks_and_reports": ("table", "reports"),
    "0010_create_in_app_notifications": ("table", "in_app_notifications"),
    "0011_create_chat_messages": ("table", "chat_messages"),
    "0012_create_profile_completeness_view": ("view", "profile_completeness"),
}


class MigrationError(Exception):
    pass


async def _effect_present(conn: asyncpg.Connection, version: str) -> bool:
    kind, name = EFFECTS[version]
    if kind in ("table", "view"):
        return await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = current_schema() AND table_name = $1)",
            name,
        )
    table, column = name.split(".")
    return await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2)",
        table,
        column,
    )


async def _schema_migrations_exists(conn: asyncpg.Connection) -> bool:
    return await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = current_schema() AND table_name = 'schema_migrations')"
    )


async def _record_existing_effects(conn: asyncpg.Connection, versions: list[str]) -> None:
    for version in versions:
        if version in EFFECTS and await _effect_present(conn, version):
            await conn.execute("INSERT INTO schema_migrations (version) VALUES ($1)", version)


async def migrate(dsn: str, migrations_dir: Path = MIGRATIONS_DIR) -> list[str]:
    """Returns the versions applied by this run (baselined ones are not included)."""
    files = sorted(migrations_dir.glob("*.sql"))
    conn = await asyncpg.connect(dsn=dsn)
    try:
        async with conn.transaction():
            is_first_run = not await _schema_migrations_exists(conn)
            await conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
            )
            if is_first_run:
                await _record_existing_effects(conn, [f.stem for f in files])
        recorded = {r["version"] for r in await conn.fetch("SELECT version FROM schema_migrations")}
        applied: list[str] = []
        for file in files:
            if file.stem in recorded:
                continue
            try:
                async with conn.transaction():
                    await conn.execute(file.read_text())
                    await conn.execute("INSERT INTO schema_migrations (version) VALUES ($1)", file.stem)
            except Exception as exc:
                raise MigrationError(f"migration {file.name} failed and was rolled back: {exc}") from exc
            applied.append(file.stem)
        return applied
    finally:
        await conn.close()


def main() -> None:
    try:
        applied = asyncio.run(migrate(settings.DATABASE_URL))
    except MigrationError as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
    print(f"Applied {len(applied)} migration(s): {', '.join(applied) or 'none'}")


if __name__ == "__main__":
    main()
