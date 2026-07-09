import asyncpg
from modules.users.schemas import UserProfile
from typing import Any, Optional


USER_COLUMNS = "id, email, username, first_name, last_name, is_verified, created_at"

class UsersRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection
    
    async def _fetch_one(self, query: str, *args: Any) -> Optional[UserProfile]:
        row = await self.connection.fetchrow(query, *args)
        return UserProfile.model_validate(dict(row)) if row else None

    async def get_user_by_id(
            self,
            current_user_id: int
    ) -> Optional[UserProfile]:
        query = f"SELECT {USER_COLUMNS} FROM users WHERE id = $1"
        return await self._fetch_one(query, current_user_id)