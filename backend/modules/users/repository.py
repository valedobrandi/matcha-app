import asyncpg
from datetime import datetime
from modules.users.schemas import (
    UserProfile,
    PhotoOut,
    UserLocationInput,
    UserAccountInput,
    UserProfileInput,
    EditProfileInput
)
from typing import Any, List, Optional, Type, TypeVar
from pydantic import BaseModel
from modules.tags.schemas import TagInput, TagOut
from fastapi import UploadFile
from modules.users.exceptions import (
    FileTooLargeException,
    InvalidPhotoTypeException,
    MaxPhotosReachedException,
    EmailAlreadyTakenException,
)
from modules.notifications.outbox_repository import OutboxRepository
from modules.users.image_type import detect_image_type
from core.config import settings
import uuid
from pathlib import Path
from modules.notifications.outbox_repository import OutboxRepository
from core.config import settings
from modules.users.exceptions import (
    EmailAlreadyTakenException,
    UsernameAlreadyTakenException
)

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
    gender, sexual_preference, age, bio,
    fame_rating, latitude, longitude, location_label, location_consent, last_connection
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
    
    async def is_profile_completed(
            self,
            current_user_id: int
    ) -> bool:
        return bool(await self.connection.fetchval(
            "SELECT is_completed FROM profile_completeness WHERE user_id = $1",
            current_user_id,
        ))

    async def patch_user_profile(
            self,
            current_user_id,
            payload: UserProfileInput
            ) -> Optional[UserProfile]:
        query = """
                UPDATE users
                SET gender = $2, sexual_preference = $3, age = $4, bio = $5
                WHERE id = $1
                RETURNING id, email, username, first_name, last_name, is_verified, created_at,
                gender, sexual_preference, age, bio,
                fame_rating, latitude, longitude, location_label, location_consent, last_connection
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

    async def edit_profile(
            self,
            current_user_id: int,
            payload: EditProfileInput,
    ) -> Optional[UserProfile]:
        profile_payload = UserProfileInput(
            gender=payload.gender,
            sexual_preference=payload.sexual_preference,
            age=payload.age,
            bio=payload.bio,
        )
        location_payload = UserLocationInput(
            latitude=payload.latitude,
            longitude=payload.longitude,
            location_label=payload.location_label,
            location_consent=payload.location_consent,
        )
        async with self.connection.transaction():
            await self.patch_user_profile(current_user_id, profile_payload)
            return await self.update_location(current_user_id, location_payload)

    async def update_location(
            self,
            current_user_id: int,
            payload: UserLocationInput,
    ) -> Optional[UserProfile]:
        query = """
                UPDATE users
                SET latitude = $2,
                    longitude = $3,
                    location_label = $4,
                    location_consent = $5
                WHERE id = $1
                RETURNING id, email, username, first_name, last_name, is_verified, created_at,
                gender, sexual_preference, age, bio,
                fame_rating, latitude, longitude, location_label, location_consent, last_connection
                """
        return await self._fetch_one(
            UserProfile,
            query,
            current_user_id,
            payload.latitude,
            payload.longitude,
            payload.location_label,
            payload.location_consent,
        )

    def _raise_account_unique_violation(
            self,
            exc: asyncpg.UniqueViolationError,
            payload: UserAccountInput,
    ) -> None:
        haystack = f"{exc.constraint_name or ''} {exc.detail or ''}".lower()
        if "username" in haystack:
            raise UsernameAlreadyTakenException(payload.username) from None
        raise EmailAlreadyTakenException(payload.email) from None

    async def update_account(
            self,
            current_user_id: int,
            payload: UserAccountInput,
            *,
            reverify_email: bool = False,
    ) -> Optional[UserProfile]:
        if not reverify_email:
            query = f"""
                    UPDATE users
                    SET username = $2,
                        first_name = $3,
                        last_name = $4,
                        email = $5
                    WHERE id = $1
                    RETURNING {USER_COLUMNS}
                    """
            try:
                return await self._fetch_one(
                    UserProfile,
                    query,
                    current_user_id,
                    payload.username,
                    payload.first_name,
                    payload.last_name,
                    payload.email,
                )
            except asyncpg.UniqueViolationError as e:
                self._raise_account_unique_violation(e, payload)

        email_token = str(uuid.uuid4())
        query = f"""
                UPDATE users
                SET username = $2,
                    first_name = $3,
                    last_name = $4,
                    email = $5,
                    is_verified = FALSE,
                    verification_token = $6
                WHERE id = $1
                RETURNING {USER_COLUMNS}
                """
        try:
            async with self.connection.transaction():
                profile = await self._fetch_one(
                    UserProfile,
                    query,
                    current_user_id,
                    payload.username,
                    payload.first_name,
                    payload.last_name,
                    payload.email,
                    email_token,
                )
                if not profile:
                    return None
                outbox = OutboxRepository(self.connection)
                await outbox.enqueue_verification_email(
                    recipient_email=str(payload.email),
                    user_id=current_user_id,
                    verification_token=email_token,
                    max_attempts=settings.OUTBOX_MAX_ATTEMPTS,
                )
                return profile
        except asyncpg.UniqueViolationError as e:
            self._raise_account_unique_violation(e, payload)
    
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
        content = await file.read(MAX_SIZE + 1)
        if len(content) > MAX_SIZE:
            raise FileTooLargeException()
        image_type = detect_image_type(content)
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
        content = await file.read(MAX_SIZE + 1)
        if len(content) > MAX_SIZE:
            raise FileTooLargeException()
        image_type = detect_image_type(content)
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

    async def has_profile_photo(self, user_id: int) -> bool:
        row = await self.connection.fetchval(
            """
            SELECT 1 FROM user_photos
            WHERE user_id = $1 AND is_profile_photo = true
            LIMIT 1
            """,
            user_id,
        )
        return row is not None

    async def bump_fame(self, user_id: int, delta: int) -> None:
        await self.connection.execute(
            """
            UPDATE users
            SET fame_rating = LEAST(100, GREATEST(0, COALESCE(fame_rating, 0) + $2))
            WHERE id = $1
            """,
            user_id,
            delta,
        )

    async def touch_last_connection(self, user_id: int) -> None:
        await self.connection.execute(
            "UPDATE users SET last_connection = NOW() WHERE id = $1",
            user_id,
        )

    async def get_last_connection(self, user_id: int) -> Optional[datetime]:
        return await self.connection.fetchval(
            "SELECT last_connection FROM users WHERE id = $1",
            user_id,
        )

    async def change_password(
        self,
        hashed_password: str,
        current_user_id: int,
    ) -> None:
        await self.connection.execute(
            "UPDATE users SET password_hash = $2 WHERE id = $1",
            current_user_id,
            hashed_password,
        )