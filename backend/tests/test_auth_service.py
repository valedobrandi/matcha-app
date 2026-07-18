import pytest

from modules.auth.exceptions import (
    AccountNotVerifiedException,
    InvalidTokenException,
)
from modules.auth.schemas import LoginInput, UserRecord
from modules.auth.service import AuthService
from modules.users.service import UsersService


class FakeRepository:
    def __init__(self, user: UserRecord | None = None) -> None:
        self.user = user
        self.connection = object()

    async def find_by_username(self, username: str) -> UserRecord | None:
        if self.user and self.user.username == username:
            return self.user
        return None

    async def find_by_id(self, user_id: int) -> UserRecord | None:
        if self.user and self.user.id == user_id:
            return self.user
        return None


def test_hash_password_returns_bcrypt_hash() -> None:
    service = AuthService(FakeRepository())
    hashed = service._hash_password("Password1")
    assert hashed.startswith("$2")


def test_generate_jwt_token_returns_string() -> None:
    service = AuthService(FakeRepository())
    token = service.generate_jwt_token(1)
    assert isinstance(token, str)
    assert len(token) > 0


@pytest.mark.asyncio
async def test_login_user_raises_when_unverified() -> None:
    service = AuthService(FakeRepository())
    user = UserRecord(
        id=1,
        email="a@b.com",
        username="alice",
        first_name="A",
        last_name="B",
        password_hash=service._hash_password("Password1"),
        is_verified=False,
    )
    service = AuthService(FakeRepository(user))
    with pytest.raises(AccountNotVerifiedException):
        await service.login_user(LoginInput(username="alice", password="Password1"))


@pytest.mark.asyncio
async def test_get_current_user_raises_when_user_missing() -> None:
    service = AuthService(FakeRepository())
    with pytest.raises(InvalidTokenException):
        await service.get_current_user(999)


@pytest.mark.asyncio
async def test_get_current_user_returns_session_contract(monkeypatch) -> None:
    user = UserRecord(
        id=1,
        email="a@b.com",
        username="alice",
        first_name="A",
        last_name="B",
        password_hash="hashed",
        is_verified=True,
    )
    service = AuthService(FakeRepository(user))

    async def fake_get_profile(self, user_id: int):
        return type("Profile", (), {"is_profile_completed": True})()

    monkeypatch.setattr(UsersService, "get_profile", fake_get_profile)

    current_user = await service.get_current_user(1)

    assert current_user.id == 1
    assert current_user.username == "alice"
    assert current_user.email_verified is True
    assert current_user.profile_completed is True
    assert current_user.has_password is True
