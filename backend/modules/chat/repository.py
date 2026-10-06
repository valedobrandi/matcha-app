from typing import List
import asyncpg
from modules.chat.schemas import MessageOut


class ChatRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def insert_message(
        self, from_user_id: int, to_user_id: int, body: str
    ) -> MessageOut:
        row = await self.connection.fetchrow(
            """
            INSERT INTO chat_messages (from_user_id, to_user_id, body)
            VALUES ($1, $2, $3)
            RETURNING id, from_user_id, to_user_id, body, created_at
            """,
            from_user_id,
            to_user_id,
            body,
        )
        return self._to_out(row)

    async def list_messages(
        self, me: int, peer: int, limit: int, before: int | None
    ) -> List[MessageOut]:
        rows = await self.connection.fetch(
            """
            SELECT id, from_user_id, to_user_id, body, created_at
            FROM chat_messages
            WHERE LEAST(from_user_id, to_user_id) = LEAST($1::int, $2::int)
              AND GREATEST(from_user_id, to_user_id) = GREATEST($1::int, $2::int)
              AND ($4::int IS NULL OR id < $4::int)
            ORDER BY id DESC
            LIMIT $3
            """,
            me,
            peer,
            limit,
            before,
        )
        return [self._to_out(row) for row in rows]

    @staticmethod
    def _to_out(row) -> MessageOut:
        return MessageOut(
            id=row["id"],
            from_user_id=row["from_user_id"],
            to_user_id=row["to_user_id"],
            body=row["body"],
            created_at=row["created_at"],
        )
