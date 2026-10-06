import logging
from typing import Any, List
from modules.chat.repository import ChatRepository
from modules.chat.schemas import ChatOkResponse, MessageOut, SendMessageInput
from modules.chat.exceptions import (
    NotConnectedException,
    ChatUserNotFoundException,
)

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        social_repo: Any,
        notifier: Any = None,
        hub: Any = None,
    ):
        self.chat_repo = chat_repo
        self.social_repo = social_repo
        self.notifier = notifier
        self.hub = hub

    async def _ensure_can_chat(self, me: int, peer: int) -> None:
        # A blocked peer is answered exactly like a missing one (ADR-0007).
        if not await self.social_repo.user_exists(peer) or await self.social_repo.is_blocked_either_way(me, peer):
            raise ChatUserNotFoundException()
        if not await self.social_repo.is_connected(me, peer):
            raise NotConnectedException()

    async def send(
        self, me: int, peer: int, payload: SendMessageInput
    ) -> MessageOut:
        await self._ensure_can_chat(me, peer)
        message = await self.chat_repo.insert_message(me, peer, payload.body)
        if self.notifier is not None:
            try:
                await self.notifier.create_event(
                    user_id=peer,
                    type="message",
                    actor_id=me,
                    entity_id=message.id,
                )
            except Exception:
                logger.exception(
                    "Failed to emit message notification for chat %s", message.id
                )
        await self._push_chat(peer, message)
        await self._push_chat(me, message)
        return message

    async def list_messages(
        self, me: int, peer: int, limit: int, before: int | None
    ) -> List[MessageOut]:
        await self._ensure_can_chat(me, peer)
        return await self.chat_repo.list_messages(me, peer, limit, before)

    async def mark_conversation_read(self, me: int, peer: int) -> ChatOkResponse:
        await self._ensure_can_chat(me, peer)
        await self.notifier.mark_read_by_actor(user_id=me, actor_id=peer, type="message")
        return ChatOkResponse()

    async def _push_chat(self, user_id: int, message: MessageOut) -> None:
        if self.hub is None:
            return
        try:
            await self.hub.push(
                user_id,
                {
                    "type": "chat.message",
                    "payload": message.model_dump(mode="json"),
                },
            )
        except Exception:
            logger.exception(
                "Failed to push chat message %s to user %s",
                message.id,
                user_id,
            )
