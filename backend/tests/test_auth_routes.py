import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from core.auth import SessionClaims, get_current_session, get_current_user_id
from modules.auth.controller import get_auth_service
from modules.auth.schemas import CurrentUserResponse


@pytest.mark.asyncio
async def test_get_me_without_token_returns_401() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/auth/me")

    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "MISSING_TOKEN"


@pytest.mark.asyncio
async def test_should_refuse_to_log_out_when_no_token_is_sent() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/auth/logout")

    assert (response.status_code, response.json()["code"]) == (401, "MISSING_TOKEN")


@pytest.mark.asyncio
async def test_should_end_the_callers_session_when_they_log_out() -> None:
    class FakeService:
        def __init__(self) -> None:
            self.ended = []

        async def logout(self, session_id, user_id) -> None:
            self.ended.append((session_id, user_id))

    fake = FakeService()
    session = SessionClaims(user_id=1, session_id=uuid.UUID("00000000-0000-4000-8000-000000000001"))
    app.dependency_overrides[get_current_session] = lambda: session
    app.dependency_overrides[get_auth_service] = lambda: fake
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/auth/logout")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert fake.ended == [(session.session_id, 1)]


@pytest.mark.asyncio
async def test_get_me_returns_profile_completed_from_auth_contract() -> None:
    class FakeService:
        async def get_current_user(self, user_id: int) -> CurrentUserResponse:
            return CurrentUserResponse(
                id=1,
                username="alice",
                email="a@b.com",
                first_name="A",
                last_name="B",
                email_verified=True,
                profile_completed=True,
                has_password=True,
            )

    app.dependency_overrides[get_current_user_id] = lambda: 1
    app.dependency_overrides[get_auth_service] = lambda: FakeService()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/auth/me")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["profile_completed"] is True
