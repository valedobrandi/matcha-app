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