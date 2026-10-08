from typing import List
from fastapi import APIRouter, Depends, Query
import asyncpg
from core.database import get_db_connection
from core.presence import get_current_user_id_and_touch
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.service import NotificationsService
from modules.notifications.schemas import (
    NotificationOut,
    UnreadCountOut,
    NotificationOkResponse,
)
from core.ws_hub import hub
from core.api_model import RowIdPath, INT4_MAX

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_notifications_service(
    db: asyncpg.Connection = Depends(get_db_connection),
) -> NotificationsService:
    return NotificationsService(InAppNotificationsRepository(db), hub=hub)


@notifications_router.get("", response_model=List[NotificationOut])
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, le=INT4_MAX),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: NotificationsService = Depends(get_notifications_service),
) -> List[NotificationOut]:
    return await service.list_for_user(current_user_id, limit, offset)


@notifications_router.get("/unread-count", response_model=UnreadCountOut)
async def get_unread_count(
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: NotificationsService = Depends(get_notifications_service),
) -> UnreadCountOut:
    return await service.unread_count(current_user_id)


@notifications_router.post("/read-all", response_model=NotificationOkResponse)
async def mark_all_notifications_read(
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: NotificationsService = Depends(get_notifications_service),
) -> NotificationOkResponse:
    return await service.mark_all_read(current_user_id)


@notifications_router.post("/{notification_id}/read", response_model=NotificationOkResponse)
async def mark_notification_read(
    notification_id: RowIdPath,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: NotificationsService = Depends(get_notifications_service),
) -> NotificationOkResponse:
    return await service.mark_read(current_user_id, notification_id)
