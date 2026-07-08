from fastapi import APIRouter, Depends
import asyncpg
from core.database import get_db_connection
from modules.users.repository import UsersRepository
from modules.users.service import UsersService
from modules.users.schemas import (
    UserProfile
)

users_router = APIRouter(prefix="/users", tags=["users"])

def get_users_service(
        db: asyncpg.Connection = Depends(get_db_connection)
) -> UsersService:
    repository = UsersRepository(db)
    return UsersService(repository)

@users_router.get(
    "/me", response_model=UserProfile
)
async def getMe(token: str, service: UsersService) -> UserProfile:
