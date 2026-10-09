import datetime
import uuid

import asyncpg


class SessionsRepository:
    def __init__(self, connection: asyncpg.Connection) -> None:
        self.connection = connection

    async def open(self, user_id: int, lifetime: datetime.timedelta) -> uuid.UUID:
        session_id = uuid.uuid4()
        await self.connection.execute(
            """
            INSERT INTO auth_sessions (id, user_id, expires_at)
            VALUES ($1, $2, NOW() + $3::interval)
            """,
            session_id,
            user_id,
            lifetime,
        )
        return session_id

    async def is_active(self, session_id: uuid.UUID, user_id: int) -> bool:
        return await self.connection.fetchval(
            """
            SELECT EXISTS (
                SELECT 1 FROM auth_sessions s
                WHERE s.id = $1
                    AND s.user_id = $2
                    AND s.expires_at > NOW()
                    AND NOT EXISTS (
                        SELECT 1 FROM auth_session_revocations r WHERE r.session_id = s.id
                    )
            )
            """,
            session_id,
            user_id,
        )

    async def revoke(self, session_id: uuid.UUID) -> None:
        await self.connection.execute(
            """
            INSERT INTO auth_session_revocations (session_id)
            VALUES ($1)
            ON CONFLICT (session_id) DO NOTHING
            """,
            session_id,
        )

    async def revoke_all(self, user_id: int, keep: uuid.UUID | None = None) -> list[uuid.UUID]:
        rows = await self.connection.fetch(
            """
            INSERT INTO auth_session_revocations (session_id)
            SELECT s.id FROM auth_sessions s
            WHERE s.user_id = $1
                AND s.expires_at > NOW()
                AND s.id IS DISTINCT FROM $2
            ON CONFLICT (session_id) DO NOTHING
            RETURNING session_id
            """,
            user_id,
            keep,
        )
        return [row["session_id"] for row in rows]
