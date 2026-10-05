from typing import List, Optional
import asyncpg
from modules.notifications.schemas import NotificationOut, NotificationType


class InAppNotificationsRepository:
    """Persistence for in-app notifications. Does not touch email_outbox."""

    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def create(
        self,
        user_id: int,
        type: NotificationType,
        actor_id: int,
        entity_id: Optional[int] = None,
    ) -> NotificationOut:
        row = await self.connection.fetchrow(
            """
            INSERT INTO in_app_notifications (user_id, type, actor_id, entity_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, type, actor_id, entity_id, read_at, created_at
            """,
            user_id,
            type,
            actor_id,
            entity_id,
        )
        return self._to_out(row)

    async def list_for_user(
        self, user_id: int, limit: int, offset: int
    ) -> List[NotificationOut]:
        rows = await self.connection.fetch(
            """
            SELECT n.id, n.type, n.actor_id, n.entity_id, n.read_at, n.created_at
            FROM in_app_notifications n
            WHERE n.user_id = $1
              AND NOT EXISTS (
                SELECT 1 FROM blocked_pairs bp
                WHERE bp.user_id = $1 AND bp.other_user_id = n.actor_id
              )
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT $2 OFFSET $3
            """,
            user_id,
            limit,
            offset,
        )
        return [self._to_out(row) for row in rows]

    async def mark_read(self, user_id: int, notification_id: int) -> bool:
        row = await self.connection.fetchrow(
            """
            UPDATE in_app_notifications
            SET read_at = COALESCE(read_at, NOW())
            WHERE id = $1 AND user_id = $2
            RETURNING id
            """,
            notification_id,
            user_id,
        )
        return row is not None

    async def mark_all_read(self, user_id: int) -> int:
        result = await self.connection.execute(
            """
            UPDATE in_app_notifications
            SET read_at = NOW()
            WHERE user_id = $1 AND read_at IS NULL
            """,
            user_id,
        )
        # asyncpg returns e.g. "UPDATE 3"
        try:
            return int(result.split()[-1])
        except (ValueError, IndexError):
            return 0

    async def unread_count(self, user_id: int) -> int:
        value = await self.connection.fetchval(
            """
            SELECT COUNT(*)::int
            FROM in_app_notifications n
            WHERE n.user_id = $1 AND n.read_at IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM blocked_pairs bp
                WHERE bp.user_id = $1 AND bp.other_user_id = n.actor_id
              )
            """,
            user_id,
        )
        return int(value or 0)

    @staticmethod
    def _to_out(row) -> NotificationOut:
        return NotificationOut(
            id=row["id"],
            type=row["type"],
            actor_id=row["actor_id"],
            entity_id=row["entity_id"],
            read_at=row["read_at"],
            created_at=row["created_at"],
        )
