from fastapi import APIRouter, Depends, UploadFile, File, status
import asyncpg
from core.database import get_db_connection
from core.presence import get_current_user_id_and_touch
from modules.users.repository import UsersRepository
from modules.users.service import UsersService
from modules.users.schemas import (
    UserProfile,
    PublicProfile,
    UserProfileInput,
    PhotoOut,
    UserLocationInput,
    UserAccountInput,
    EditProfileInput,
    PasswordChangeInput
)
from modules.social.repository import SocialRepository
from modules.tags.schemas import TagOut, TagInput
from typing import List
from core.api_model import RowIdPath


users_router = APIRouter(prefix="/users", tags=["users"])

def get_users_service(
        db: asyncpg.Connection = Depends(get_db_connection)
) -> UsersService:
    return UsersService(UsersRepository(db), SocialRepository(db))

@users_router.get(
    "/me", response_model=UserProfile
)
async def get_me(
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
    ) -> UserProfile:
    return await service.get_profile(current_user_id)

@users_router.patch(
    "/me", response_model=UserProfile
)
async def patch_me(
    payload: UserProfileInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
    ) -> UserProfile:
    return await service.patch_profile(current_user_id, payload)

@users_router.patch("/me/location", response_model=UserProfile)
async def patch_me_location(
    payload: UserLocationInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service),
) -> UserProfile:
    return await service.update_location(current_user_id, payload)

@users_router.patch("/me/account", response_model=UserProfile)
async def patch_me_account(
    payload: UserAccountInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service),
) -> UserProfile:
    return await service.update_account(current_user_id, payload)

@users_router.post(
    "/me/tags", response_model=TagOut
)
async def add_one_profile_tag(
    tag_input: TagInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> TagOut:
    return await service.add_one_profile_tag(current_user_id, tag_input)

@users_router.get(
    "/me/tags",
    response_model=List[TagOut]
)
async def get_my_tags(
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> List[TagOut]:
    return await service.get_my_tags(current_user_id)

@users_router.delete("/me/tags/{tag_id}")
async def delete_one_tag(
    tag_id: RowIdPath,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> None:
    return await service.delete_one_tag(tag_id, current_user_id)

@users_router.get(
    "/me/photos",
    response_model=List[PhotoOut]
)
async def get_my_photos(
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> List[PhotoOut]:
    return await service.get_my_photos(current_user_id)

@users_router.post(
    "/me/photos",
    response_model=PhotoOut
)
async def upload_photo(
    file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> PhotoOut:
    return await service.upload_photo(current_user_id, file)

@users_router.delete("/me/photos/{photo_id}")
async def delete_my_photo(
    photo_id: RowIdPath,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> None:
    return await service.delete_my_photo(photo_id, current_user_id)

@users_router.patch("/me/photos/{photo_id}")
async def set_photo_as_avatar(
    photo_id: RowIdPath,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> None:
    return await service.set_photo_as_avatar(photo_id, current_user_id)

@users_router.put(
        "/me/photos/{photo_id}",
        response_model=PhotoOut
)
async def patch_photo_by_new(
    photo_id: RowIdPath,
    file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
) -> PhotoOut:
    return await service.patch_photo_by_new(photo_id, file, current_user_id)

@users_router.patch(
    "/me/profile", response_model=UserProfile
)
async def patch_me(
    payload: EditProfileInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service)
    ) -> UserProfile:
    return await service.edit_profile(current_user_id, payload)

@users_router.patch(
    "/me/password-change",
    status_code=status.HTTP_200_OK,
)
async def change_password(
    payload: PasswordChangeInput,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service),
) -> dict[str, str]:
    await service.change_password(payload, current_user_id)
    return {"message": "Password changed successfully."}

@users_router.get(
    "/{user_id}",
    response_model=PublicProfile,
)
async def get_public_profile(
    user_id: RowIdPath,
    current_user_id: int = Depends(get_current_user_id_and_touch),
    service: UsersService = Depends(get_users_service),
) -> PublicProfile:
    return await service.get_public_profile(current_user_id, user_id)