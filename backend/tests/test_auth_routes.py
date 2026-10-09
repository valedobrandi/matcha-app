import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from core.auth import SessionClaims, get_current_session, get_current_user_id
from core.rate_limit import RateLimiter, get_rate_limiter
from modules.auth.controller import (
    LOGIN_FAILURES_PER_ACCOUNT,
    RECOVERY_PER_EMAIL,
    REGISTER_PER_CLIENT,
    get_auth_service,
)
from modules.auth.exceptions import InvalidCredentialsException
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


class RefusingService:
    async def login_user(self, payload):
        raise InvalidCredentialsException()


class AcceptingService:
    async def login_user(self, payload):
        return "token"

    async def request_password_reset(self, email):
        return None

    async def register_user(self, payload):
        return None


@pytest.fixture
def fresh_limiter():
    limiter = RateLimiter()
    app.dependency_overrides[get_rate_limiter] = lambda: limiter
    yield limiter
    app.dependency_overrides.clear()


async def post(path: str, body: dict):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.post(path, json=body)


@pytest.mark.asyncio
async def test_should_answer_429_with_retry_after_when_an_account_has_too_many_failed_logins(fresh_limiter):
    app.dependency_overrides[get_auth_service] = RefusingService
    body = {"username": "alice", "password": "Wrong1234"}
    for _ in range(LOGIN_FAILURES_PER_ACCOUNT.attempts):
        assert (await post("/auth/login", body)).status_code == 401

    refused = await post("/auth/login", body)

    assert (refused.status_code, refused.json()["code"]) == (429, "TOO_MANY_REQUESTS")
    assert int(refused.headers["Retry-After"]) > 0


@pytest.mark.asyncio
async def test_should_keep_counting_failures_apart_when_two_usernames_differ_only_in_case(fresh_limiter):
    app.dependency_overrides[get_auth_service] = RefusingService
    for _ in range(LOGIN_FAILURES_PER_ACCOUNT.attempts):
        assert (await post("/auth/login", {"username": "alice", "password": "Wrong1234"})).status_code == 401

    response = await post("/auth/login", {"username": "Alice", "password": "Wrong1234"})

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_should_not_count_logins_against_the_account_when_they_succeed(fresh_limiter):
    app.dependency_overrides[get_auth_service] = AcceptingService
    body = {"username": "alice", "password": "Right1234"}

    responses = [await post("/auth/login", body) for _ in range(LOGIN_FAILURES_PER_ACCOUNT.attempts + 2)]

    assert {response.status_code for response in responses} == {200}


@pytest.mark.asyncio
async def test_should_answer_429_when_one_email_asks_for_too_many_reset_links(fresh_limiter):
    app.dependency_overrides[get_auth_service] = AcceptingService
    body = {"email": "alice@example.com"}
    for _ in range(RECOVERY_PER_EMAIL.attempts):
        assert (await post("/auth/forgot-password", body)).status_code == 200

    assert (await post("/auth/forgot-password", body)).status_code == 429


@pytest.mark.asyncio
async def test_should_refuse_before_building_the_service_when_one_client_registers_too_often(fresh_limiter):
    built = []

    def counting_service():
        built.append(True)
        return AcceptingService()

    app.dependency_overrides[get_auth_service] = counting_service

    def register_body(n: int) -> dict:
        return {"email": f"u{n}@example.com", "username": f"u{n}", "first_name": "A", "last_name": "B", "password": "Zq9Xv7Lm2Kp"}

    for n in range(REGISTER_PER_CLIENT.attempts):
        assert (await post("/auth/register", register_body(n))).status_code == 201

    refused = await post("/auth/register", register_body(99))

    assert refused.status_code == 429
    assert len(built) == REGISTER_PER_CLIENT.attempts
