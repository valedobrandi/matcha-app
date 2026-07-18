import pytest
from datetime import datetime, UTC
from modules.users.schemas import UserProfile
from modules.users.service import UsersService
from modules.users.exceptions import UserNotFoundException


class FakeRepository:
    def __init__(self, user, tags=None, photos=None):
        self.user = user
        self.tags = tags or []
        self.photos = photos or []
        self.current_user_id = None

    async def get_user_by_id(self, user_id: int):
        self.current_user_id = user_id
        return self.user

    async def get_my_tags(self, user_id: int):
        return self.tags

    async def get_my_photos(self, user_id: int):
        return self.photos


def _complete_user(**overrides) -> UserProfile:
    data = dict(
        id=1,
        email="aaa@gmail.com",
        username="aaa",
        first_name="Ann",
        last_name="MOMO",
        is_verified=True,
        created_at=datetime.now(UTC),
        gender="female",
        sexual_preference="man",
        age=24,
        bio="hello",
    )
    data.update(overrides)
    return UserProfile(**data)


@pytest.mark.asyncio
async def test_get_profile_when_user_found():
    user = _complete_user()
    repo = FakeRepository(user, tags=[{"id": 1}], photos=[{"id": 1}])
    service = UsersService(repo)

    res = await service.get_profile(1)
    assert res.id == user.id
    assert res.is_profile_completed is True
    assert repo.current_user_id == 1


@pytest.mark.asyncio
async def test_get_profile_is_incomplete_without_photos() -> None:
    user = _complete_user()
    repo = FakeRepository(user, tags=[{"id": 1}], photos=[])
    service = UsersService(repo)

    res = await service.get_profile(1)
    assert res.is_profile_completed is False


@pytest.mark.asyncio
async def test_get_profile_when_user_not_found():
    repo = FakeRepository(None)
    service = UsersService(repo)

    with pytest.raises(UserNotFoundException):
        await service.get_profile(12)
