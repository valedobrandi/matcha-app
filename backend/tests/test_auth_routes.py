import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from core.auth import get_current_user_id
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
