import pytest
import jwt
from core.config import settings
from datetime import datetime, UTC
from modules.users.schemas import UserProfile
from modules.users.service import UsersService
from modules.users.exceptions import UserNotFoundException


class   FakeRepository:
    def __init__(self, user):
        self.user = user
        self.current_user_id = None

    async def get_user_by_id(self, user_id: int):
        self.current_user_id = user_id
        return self.user

@pytest.mark.asyncio
async def test_get_profile_when_user_found():
    user = UserProfile(
        id = 1,
        email = "aaa@gmail.com",
        username = "aaa",
        first_name = "Ann",
        last_name = "MOMO",
        is_verified = True,
        created_at = datetime.now(UTC)
    )
    repo = FakeRepository(user)
    service = UsersService(repo)

    res = await service.get_profile(1)
    assert res == user
    assert repo.current_user_id == 1

@pytest.mark.asyncio
async def test_get_profile_when_user_not_found():
    repo = FakeRepository(None)
    service = UsersService(repo)

    with pytest.raises(UserNotFoundException):
        await service.get_profile(12)