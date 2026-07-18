import asyncpg
from modules.users.schemas import (
    UserProfile,
    PhotoOut
)
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel
from modules.tags.schemas import TagInput, TagOut
from typing import List
from fastapi import UploadFile
from modules.users.exceptions import (
    FileTooLargeException,
    InvalidPhotoTypeException,
    MaxPhotosReachedException
)
import imghdr
import uuid
from pathlib import Path

UPLOAD_DIR = Path("uploads")
MAX_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"jpeg", "png", "gif", "webp"}
IMAGE_TYPE_EXTENSIONS = {
    "jpeg": ".jpg",
    "png": ".png",
    "gif": ".gif",
    "webp": ".webp",
}
T = TypeVar("T", bound=BaseModel)

USER_COLUMNS = """
    id, email, username, first_name, last_name, is_verified, created_at,
    gender, sexual_preference, age, bio
"""

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
            ) -> Optional[UserProfile]:
        query = """
                UPDATE users
                set gender = $2, sexual_preference = $3, age = $4, bio = $5
                WHERE id = $1
                RETURNING id, email, username, first_name, last_name, is_verified, created_at,
                gender, sexual_preference, age, bio
                """
        return await self._fetch_one(
            UserProfile,
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
        image_type = imghdr.what(None, content)
        if image_type not in ALLOWED_IMAGE_TYPES:
            raise InvalidPhotoTypeException()
        
        file_name = f"{uuid.uuid4()}{IMAGE_TYPE_EXTENSIONS[image_type]}"
        file_path = UPLOAD_DIR / file_name

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(content)

        url = f"/uploads/{file_name}"

        query = """
                INSERT INTO user_photos (user_id, url)
                VALUES ($1, $2)
                RETURNING id, url, is_profile_photo
                """
        try:
            return await self._fetch_one(PhotoOut, query, current_user_id, url)
        except asyncpg.exceptions.RaiseError:
            file_path.unlink(missing_ok=True)
            raise MaxPhotosReachedException()
    
    async def get_my_photos(
            self,
            current_user_id: int,
    ) -> Optional[List[PhotoOut]]:
        query = """
                SELECT id, url, is_profile_photo FROM user_photos WHERE user_id = $1
                """
        return await self._fetch(PhotoOut, query, current_user_id)
  
    async def delete_my_photo(
            self,
            photo_id: int,
            current_user_id: int
    ) -> None:
        row = await self.connection.fetchrow(
            """
            DELETE FROM user_photos
            WHERE id = $1 AND user_id = $2
            RETURNING url
            """,
            photo_id,
            current_user_id,
        )
        if row and row["url"]:
            Path(row["url"].lstrip("/")).unlink(missing_ok=True)
    
    async def set_photo_as_avatar(
            self,
            photo_id: int,
            current_user_id: int
    ) -> None:
        exists = await self.connection.fetchval(
            "SELECT 1 FROM user_photos WHERE id = $1 AND user_id = $2",
            photo_id,
            current_user_id,
        )
        if not exists:
            return
        set_false_query = """
                        UPDATE user_photos
                        SET is_profile_photo = false
                        WHERE user_id = $1
                        """
        await self.connection.execute(set_false_query, current_user_id)
        set_true_query = """
                UPDATE user_photos
                SET is_profile_photo = true
                WHERE id = $1 AND user_id = $2
                """
        return await self.connection.execute(set_true_query, photo_id, current_user_id)
    

    async def patch_photo_by_new(
            self,
            photo_id: int,
            file: UploadFile,
            current_user_id: int
    ) -> PhotoOut:
        old_row = await self.connection.fetchrow(
            "SELECT url FROM user_photos WHERE id = $1 AND user_id = $2",
            photo_id,
            current_user_id,
        )
        if not old_row:
            return None
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise FileTooLargeException()
        image_type = imghdr.what(None, content)
        if image_type not in ALLOWED_IMAGE_TYPES:
            raise InvalidPhotoTypeException()
        
        file_name = f"{uuid.uuid4()}{IMAGE_TYPE_EXTENSIONS[image_type]}"
        file_path = UPLOAD_DIR / file_name

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(content)

        url = f"/uploads/{file_name}"
    
        query = """
                UPDATE user_photos
                SET url = $3
                WHERE id = $1 AND user_id = $2
                RETURNING id, url, is_profile_photo
                """    
        photo = await self._fetch_one(PhotoOut, query, photo_id, current_user_id, url)
        if not photo:
            file_path.unlink(missing_ok=True)
            return None
        Path(old_row["url"].lstrip("/")).unlink(missing_ok=True)
        return photo
