import asyncpg
from modules.users.schemas import (
    UserProfile,
    UserProfileComplete
)
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

USER_COLUMNS = "id, email, username, first_name, last_name, is_verified, created_at"

class UsersRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection
    
    async def _fetch_one(self, model: Type[T], query: str, *args: Any) -> Optional[T]:
        row = await self.connection.fetchrow(query, *args)
        return model.model_validate(dict(row)) if row else None

    async def get_user_by_id(
            self,
            current_user_id: int
    ) -> Optional[UserProfile]:
        query = f"SELECT {USER_COLUMNS} FROM users WHERE id = $1"
        return await self._fetch_one(UserProfile, query, current_user_id)
    
    async def patch_user_profile(
            self,
            current_user_id,
            payload
            ) -> Optional[UserProfileComplete]:
        query = """
                UPDATE users
                set gender = $2, sexual_preference = $3, age = $4, bio = $5
                WHERE id = $1
                RETURNING id, email, username, first_name, last_name, is_verified, created_at,
                gender, sexual_preference, age, bio
                """
        return await self._fetch_one(
            UserProfileComplete,
            query,
            current_user_id,
            payload.gender,
            payload.sexual_preference,
            payload.age,
            payload.bio,
            )
        