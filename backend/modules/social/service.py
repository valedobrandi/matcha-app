from datetime import datetime, timezone
import logging
from modules.social.repository import SocialRepository
from modules.users.repository import UsersRepository
from modules.social.exceptions import (
    SocialUserNotFoundException,
    CannotVisitSelfException,
    CannotLikeSelfException,
    ProfilePhotoRequiredException,
    CannotBlockSelfException,
    CannotReportSelfException,
)
from modules.social.schemas import (
    SocialOkResponse,
    LikeStateResponse,
    BlockStateResponse,
    RelationshipResponse,
    VisitorOut,
    LikeReceivedOut,
    BlockedUserOut,
    ConnectionOut,
)
from core.presence import ONLINE_WINDOW_SECONDS
from typing import Any, List, Optional

FAME_LIKE_DELTA = 5
FAME_VISIT_DELTA = 1
BLOCKS_CHANGED = {"type": "blocks.changed", "payload": None}

logger = logging.getLogger(__name__)


class SocialService:
    def __init__(
        self,
        social_repo: SocialRepository,
        users_repo: UsersRepository,
        hub: Any,
        notifier: Any = None,
    ):
        self.social_repo = social_repo
        self.users_repo = users_repo
        self.hub = hub
        self.notifier = notifier

    async def _ensure_not_blocked(self, a: int, b: int) -> None:
        if await self.social_repo.is_blocked_either_way(a, b):
            raise SocialUserNotFoundException()

    async def _emit(
        self,
        user_id: int,
        type: str,
        actor_id: int,
        entity_id: Optional[int] = None,
    ) -> None:
        if self.notifier is None:
            return
        try:
            await self.notifier.create_event(
                user_id=user_id,
                type=type,
                actor_id=actor_id,
                entity_id=entity_id,
            )
        except Exception:
            logger.exception(
                "Failed to emit %s notification to user %s from actor %s",
                type,
                user_id,
                actor_id,
            )

    async def record_visit(self, viewer_id: int, target_id: int) -> SocialOkResponse:
        if viewer_id == target_id:
            raise CannotVisitSelfException()
        if not await self.social_repo.user_exists(target_id):
            raise SocialUserNotFoundException()
        await self._ensure_not_blocked(viewer_id, target_id)
        inserted = False
        async with self.social_repo.connection.transaction():
            inserted = await self.social_repo.upsert_visit(viewer_id, target_id)
            if inserted:
                await self.users_repo.bump_fame(target_id, FAME_VISIT_DELTA)
        # Emit on every successful visit (including revisits that only bump visited_at).
        # Fame still awards only on first insert.
        await self._emit(target_id, "visited", viewer_id)
        return SocialOkResponse()

    async def list_visitors(self, user_id: int, limit: int, offset: int) -> List[VisitorOut]:
        return await self.social_repo.list_visitors(user_id, limit, offset)

    async def like(self, from_user_id: int, to_user_id: int) -> LikeStateResponse:
        if from_user_id == to_user_id:
            raise CannotLikeSelfException()
        if not await self.social_repo.user_exists(to_user_id):
            raise SocialUserNotFoundException()
        await self._ensure_not_blocked(from_user_id, to_user_id)
        if not await self.users_repo.has_profile_photo(from_user_id):
            raise ProfilePhotoRequiredException()
        became_active = False
        is_first_insert = False
        connected = False
        async with self.social_repo.connection.transaction():
            became_active, is_first_insert = await self.social_repo.activate_like(
                from_user_id, to_user_id
            )
            if is_first_insert:
                await self.users_repo.bump_fame(to_user_id, FAME_LIKE_DELTA)
            connected = await self.social_repo.is_connected(from_user_id, to_user_id)
        if became_active:
            await self._emit(to_user_id, "liked", from_user_id)
            if connected:
                await self._emit(from_user_id, "matched", to_user_id)
                await self._emit(to_user_id, "matched", from_user_id)
        return LikeStateResponse(liked=True, connected=connected)

    async def unlike(self, from_user_id: int, to_user_id: int) -> LikeStateResponse:
        if not await self.social_repo.user_exists(to_user_id):
            raise SocialUserNotFoundException()
        await self._ensure_not_blocked(from_user_id, to_user_id)
        deactivated = await self.social_repo.soft_unlike(from_user_id, to_user_id)
        connected = await self.social_repo.is_connected(from_user_id, to_user_id)
        if deactivated:
            await self._emit(to_user_id, "unliked", from_user_id)
        return LikeStateResponse(liked=False, connected=connected)

    async def list_likes_received(
        self, user_id: int, limit: int, offset: int
    ) -> List[LikeReceivedOut]:
        return await self.social_repo.list_likes_received(user_id, limit, offset)

    async def list_connections(
        self, user_id: int, limit: int, offset: int
    ) -> List[ConnectionOut]:
        return await self.social_repo.list_connections(user_id, limit, offset)

    async def block(self, from_user_id: int, to_user_id: int) -> BlockStateResponse:
        if from_user_id == to_user_id:
            raise CannotBlockSelfException()
        if not await self.social_repo.user_exists(to_user_id):
            raise SocialUserNotFoundException()
        await self.social_repo.activate_block(from_user_id, to_user_id)
        await self.hub.push(from_user_id, BLOCKS_CHANGED)
        return BlockStateResponse(blocked=True)

    async def unblock(self, from_user_id: int, to_user_id: int) -> BlockStateResponse:
        await self.social_repo.soft_unblock(from_user_id, to_user_id)
        await self.hub.push(from_user_id, BLOCKS_CHANGED)
        return BlockStateResponse(blocked=False)

    async def list_blocks(
        self, user_id: int, limit: int, offset: int
    ) -> List[BlockedUserOut]:
        return await self.social_repo.list_blocks(user_id, limit, offset)

    async def report(
        self, reporter_id: int, target_id: int, reason: Optional[str]
    ) -> SocialOkResponse:
        if reporter_id == target_id:
            raise CannotReportSelfException()
        if not await self.social_repo.user_exists(target_id):
            raise SocialUserNotFoundException()
        await self.social_repo.upsert_report(reporter_id, target_id, reason)
        return SocialOkResponse()

    async def get_relationship(self, me: int, target_id: int) -> RelationshipResponse:
        if not await self.social_repo.user_exists(target_id):
            raise SocialUserNotFoundException()
        flags = await self.social_repo.get_relationship_flags(me, target_id)
        if flags.blocked_you:
            raise SocialUserNotFoundException()
        last_connection = await self.users_repo.get_last_connection(target_id)
        return RelationshipResponse(
            liked_by_me=flags.liked_by_me,
            liked_you=flags.liked_you,
            connected=flags.connected,
            blocked_by_me=flags.blocked_by_me,
            last_connection=last_connection,
            is_online=self._is_online(last_connection),
        )

    @staticmethod
    def _is_online(last_connection: Optional[datetime]) -> bool:
        if last_connection is None:
            return False
        if last_connection.tzinfo is None:
            last_connection = last_connection.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - last_connection).total_seconds()
        return age <= ONLINE_WINDOW_SECONDS
