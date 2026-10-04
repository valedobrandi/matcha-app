from datetime import datetime, UTC
from fastapi.testclient import TestClient
from main import app
import pytest
import time
import jwt
from core.config import settings
from core.auth import get_current_user_id
from core.presence import get_current_user_id_and_touch
from modules.notifications.controller import get_notifications_service
from modules.notifications.schemas import NotificationOut, UnreadCountOut, NotificationOkResponse
from modules.notifications.exceptions import NotificationNotFoundException

client = TestClient(app)


def make_token(user_id: int) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "exp": time.time() + 36000,
            "iat": int(now.timestamp()),
        },
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


class FakeNotificationsService:
    def __init__(self):
        self.rows = [
            NotificationOut(
                id=1,
                type="liked",
                actor_id=2,
                entity_id=None,
                read_at=None,
                created_at=datetime.now(UTC),
            )
        ]

    async def list_for_user(self, user_id, limit, offset):
        return self.rows[offset:offset + limit]

    async def unread_count(self, user_id):
        return UnreadCountOut(unread_count=1)

    async def mark_read(self, user_id, notification_id):
        if notification_id != 1:
            raise NotificationNotFoundException()
        return NotificationOkResponse()

    async def mark_all_read(self, user_id):
        return NotificationOkResponse()


@pytest.fixture
def override_notifications():
    fake = FakeNotificationsService()
    app.dependency_overrides[get_notifications_service] = lambda: fake
    app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
    yield fake
    app.dependency_overrides.clear()


class TestNotificationsRouter:
    def test_should_return_401_when_unauthenticated(self):
        assert client.get("/notifications").status_code == 401

    def test_should_list_when_authenticated(self, override_notifications):
        token = make_token(1)
        response = client.get(
            "/notifications", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        body = response.json()
        assert body[0]["type"] == "liked"
        assert body[0]["actor_id"] == 2
        assert "user_id" not in body[0]

    def test_should_return_unread_count(self, override_notifications):
        token = make_token(1)
        response = client.get(
            "/notifications/unread-count",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["unread_count"] == 1

    def test_should_mark_read(self, override_notifications):
        token = make_token(1)
        response = client.post(
            "/notifications/1/read",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_should_404_when_mark_read_missing(self, override_notifications):
        token = make_token(1)
        response = client.post(
            "/notifications/99/read",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
