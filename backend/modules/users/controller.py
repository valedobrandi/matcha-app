from fastapi import APIRouter, Depends
import asyncpg
from core.database import get_db_connection
from modules.users.repository import UsersRepository
from modules.users.service import UsersService
from modules.users.schemas import (
    UserProfile,
    UserProfileInput,
    UserProfileComplete,
)
from modules.users.dependencies import get_current_user_id
from modules.tags.schemas import TagOut, TagInput
from typing import List

users_router = APIRouter(prefix="/users", tags=["users"])

def get_users_service(
        db: asyncpg.Connection = Depends(get_db_connection)
) -> UsersService:
    repository = UsersRepository(db)
    return UsersService(repository)

@users_router.get(
    "/me", response_model=UserProfile
)
async def get_me(
    current_user_id: int = Depends(get_current_user_id),
    service: UsersService = Depends(get_users_service)
    ) -> UserProfile:
    return await service.get_profile(current_user_id)

@users_router.patch(
    "/me", response_model=UserProfileComplete
)
async def patch_me(
    payload: UserProfileInput,
    current_user_id: int = Depends(get_current_user_id),
    service: UsersService = Depends(get_users_service)
    ) -> UserProfileComplete:
    return await service.patch_profile(current_user_id, payload)

@users_router.post(
    "/me/tags", response_model=TagOut
)
async def add_one_profile_tag(
    tag_input: TagInput,
    current_user_id: int = Depends(get_current_user_id),
    service: UsersService = Depends(get_users_service)
) -> TagOut:
    return await service.add_one_profile_tag(current_user_id, tag_input)

@users_router.get(
    "/me/tags",
    response_model=List[TagOut]
)
async def get_my_tags(
    current_user_id: int = Depends(get_current_user_id),
    service: UsersService = Depends(get_users_service)
) -> List[TagOut]:
    return await service.get_my_tags(current_user_id)

@users_router.delete("/me/tags/{tag_id}")
async def delete_one_tag(
    tag_id: int,
    current_user_id: int = Depends(get_current_user_id),
    service: UsersService = Depends(get_users_service)
) -> None:
    return await service.delete_one_tag(tag_id, current_user_id)