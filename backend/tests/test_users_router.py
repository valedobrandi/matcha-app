from fastapi.testclient import TestClient
from main import app
import pytest
import datetime
import time
import jwt
from core.config import settings
from modules.users.schemas import UserProfile
from modules.users.service import UsersService
from modules.users.controller import get_users_service


client = TestClient(app)

def make_token(user_id: int, expired: bool = False) -> str:
    now = datetime.datetime.now(datetime.UTC)
    exp = time.time() + (-10 if expired else 36000)
    payload = {
        "sub": str(user_id),
        "exp": exp,
        "iat": int(now.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )

class FakeRepository:
    def __init__(self, users: dict):
        self.users = users
        self.tags = [1]
        self.photos = [1]

    async def get_user_by_id(self, current_user_id: int):
        return self.users.get(current_user_id)

    async def get_my_tags(self, current_user_id: int):
        return self.tags

    async def get_my_photos(self, current_user_id: int):
        return self.photos

@pytest.fixture
def fake_user():
    return UserProfile(
        id = 1,
        email = "aaa@gmail.com",
        username = "aaa",
        first_name = "Ann",
        last_name = "MOMO",
        is_verified = True,
        created_at = datetime.datetime.now(datetime.UTC),
        gender = "female",
        sexual_preference = "man",
        age = 24,
        bio = "hello",
    )

@pytest.fixture
def override_service(fake_user):
    fake_repo = FakeRepository({1: fake_user})
    fake_service = UsersService(fake_repo)

    app.dependency_overrides[get_users_service] = lambda: fake_service
    yield fake_service
    app.dependency_overrides.clear()

class TestGetMe:
    def test_no_auth_header(self):
        response = client.get("/users/me")
        assert response.status_code == 401
        assert response.json()["code"] == "MISSING_TOKEN"

    def test_invalid_auth_header(self):
        response = client.get("/users/me", headers={"Authorization" : "Basics xxx"})
        assert response.status_code == 401
        assert response.json()["code"] == "INVALID_TOKEN"

    def test_empty_token(self):
        response = client.get("/users/me", headers={"Authorization" : "Bearer "})
        assert response.status_code == 401
        assert response.json()["code"] == "INVALID_TOKEN"
    
    def test_incorrect_token_format(self):
        response = client.get("/users/me", headers={"Authorization" : "Bearer no_valid_token"})
        assert response.status_code == 401
        assert response.json()["code"] == "INVALID_TOKEN"
    
    def test_expired_token(self):
        token = make_token(user_id=1, expired=True)
        response = client.get("/users/me", headers={"Authorization" : f"Bearer {token}"})
        assert response.status_code == 401
        assert response.json()["code"] == "EXPIRED_TOKEN"

    def test_user_not_found(self, override_service):
        token = make_token(user_id=222)
        response = client.get("/users/me", headers={"Authorization" : f"Bearer {token}"})
        assert response.status_code == 404
        assert response.json()["code"] == "USER_NOT_FOUND"

    def test_user_found(self, override_service, fake_user):
        token = make_token(user_id=1)
        response = client.get("/users/me", headers={"Authorization" : f"Bearer {token}"})
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == fake_user.id
        assert body["email"] == fake_user.email
        assert body["is_profile_completed"] is True
