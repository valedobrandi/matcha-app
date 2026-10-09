import time
import uuid

import jwt
import pytest

from core.auth import SessionClaims, get_current_session, read_session_token
from core.config import settings
from core.exceptions import InvalidTokenException

SESSION_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")


def bearer(claims: dict) -> str:
    token = jwt.encode(
        {"exp": time.time() + 3600, **claims},
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )
    return f"Bearer {token}"


class SessionStoreAnswer:
    def __init__(self, active: bool) -> None:
        self.active = active

    async def fetchval(self, query, *args):
        return self.active


@pytest.mark.asyncio
async def test_should_read_the_user_and_the_session_when_the_token_names_both():
    claims = await read_session_token(bearer({"sub": "7", "sid": str(SESSION_ID)}))

    assert claims == SessionClaims(user_id=7, session_id=SESSION_ID)


@pytest.mark.asyncio
@pytest.mark.parametrize("claims", [{"sub": "7"}, {"sub": "7", "sid": "not-a-uuid"}, {"sub": "7", "sid": 5}])
async def test_should_reject_the_token_when_it_names_no_valid_session(claims):
    with pytest.raises(InvalidTokenException):
        await read_session_token(bearer(claims))


@pytest.mark.asyncio
async def test_should_reject_the_token_when_its_session_has_ended():
    with pytest.raises(InvalidTokenException):
        await get_current_session(SessionClaims(user_id=7, session_id=SESSION_ID), SessionStoreAnswer(active=False))


@pytest.mark.asyncio
async def test_should_accept_the_token_when_its_session_is_active():
    claims = SessionClaims(user_id=7, session_id=SESSION_ID)

    assert await get_current_session(claims, SessionStoreAnswer(active=True)) == claims
