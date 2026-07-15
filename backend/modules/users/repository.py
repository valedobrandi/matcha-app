import asyncpg
from modules.users.schemas import (
    UserProfile,
    UserProfileComplete,
    PhotoOut
)
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel
from modules.tags.schemas import TagInput, TagOut
from typing import List
from fastapi import UploadFile
from modules.users.exceptions import FileTooLargeException
import os, uuid

UPLOAD_DIR = "/uploads"
MAX_SIZE = 5 * 1024 * 1024
T = TypeVar("T", bound=BaseModel)

USER_COLUMNS = "id, email, username, first_name, last_name, is_verified, created_at"

class UsersRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection
    
    async def _fetch_one(self, model: Type[T], query: str, *args: Any) -> Optional[T]:
        row = await self.connection.fetchrow(query, *args)
        return model.model_validate(dict(row)) if row else None

    async def _fetch(self, model: Type[T], query: str, *args: Any) -> Optional[T]:
        rows = await self.connection.fetch(query, *args)
        return [model.model_validate(dict(row)) for row in rows]

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
    
    async def add_one_tag(
            self,
            current_user_id: int,
            tag_input: TagInput
            ) -> Optional[TagOut]:
        query = """
                INSERT INTO tags (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
                RETURNING id, name
                """
        tag = await self._fetch_one(TagOut, query, tag_input.name)
        if not tag:
            query = f"SELECT id, name FROM tags WHERE name = $1"
            tag = await self._fetch_one(TagOut, query, tag_input.name)

        link_query = """
                    INSERT INTO user_tags (user_id, tag_id)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id, tag_id) DO NOTHING
                    """
        await self.connection.execute(link_query, current_user_id, tag.id)
        
        return tag
    
    async def get_my_tags(
            self,
            current_user_id: int,
    ) -> Optional[List[TagOut]]:
        query = """
                SELECT t.id, t.name
                FROM tags t
                JOIN user_tags ut ON t.id = ut.tag_id
                WHERE ut.user_id = $1
                """
        return await self._fetch(TagOut, query, current_user_id)
    
    async def delete_one_tag(
            self,
            tag_id: int,
            current_user_id: int
    ) -> None:
        query = """
                DELETE FROM user_tags
                WHERE user_id = $1 AND tag_id = $2
                """
        return await self.connection.execute(query, current_user_id, tag_id)

    async def upload_photo(
            self, 
            current_user_id: int, 
            file: UploadFile
    ) -> Optional[PhotoOut]:
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise FileTooLargeException()
        
        extension = os.path.splitext(file)
        file_name = f"{uuid.uuid4()}{extension}"
        file_path = os.path.join(UPLOAD_DIR, file_name)

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(content)

        url = f"/{UPLOAD_DIR}/{file_name}"

        query = """
                INSERT INTO user_photos (user_id, url)
                VALUES ($1, $2)
                RETURNING id, url
                """
        return await self._fetch_one(PhotoOut, query, current_user_id, file_path)
