from datetime import datetime, timezone
from modules.users.repository import UsersRepository
from modules.users.schemas import (
    UserProfile,
    PublicProfile,
    PhotoOut,
    UserLocationInput,
    UserAccountInput,
    UserProfileInput,
    EditProfileInput,
    PasswordChangeInput
)
from modules.users.exceptions import (
    UserNotFoundException,
    TargetUserNotFoundException,
    InvalidLocationException,
)
from modules.auth.exceptions import (
    InvalidCredentialsException,
    NoPasswordSetException,
    AccountNotVerifiedException,
)
from modules.social.exceptions import BlockedException
from modules.tags.schemas import TagInput, TagOut
from modules.tags.exceptions import TagContentProfanity
from modules.tags.service import profanity
from core.presence import ONLINE_WINDOW_SECONDS
from typing import List, Optional, Protocol
from fastapi import UploadFile
import bcrypt


class ProfileSocialReads(Protocol):
    async def is_blocked_either_way(self, user_a: int, user_b: int) -> bool: ...
    async def count_likes_received(self, target_user_id: int) -> int: ...
    async def count_visitors(self, target_user_id: int) -> int: ...


class UsersService:
    def __init__(
            self,
            repository: UsersRepository,
            social_repo: ProfileSocialReads,
    ):
        self.repository = repository
        self.social_repo = social_repo

    async def get_profile(
            self,
            current_user_id: int
            ) -> UserProfile:
        current_user = await self.repository.get_user_by_id(current_user_id)
        if not current_user:
            raise UserNotFoundException()

        is_completed = await self.repository.is_profile_completed(current_user_id)
        likes_received_count = await self.social_repo.count_likes_received(current_user_id)
        visitors_count = await self.social_repo.count_visitors(current_user_id)

        return current_user.model_copy(update={
            "is_profile_completed": is_completed,
            "likes_received_count": likes_received_count,
            "visitors_count": visitors_count,
            })

    async def get_public_profile(
            self,
            viewer_id: int,
            target_id: int,
    ) -> PublicProfile:
        if await self.social_repo.is_blocked_either_way(viewer_id, target_id):
            raise BlockedException()
        target = await self.repository.get_user_by_id(target_id)
        if not target:
            raise TargetUserNotFoundException()

        tags = await self.repository.get_my_tags(target_id)
        photos = await self.repository.get_my_photos(target_id)
        likes_received_count = await self.social_repo.count_likes_received(target_id)
        visitors_count = await self.social_repo.count_visitors(target_id)

        return PublicProfile(
            id=target.id,
            username=target.username,
            first_name=target.first_name,
            last_name=target.last_name,
            gender=target.gender,
            sexual_preference=target.sexual_preference,
            age=target.age,
            bio=target.bio,
            fame_rating=target.fame_rating,
            location_label=target.location_label,
            last_connection=target.last_connection,
            is_online=self._is_online(target.last_connection),
            tags=tags or [],
            photos=photos or [],
            likes_received_count=likes_received_count,
            visitors_count=visitors_count,
        )

    @staticmethod
    def _is_online(last_connection: Optional[datetime]) -> bool:
        if last_connection is None:
            return False
        if last_connection.tzinfo is None:
            last_connection = last_connection.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - last_connection).total_seconds()
        return age <= ONLINE_WINDOW_SECONDS

    async def patch_profile(
            self,
            current_user_id: int,
            payload: UserProfileInput
            ) -> UserProfile:
        user_profile = await self.repository.patch_user_profile(current_user_id, payload)
        if not user_profile:
            raise UserNotFoundException()
        return user_profile

    async def update_location(
            self,
            current_user_id: int,
            payload: UserLocationInput,
    ) -> UserProfile:
        if not payload.location_consent:
            raise InvalidLocationException()
        user_profile = await self.repository.update_location(current_user_id, payload)
        if not user_profile:
            raise UserNotFoundException()
        return user_profile

    async def update_account(
            self,
            current_user_id: int,
            payload: UserAccountInput,
    ) -> UserProfile:
        current = await self.repository.get_user_by_id(current_user_id)
        if not current:
            raise UserNotFoundException()
        email_changed = str(current.email).lower() != str(payload.email).lower()
        user_profile = await self.repository.update_account(
            current_user_id,
            payload,
            reverify_email=email_changed,
        )
        if not user_profile:
            raise UserNotFoundException()
        return user_profile
    
    async def edit_profile(
            self,
            current_user_id: int,
            payload: EditProfileInput
            ) -> UserProfile:
        user_profile = await self.repository.edit_profile(current_user_id, payload)
        if not user_profile:
            raise UserNotFoundException()
        return user_profile
    
    async def add_one_profile_tag(
            self,
            current_user_id: int,
            tag_input: TagInput
    ) -> TagOut:
        if profanity.contains_profanity(tag_input.name):
            raise TagContentProfanity()
        return await self.repository.add_one_tag(current_user_id, tag_input)

    async def get_my_tags(
            self,
            current_user_id: int
    ) -> List[TagOut]:
        return await self.repository.get_my_tags(current_user_id)

    async def delete_one_tag(
            self,
            tag_id: int,
            current_user_id: int,
    ) -> None:
        return await self.repository.delete_one_tag(tag_id, current_user_id)
    
    async def get_my_photos(
            self,
            current_user_id: int,
        ) -> List[PhotoOut]:
        return await self.repository.get_my_photos(current_user_id)
    
    async def upload_photo(
            self, 
            current_user_id: int, 
            file: UploadFile
    ) -> PhotoOut:
        return await self.repository.upload_photo(current_user_id, file)
    
    async def delete_my_photo(
            self,
            photo_id: int,
            current_user_id: int
        ) -> None:
        return await self.repository.delete_my_photo(photo_id, current_user_id)
    
    async def set_photo_as_avatar(
            self,
            photo_id: int,
            current_user_id: int
        ) -> None:
        return await self.repository.set_photo_as_avatar(photo_id, current_user_id)
    
    async def patch_photo_by_new(
            self,
            photo_id: int,
            file: UploadFile,
            current_user_id: int
        ) -> PhotoOut:
        return await self.repository.patch_photo_by_new(photo_id, file, current_user_id)

    async def change_password(
        self,
        passwords: PasswordChangeInput,
        current_user_id: int,
) -> None:
        from modules.auth.service import AuthService
        from modules.auth.repository import AuthRepository
        user = await AuthRepository(self.repository.connection).find_by_id(current_user_id)
        if not user:
            raise InvalidCredentialsException()
        if not user.password_hash:
            raise NoPasswordSetException()
        if not user.is_verified:
            raise AccountNotVerifiedException()
        if not bcrypt.checkpw(passwords.current_password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise InvalidCredentialsException()

        hashed_password = AuthService(AuthRepository(self.repository.connection)).hash_password(passwords.new_password)
        await self.repository.change_password(hashed_password, current_user_id)