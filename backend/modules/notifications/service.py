import logging
from typing import Any, List, Optional
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.schemas import (
    NotificationOut,
    NotificationType,
    UnreadCountOut,
    NotificationOkResponse,
)
from modules.notifications.exceptions import NotificationNotFoundException

logger = logging.getLogger(__name__)


class NotificationsService:
    def __init__(
        self,
        repository: InAppNotificationsRepository,
        hub: Any = None,
    ):
        self.repository = repository
        self.hub = hub

    async def create_event(
        self,
        user_id: int,
        type: NotificationType,
        actor_id: int,
        entity_id: Optional[int] = None,
    ) -> NotificationOut:
        notification = await self.repository.create(
            user_id=user_id,
            type=type,
            actor_id=actor_id,
            entity_id=entity_id,
        )
        await self._push_notification(user_id, notification)
        return notification

    async def list_for_user(
        self, user_id: int, limit: int, offset: int
    ) -> List[NotificationOut]:
        return await self.repository.list_for_user(user_id, limit, offset)

    async def mark_read(self, user_id: int, notification_id: int) -> NotificationOkResponse:
        updated = await self.repository.mark_read(user_id, notification_id)
        if not updated:
            raise NotificationNotFoundException()
        return NotificationOkResponse()

    async def mark_all_read(self, user_id: int) -> NotificationOkResponse:
        await self.repository.mark_all_read(user_id)
        return NotificationOkResponse()

    async def unread_count(self, user_id: int) -> UnreadCountOut:
        count = await self.repository.unread_count(user_id)
        return UnreadCountOut(unread_count=count)

    async def _push_notification(
        self, user_id: int, notification: NotificationOut
    ) -> None:
        if self.hub is None:
            return
        try:
            await self.hub.push(
                user_id,
                {
                    "type": "notification",
                    "payload": notification.model_dump(mode="json"),
                },
            )
        except Exception:
            logger.exception(
                "Failed to push notification %s to user %s",
                notification.id,
                user_id,
            )
