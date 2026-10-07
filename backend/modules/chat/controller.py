from typing import List
from fastapi import APIRouter, Depends, Query
import asyncpg
from core.database import get_db_connection
from core.presence import get_current_user_id_and_touch
from modules.chat.repository import ChatRepository
from modules.chat.service import ChatService
from modules.chat.schemas import (
    ChatOkResponse,
    MessageOut,
    ReadConversationInput,
    SendMessageInput,
)
from modules.social.repository import SocialRepository
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.service import NotificationsService
from core.ws_hub import hub

chat_router = APIRouter(prefix="/chat", tags=["chat"])


def get_chat_service(
    db: asyncpg.Connection = Depends(get_db_connection),
) -> ChatService:
    notifier = NotificationsService(InAppNotificationsRepository(db), hub=hub)
    return ChatService(
        ChatRepository(db),
        SocialRepository(db),
        notifier=notifier,
        hub=hub,
    )


@chat_router.post("/messages/{peer_id}", response_model=MessageOut)
async def send_message(
    peer_id: int,
    payload: SendMessageInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: ChatService = Depends(get_chat_service),
) -> MessageOut:
    return await service.send(current_user_id, peer_id, payload)


@chat_router.get("/messages/{peer_id}", response_model=List[MessageOut])
async def list_messages(
    peer_id: int,
    limit: int = Query(50, ge=1, le=100),
    before: int | None = Query(None, ge=1),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: ChatService = Depends(get_chat_service),
) -> List[MessageOut]:
    return await service.list_messages(current_user_id, peer_id, limit, before)


@chat_router.post("/conversations/{peer_id}/read", response_model=ChatOkResponse)
async def mark_conversation_read(
    peer_id: int,
    payload: ReadConversationInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: ChatService = Depends(get_chat_service),
) -> ChatOkResponse:
    return await service.mark_conversation_read(
        current_user_id, peer_id, payload.up_to_message_id
    )
