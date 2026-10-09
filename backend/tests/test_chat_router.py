import uuid
from datetime import datetime, UTC
from fastapi.testclient import TestClient
from main import app
import pytest
import time
import jwt
from core.config import settings
from core.auth import get_current_session, get_current_user_id, read_session_token
from core.presence import get_current_user_id_and_touch
from modules.chat.controller import get_chat_service
from modules.chat.schemas import ChatOkResponse, MessageOut, SendMessageInput
from modules.chat.exceptions import NotConnectedException, ChatUserNotFoundException

client = TestClient(app)


def make_token(user_id: int) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(uuid.uuid4()),
            "exp": time.time() + 36000,
            "iat": int(now.timestamp()),
        },
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


class FakeChatService:
    def __init__(self):
        self.connected = True
        self.blocked = False
        self.messages = []
        self.list_calls = []
        self.read_calls = []

    async def send(self, me, peer, payload: SendMessageInput):
        if self.blocked:
            raise ChatUserNotFoundException()
        if not self.connected:
            raise NotConnectedException()
        msg = MessageOut(
            id=1,
            from_user_id=me,
            to_user_id=peer,
            body=payload.body,
            created_at=datetime.now(UTC),
        )
        self.messages.append(msg)
        return msg

    async def list_messages(self, me, peer, limit, before):
        if self.blocked:
            raise ChatUserNotFoundException()
        if not self.connected:
            raise NotConnectedException()
        self.list_calls.append((me, peer, limit, before))
        return self.messages[:limit]

    async def mark_conversation_read(self, me, peer, up_to_message_id):
        if self.blocked:
            raise ChatUserNotFoundException()
        if not self.connected:
            raise NotConnectedException()
        self.read_calls.append((me, peer, up_to_message_id))
        return ChatOkResponse()


@pytest.fixture
def override_chat():
    fake = FakeChatService()
    app.dependency_overrides[get_chat_service] = lambda: fake
    app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
    app.dependency_overrides[get_current_session] = read_session_token
    yield fake
    app.dependency_overrides.clear()


class TestChatRouter:
    def test_should_return_401_when_unauthenticated(self):
        assert client.post("/chat/messages/2", json={"body": "hi"}).status_code == 401

    def test_should_send_when_connected(self, override_chat):
        token = make_token(1)
        response = client.post(
            "/chat/messages/2",
            json={"body": "hi"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["body"] == "hi"

    def test_should_forbid_when_not_connected(self, override_chat):
        override_chat.connected = False
        token = make_token(1)
        response = client.post(
            "/chat/messages/2",
            json={"body": "hi"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    def test_should_answer_user_not_found_when_blocked(self, override_chat):
        override_chat.blocked = True
        token = make_token(1)
        response = client.get(
            "/chat/messages/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert response.json()["code"] == "CHAT_USER_NOT_FOUND"

    def test_should_list_when_connected(self, override_chat):
        token = make_token(1)
        client.post(
            "/chat/messages/2",
            json={"body": "hi"},
            headers={"Authorization": f"Bearer {token}"},
        )
        response = client.get(
            "/chat/messages/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_should_pass_the_cursor_and_limit_when_listing_older_messages(self, override_chat):
        token = make_token(1)
        response = client.get(
            "/chat/messages/2?before=10&limit=5",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert override_chat.list_calls == [(1, 2, 5, 10)]

    def test_should_ask_for_the_latest_page_when_no_cursor_is_given(self, override_chat):
        token = make_token(1)
        response = client.get(
            "/chat/messages/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert override_chat.list_calls == [(1, 2, 50, None)]

    def test_should_mark_the_conversation_read_up_to_the_given_message_when_connected(
        self, override_chat
    ):
        token = make_token(1)
        response = client.post(
            "/chat/conversations/2/read",
            json={"up_to_message_id": 10},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json() == {"ok": True}
        assert override_chat.read_calls == [(1, 2, 10)]

    def test_should_reject_a_conversation_read_without_the_shown_message(self, override_chat):
        token = make_token(1)
        response = client.post(
            "/chat/conversations/2/read",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422
        assert override_chat.read_calls == []
