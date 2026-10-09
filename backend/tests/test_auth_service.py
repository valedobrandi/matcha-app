import uuid

import jwt
import pytest

from core.config import settings
from modules.auth.exceptions import (
    AccountNotVerifiedException,
    InvalidCredentialsException,
    InvalidTokenException,
)
from modules.auth.schemas import LoginInput, UserRecord
from modules.auth.service import AuthService
from modules.users.repository import UsersRepository


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


SESSION_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


class FakeSessions:
    def __init__(self) -> None:
        self.opened: list[int] = []
        self.revoked: list[uuid.UUID] = []

    async def open(self, user_id, lifetime) -> uuid.UUID:
        self.opened.append(user_id)
        return SESSION_ID

    async def revoke(self, session_id) -> None:
        self.revoked.append(session_id)


class FakeHub:
    def __init__(self) -> None:
        self.ended: list[tuple[int, list[uuid.UUID]]] = []

    async def end_sessions(self, user_id, session_ids) -> None:
        self.ended.append((user_id, list(session_ids)))


def test_hash_password_returns_bcrypt_hash() -> None:
    service = AuthService(FakeRepository(), FakeHub())
    hashed = service._hash_password("Password1")
    assert hashed.startswith("$2")


@pytest.mark.asyncio
async def test_should_open_a_session_and_name_it_in_the_token_when_a_token_is_issued() -> None:
    sessions = FakeSessions()
    service = AuthService(FakeRepository(), FakeHub(), sessions=sessions)

    token = await service.issue_token(7)

    claims = jwt.decode(token, settings.JWT_SECRET.get_secret_value(), algorithms=[settings.JWT_ALGORITHM])
    assert sessions.opened == [7]
    assert (claims["sub"], claims["sid"]) == ("7", str(SESSION_ID))


@pytest.mark.asyncio
async def test_should_revoke_the_session_and_close_its_sockets_when_the_user_logs_out() -> None:
    sessions, hub = FakeSessions(), FakeHub()
    service = AuthService(FakeRepository(), hub, sessions=sessions)

    await service.logout(SESSION_ID, 7)

    assert sessions.revoked == [SESSION_ID]
    assert hub.ended == [(7, [SESSION_ID])]


@pytest.mark.asyncio
async def test_login_user_raises_when_unverified() -> None:
    service = AuthService(FakeRepository(), FakeHub())
    user = UserRecord(
        id=1,
        email="a@b.com",
        username="alice",
        first_name="A",
        last_name="B",
        password_hash=service._hash_password("Password1"),
        is_verified=False,
    )
    service = AuthService(FakeRepository(user), FakeHub())
    with pytest.raises(AccountNotVerifiedException):
        await service.login_user(LoginInput(username="alice", password="Password1"))


@pytest.mark.asyncio
async def test_should_reject_the_credentials_without_telling_the_account_is_unverified_when_the_password_is_wrong() -> None:
    service = AuthService(FakeRepository(), FakeHub())
    user = UserRecord(
        id=1,
        email="a@b.com",
        username="alice",
        first_name="A",
        last_name="B",
        password_hash=service._hash_password("Password1"),
        is_verified=False,
    )
    service = AuthService(FakeRepository(user), FakeHub())
    with pytest.raises(InvalidCredentialsException):
        await service.login_user(LoginInput(username="alice", password="Wrong1"))


@pytest.mark.asyncio
async def test_get_current_user_raises_when_user_missing() -> None:
    service = AuthService(FakeRepository(), FakeHub())
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
    service = AuthService(FakeRepository(user), FakeHub())

    async def fake_is_profile_completed(self, user_id: int) -> bool:
        return True

    monkeypatch.setattr(UsersRepository, "is_profile_completed", fake_is_profile_completed)

    current_user = await service.get_current_user(1)

    assert current_user.id == 1
    assert current_user.username == "alice"
    assert current_user.email_verified is True
    assert current_user.profile_completed is True
    assert current_user.has_password is True
