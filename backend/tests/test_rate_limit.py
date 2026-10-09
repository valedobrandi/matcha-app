import pytest
from httpx import ASGITransport, AsyncClient

from core.rate_limit import Limit, RateLimiter, TooManyRequestsException, get_rate_limiter
from main import app
from modules.auth.controller import (
    LOGIN_FAILURES_PER_ACCOUNT,
    RECOVERY_PER_EMAIL,
    REGISTER_PER_CLIENT,
    get_auth_service,
)
from modules.auth.exceptions import InvalidCredentialsException

THREE_PER_MINUTE = Limit(attempts=3, per_seconds=60)


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_should_refuse_the_attempt_and_say_when_to_retry_when_the_limit_is_reached():
    clock = Clock()
    limiter = RateLimiter(clock)
    for _ in range(3):
        limiter.hit("key", THREE_PER_MINUTE)
        clock.now += 10

    with pytest.raises(TooManyRequestsException) as refused:
        limiter.hit("key", THREE_PER_MINUTE)

    assert refused.value.retry_after == 30


def test_should_allow_again_once_the_attempts_leave_the_window():
    clock = Clock()
    limiter = RateLimiter(clock)
    for _ in range(3):
        limiter.hit("key", THREE_PER_MINUTE)

    clock.now += 60

    limiter.hit("key", THREE_PER_MINUTE)


def test_should_count_each_key_on_its_own():
    limiter = RateLimiter(Clock())
    for _ in range(3):
        limiter.hit("first", THREE_PER_MINUTE)

    limiter.hit("second", THREE_PER_MINUTE)


def test_should_not_count_an_attempt_that_is_only_checked():
    limiter = RateLimiter(Clock())
    for _ in range(5):
        limiter.check("key", THREE_PER_MINUTE)

    limiter.hit("key", THREE_PER_MINUTE)


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
async def test_should_not_count_successful_logins_against_the_account(fresh_limiter):
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
