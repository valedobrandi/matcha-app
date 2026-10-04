from fastapi.testclient import TestClient
from main import app
import pytest
import datetime
import time
import jwt
from core.config import settings
from modules.users.schemas import UserProfile, UserLocationInput, UserAccountInput
from modules.users.service import UsersService
from modules.users.controller import get_users_service
from modules.users.exceptions import EmailAlreadyTakenException
from core.auth import get_current_user_id
from core.presence import get_current_user_id_and_touch
from modules.auth.controller import get_auth_service
from modules.auth.schemas import CurrentUserResponse


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

class FakeSocial:
    def __init__(self, blocked=False):
        self.blocked = blocked

    async def is_blocked_either_way(self, user_a, user_b):
        return self.blocked

    async def count_likes_received(self, target_user_id):
        return 0

    async def count_visitors(self, target_user_id):
        return 0


class FakeRepository:
    def __init__(self, users: dict):
        self.users = users
        self.tags = [1]
        self.photos = [1]
        self.raise_on_account = None

    async def get_user_by_id(self, current_user_id: int):
        return self.users.get(current_user_id)

    async def get_my_tags(self, current_user_id: int):
        return self.tags

    async def get_my_photos(self, current_user_id: int):
        return self.photos

    async def update_location(self, current_user_id: int, payload: UserLocationInput):
        user = self.users.get(current_user_id)
        if not user:
            return None
        updated = user.model_copy(
            update={
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "location_label": payload.location_label,
                "location_consent": payload.location_consent,
            }
        )
        self.users[current_user_id] = updated
        return updated

    async def update_account(
        self,
        current_user_id: int,
        payload: UserAccountInput,
        *,
        reverify_email: bool = False,
    ):
        if self.raise_on_account is not None:
            raise self.raise_on_account
        user = self.users.get(current_user_id)
        if not user:
            return None
        updated = user.model_copy(
            update={
                "username": payload.username,
                "first_name": payload.first_name,
                "last_name": payload.last_name,
                "email": payload.email,
                "is_verified": False if reverify_email else user.is_verified,
            }
        )
        self.users[current_user_id] = updated
        return updated

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
        fame_rating = 0,
        location_consent = False,
    )

@pytest.fixture
def override_service(fake_user):
    fake_repo = FakeRepository({1: fake_user})
    fake_service = UsersService(fake_repo, FakeSocial())

    app.dependency_overrides[get_users_service] = lambda: fake_service
    app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
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
        assert body["fame_rating"] == 0
        assert body["location_consent"] is False
        assert "latitude" in body
        assert "longitude" in body
        assert "location_label" in body
        assert "last_connection" in body


class TestPatchLocation:
    def test_location_update_succeeds(self, override_service):
        token = make_token(user_id=1)
        response = client.patch(
            "/users/me/location",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 48.85,
                "longitude": 2.35,
                "location_label": "Paris",
                "location_consent": True,
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["latitude"] == 48.85
        assert body["longitude"] == 2.35
        assert body["location_label"] == "Paris"
        assert body["location_consent"] is True

    def test_location_update_rejects_without_consent(self, override_service):
        token = make_token(user_id=1)
        response = client.patch(
            "/users/me/location",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 48.85,
                "longitude": 2.35,
                "location_consent": False,
            },
        )
        assert response.status_code == 400
        assert response.json()["code"] == "INVALID_LOCATION"


class TestPatchAccount:
    def test_account_update_succeeds(self, override_service):
        token = make_token(user_id=1)
        response = client.patch(
            "/users/me/account",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "aaa",
                "first_name": "New",
                "last_name": "Name",
                "email": "aaa@gmail.com",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["first_name"] == "New"
        assert body["last_name"] == "Name"
        assert body["email"] == "aaa@gmail.com"
        assert body["is_verified"] is True

    def test_account_email_change_marks_unverified(self, override_service):
        token = make_token(user_id=1)
        response = client.patch(
            "/users/me/account",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "username": "aaa",
                "first_name": "Ann",
                "last_name": "MOMO",
                "email": "new@example.com",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["email"] == "new@example.com"
        assert body["is_verified"] is False

    def test_account_update_email_taken(self, fake_user):
        fake_repo = FakeRepository({1: fake_user})
        fake_repo.raise_on_account = EmailAlreadyTakenException("taken@example.com")
        fake_service = UsersService(fake_repo, FakeSocial())
        app.dependency_overrides[get_users_service] = lambda: fake_service
        app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
        try:
            token = make_token(user_id=1)
            response = client.patch(
                "/users/me/account",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "username": "aaa",
                    "first_name": "Ann",
                    "last_name": "MOMO",
                    "email": "taken@example.com",
                },
            )
        finally:
            app.dependency_overrides.clear()
        assert response.status_code == 409
        assert response.json()["code"] == "EMAIL_TAKEN"

    def test_location_rejects_out_of_range_coords(self, override_service):
        token = make_token(user_id=1)
        response = client.patch(
            "/users/me/location",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "latitude": 999,
                "longitude": 2.35,
                "location_consent": True,
            },
        )
        assert response.status_code == 422


class TestAuthMeStaysThin:
    def test_auth_me_omits_location_and_fame(self):
        class FakeAuthService:
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
        app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
        try:
            response = client.get("/auth/me")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        body = response.json()
        assert "fame_rating" not in body
        assert "latitude" not in body
        assert "longitude" not in body
        assert "location_label" not in body
        assert "location_consent" not in body
        assert "profile_completed" in body


class TestGetPublicProfile:
    def test_should_return_401_when_unauthenticated(self):
        response = client.get("/users/2")
        assert response.status_code == 401

    def test_should_return_public_projection_when_authenticated(self, override_service, fake_user):
        target = fake_user.model_copy(update={
            "id": 2,
            "email": "secret@example.com",
            "username": "bob",
            "fame_rating": 12,
            "location_label": "Paris, France",
        })
        override_service.repository.users[2] = target
        override_service.repository.tags = []
        override_service.repository.photos = []

        token = make_token(1)
        response = client.get("/users/2", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == 2
        assert body["username"] == "bob"
        assert body["fame_rating"] == 12
        assert body["location_label"] == "Paris, France"
        assert "email" not in body
        assert "is_online" in body

    def test_should_return_403_when_blocked(self, override_service, fake_user):
        override_service.repository.users[2] = fake_user.model_copy(update={"id": 2})

        override_service.social_repo = FakeSocial(blocked=True)
        token = make_token(1)
        response = client.get("/users/2", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403

    def test_should_return_404_when_missing(self, override_service):
        token = make_token(1)
        response = client.get("/users/99", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404
        assert response.json()["code"] == "TARGET_USER_NOT_FOUND"
