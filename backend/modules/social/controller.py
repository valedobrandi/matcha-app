from fastapi import APIRouter, Depends, Query
import asyncpg
from core.database import get_db_connection
from core.presence import get_current_user_id_and_touch
from modules.social.repository import SocialRepository
from modules.users.repository import UsersRepository
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.service import NotificationsService
from modules.social.service import SocialService
from core.ws_hub import hub
from modules.social.schemas import (
    SocialOkResponse,
    LikeStateResponse,
    BlockStateResponse,
    ReportInput,
    RelationshipResponse,
    VisitorOut,
    LikeReceivedOut,
    BlockedUserOut,
)
from typing import List

social_router = APIRouter(prefix="/social", tags=["social"])

def get_social_service(
    db: asyncpg.Connection = Depends(get_db_connection),
) -> SocialService:
    notifier = NotificationsService(InAppNotificationsRepository(db), hub=hub)
    return SocialService(SocialRepository(db), UsersRepository(db), notifier=notifier)

@social_router.post("/visits/{target_user_id}", response_model=SocialOkResponse)
async def create_visit(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> SocialOkResponse:
    return await service.record_visit(current_user_id, target_user_id)

@social_router.get("/visitors", response_model=List[VisitorOut])
async def list_visitors(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> List[VisitorOut]:
    return await service.list_visitors(current_user_id, limit, offset)

@social_router.post("/likes/{target_user_id}", response_model=LikeStateResponse)
async def create_like(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> LikeStateResponse:
    return await service.like(current_user_id, target_user_id)

@social_router.delete("/likes/{target_user_id}", response_model=LikeStateResponse)
async def delete_like(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> LikeStateResponse:
    return await service.unlike(current_user_id, target_user_id)

@social_router.get("/likes/received", response_model=List[LikeReceivedOut])
async def list_likes_received(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> List[LikeReceivedOut]:
    return await service.list_likes_received(current_user_id, limit, offset)

@social_router.get("/relationship/{target_user_id}", response_model=RelationshipResponse)
async def get_relationship(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> RelationshipResponse:
    return await service.get_relationship(current_user_id, target_user_id)

@social_router.post("/blocks/{target_user_id}", response_model=BlockStateResponse)
async def create_block(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> BlockStateResponse:
    return await service.block(current_user_id, target_user_id)

@social_router.delete("/blocks/{target_user_id}", response_model=BlockStateResponse)
async def delete_block(
    target_user_id: int,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> BlockStateResponse:
    return await service.unblock(current_user_id, target_user_id)

@social_router.get("/blocks", response_model=List[BlockedUserOut])
async def list_blocks(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> List[BlockedUserOut]:
    return await service.list_blocks(current_user_id, limit, offset)

@social_router.post("/reports/{target_user_id}", response_model=SocialOkResponse)
async def create_report(
    target_user_id: int,
    payload: ReportInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: SocialService = Depends(get_social_service),
) -> SocialOkResponse:
    return await service.report(current_user_id, target_user_id, payload.reason)
