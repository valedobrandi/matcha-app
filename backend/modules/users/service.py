from modules.users.repository import UsersRepository
from modules.users.schemas import (
    UserProfile,
    PhotoOut
)
from modules.users.exceptions import UserNotFoundException
from modules.tags.schemas import TagInput, TagOut
from modules.tags.exceptions import TagContentProfanity
from modules.tags.service import profanity
from typing import List
from fastapi import UploadFile


class UsersService:
    def __init__(
            self,
            repository: UsersRepository
    ):
        self.repository = repository
    
    async def get_profile(
            self,
            current_user_id: int
            ) -> UserProfile:
        current_user = await self.repository.get_user_by_id(current_user_id)
        if not current_user:
            raise UserNotFoundException()
        
        tags = await self.repository.get_my_tags(current_user_id)
        photos = await self.repository.get_my_photos(current_user_id)

        is_completed = (
            current_user.bio is not None
            and current_user.age is not None
            and current_user.gender is not None
            and current_user.sexual_preference is not None
            and len(tags) > 0
            and len(photos) > 0
        )
        
        return current_user.model_copy(update={"is_profile_completed": is_completed})
    
    async def patch_profile(
            self,
            current_user_id,
            payload
            ) -> UserProfile:
        user_profile = await self.repository.patch_user_profile(current_user_id, payload)
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
