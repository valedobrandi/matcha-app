import asyncpg
from dataclasses import dataclass
from typing import List, Optional
from modules.social.schemas import (
    VisitorOut,
    LikeReceivedOut,
    BlockedUserOut,
)


@dataclass
class RelationshipFlags:
    """Raw like/block flags between two users. Response assembly (connected,
    presence) belongs to the service, not this SQL layer."""
    liked_by_me: bool
    liked_you: bool
    blocked_by_me: bool
    blocked_you: bool


class SocialRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def user_exists(self, user_id: int) -> bool:
        return await self.connection.fetchval(
            "SELECT 1 FROM users WHERE id = $1", user_id
        ) is not None

    async def upsert_visit(self, viewer_id: int, target_id: int) -> bool:
        """Return True iff a new visit row was inserted (first visit)."""
        row = await self.connection.fetchrow(
            """
            INSERT INTO visits (viewer_id, target_id, visited_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (viewer_id, target_id)
            DO UPDATE SET visited_at = NOW()
            RETURNING (xmax = 0) AS inserted
            """,
            viewer_id,
            target_id,
        )
        return bool(row["inserted"])

    async def list_visitors(self, user_id: int, limit: int, offset: int) -> List[VisitorOut]:
        rows = await self.connection.fetch(
            """
            SELECT u.id, u.username, u.first_name, u.last_name, v.visited_at
            FROM visits v
            JOIN users u ON u.id = v.viewer_id
            WHERE v.target_id = $1
            ORDER BY v.visited_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset,
        )
        return [VisitorOut.model_validate(dict(r)) for r in rows]

    async def activate_like(
        self, from_user_id: int, to_user_id: int
    ) -> tuple[bool, bool]:
        """Activate like.

        Returns ``(became_active, is_first_insert)``.
        ``became_active`` is True when status transitions to active (insert or
        soft re-activate). ``is_first_insert`` is True only for a brand-new row
        (fame award). Already-active likes return ``(False, False)``.
        """
        row = await self.connection.fetchrow(
            """
            INSERT INTO likes (from_user_id, to_user_id, status, created_at, updated_at)
            VALUES ($1, $2, 'active', NOW(), NOW())
            ON CONFLICT (from_user_id, to_user_id)
            DO UPDATE SET
                status = 'active',
                updated_at = NOW()
            WHERE likes.status IS DISTINCT FROM 'active'
            RETURNING (xmax = 0) AS inserted
            """,
            from_user_id,
            to_user_id,
        )
        if row is None:
            return False, False
        is_first_insert = bool(row["inserted"])
        return True, is_first_insert

    async def soft_unlike(self, from_user_id: int, to_user_id: int) -> bool:
        """Deactivate like. Return True iff an active like was deactivated."""
        result = await self.connection.execute(
            """
            UPDATE likes
            SET status = 'inactive', updated_at = NOW()
            WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'active'
            """,
            from_user_id,
            to_user_id,
        )
        try:
            return int(result.split()[-1]) > 0
        except (ValueError, IndexError, AttributeError):
            return False

    async def is_connected(self, a: int, b: int) -> bool:
        row = await self.connection.fetchrow(
            """
            SELECT
              EXISTS (
                SELECT 1 FROM likes
                WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'active'
              ) AS ab,
              EXISTS (
                SELECT 1 FROM likes
                WHERE from_user_id = $2 AND to_user_id = $1 AND status = 'active'
              ) AS ba
            """,
            a, b,
        )
        return bool(row["ab"] and row["ba"])

    async def get_relationship_flags(self, me: int, target: int) -> RelationshipFlags:
        row = await self.connection.fetchrow(
            """
            SELECT
              EXISTS (
                SELECT 1 FROM likes
                WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'active'
              ) AS liked_by_me,
              EXISTS (
                SELECT 1 FROM likes
                WHERE from_user_id = $2 AND to_user_id = $1 AND status = 'active'
              ) AS liked_you,
              EXISTS (
                SELECT 1 FROM blocks
                WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'active'
              ) AS blocked_by_me,
              EXISTS (
                SELECT 1 FROM blocks
                WHERE from_user_id = $2 AND to_user_id = $1 AND status = 'active'
              ) AS blocked_you
            """,
            me, target,
        )
        return RelationshipFlags(
            liked_by_me=bool(row["liked_by_me"]),
            liked_you=bool(row["liked_you"]),
            blocked_by_me=bool(row["blocked_by_me"]),
            blocked_you=bool(row["blocked_you"]),
        )

    async def list_likes_received(
        self, user_id: int, limit: int, offset: int
    ) -> List[LikeReceivedOut]:
        rows = await self.connection.fetch(
            """
            SELECT u.id, u.username, u.first_name, u.last_name,
                   l.updated_at AS liked_at
            FROM likes l
            JOIN users u ON u.id = l.from_user_id
            WHERE l.to_user_id = $1 AND l.status = 'active'
            ORDER BY l.updated_at DESC, l.id DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset,
        )
        return [LikeReceivedOut.model_validate(dict(r)) for r in rows]

    async def is_blocked_either_way(self, a: int, b: int) -> bool:
        row = await self.connection.fetchrow(
            """
            SELECT EXISTS (
                SELECT 1 FROM blocks
                WHERE status = 'active'
                  AND (
                    (from_user_id = $1 AND to_user_id = $2)
                    OR (from_user_id = $2 AND to_user_id = $1)
                  )
            ) AS blocked
            """,
            a, b,
        )
        return bool(row["blocked"])

    async def activate_block(self, from_user_id: int, to_user_id: int) -> None:
        await self.connection.execute(
            """
            INSERT INTO blocks (from_user_id, to_user_id, status, created_at, updated_at)
            VALUES ($1, $2, 'active', NOW(), NOW())
            ON CONFLICT (from_user_id, to_user_id)
            DO UPDATE SET
                status = 'active',
                updated_at = NOW()
            WHERE blocks.status IS DISTINCT FROM 'active'
            """,
            from_user_id,
            to_user_id,
        )

    async def soft_unblock(self, from_user_id: int, to_user_id: int) -> None:
        await self.connection.execute(
            """
            UPDATE blocks
            SET status = 'inactive', updated_at = NOW()
            WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'active'
            """,
            from_user_id,
            to_user_id,
        )

    async def list_blocks(
        self, user_id: int, limit: int, offset: int
    ) -> List[BlockedUserOut]:
        rows = await self.connection.fetch(
            """
            SELECT u.id, u.username, u.first_name, u.last_name,
                   b.updated_at AS blocked_at
            FROM blocks b
            JOIN users u ON u.id = b.to_user_id
            WHERE b.from_user_id = $1 AND b.status = 'active'
            ORDER BY b.updated_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset,
        )
        return [BlockedUserOut.model_validate(dict(r)) for r in rows]

    async def upsert_report(
        self, reporter_id: int, target_id: int, reason: Optional[str]
    ) -> None:
        await self.connection.execute(
            """
            INSERT INTO reports (reporter_id, target_id, reason, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (reporter_id, target_id)
            DO UPDATE SET
                reason = EXCLUDED.reason,
                updated_at = NOW()
            """,
            reporter_id,
            target_id,
            reason,
        )

    async def count_likes_received(
            self, target_user_id: int
    ) -> int:
        return await self.connection.fetchval(
            """
            SELECT COUNT(*)
            FROM likes
            WHERE to_user_id = $1 AND status = 'active'
            """,
            target_user_id
        )

    async def count_visitors(
            self, target_user_id: int
    ) -> int:
        return await self.connection.fetchval(
            """
            SELECT COUNT(*)
            FROM visits
            WHERE target_id = $1
            """,
            target_user_id
        )