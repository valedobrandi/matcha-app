from fastapi import APIRouter, Depends, Response, UploadFile, File, status
from fastapi.responses import FileResponse
import asyncpg
from core.auth import SessionClaims, get_current_session
from core.database import get_db_connection
from core.presence import get_current_user_id_and_touch
from core.upload_urls import UPLOADS_PATH, VALIDITY_WINDOW_SECONDS, upload_url_is_valid
from core.ws_hub import hub
from modules.users.repository import UPLOAD_DIR, UsersRepository
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
uploads_router = APIRouter(include_in_schema=False)


@uploads_router.get(UPLOADS_PATH + "{file_name}")
async def get_upload(file_name: str, expires: int | None = None, signature: str | None = None) -> Response:
    path = UPLOAD_DIR / file_name
    if (
        expires is None
        or signature is None
        or not upload_url_is_valid(file_name, expires, signature)
        or path.resolve().parent != UPLOAD_DIR.resolve()
        or not path.is_file()
    ):
        return Response(status_code=status.HTTP_404_NOT_FOUND)
    return FileResponse(path, headers={"Cache-Control": f"private, max-age={VALIDITY_WINDOW_SECONDS}"})

def get_users_service(
        db: asyncpg.Connection = Depends(get_db_connection)
) -> UsersService:
    return UsersService(UsersRepository(db), SocialRepository(db), hub)

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
    session: SessionClaims = Depends(get_current_session),
    service: UsersService = Depends(get_users_service),
) -> dict[str, str]:
    await service.change_password(payload, current_user_id, session.session_id)
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