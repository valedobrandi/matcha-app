from datetime import datetime, UTC
import json
import uuid
from fastapi.testclient import TestClient
from main import app
from starlette.websockets import WebSocketDisconnect
import pytest
import time
import jwt
from core import ws_hub
from core.config import settings
from core.ws_hub import hub
from modules.realtime import controller

client = TestClient(app)

READY = '{"type":"ready","payload":null}'


def make_token(user_id: int, lifetime_seconds: int = 36000) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(uuid.uuid4()),
            "exp": int(time.time()) + lifetime_seconds,
            "iat": int(now.timestamp()),
        },
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def auth_frame(token: str) -> str:
    return json.dumps({"type": "auth", "payload": {"token": token}})


def close_code(websocket) -> int:
    with pytest.raises(WebSocketDisconnect) as closed:
        websocket.receive_text()
    return closed.value.code


def sessions_answer(active: bool):
    async def session_is_active(identity) -> bool:
        return active
    return session_is_active


@pytest.fixture(autouse=True)
def active_sessions(monkeypatch):
    monkeypatch.setattr(controller, "session_is_active", sessions_answer(True))


@pytest.mark.parametrize("first_frame", [
    auth_frame("not-a-jwt"),
    '{"type":"ping","payload":null}',
    '{"type":"auth","payload":null}',
    "not json",
])
def test_should_close_with_1008_when_the_first_frame_is_not_a_valid_auth_frame(first_frame):
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text(first_frame)
        assert close_code(websocket) == 1008


def test_should_ignore_a_token_in_the_url():
    with client.websocket_connect(f"/ws?token={make_token(1)}") as websocket:
        websocket.send_text('{"type":"ping","payload":null}')
        assert close_code(websocket) == 1008


def test_should_close_with_4408_when_no_auth_frame_arrives_in_time(monkeypatch):
    monkeypatch.setattr(controller, "AUTH_TIMEOUT_SECONDS", 0.05)
    with client.websocket_connect("/ws") as websocket:
        assert close_code(websocket) == 4408


def test_should_register_the_socket_and_answer_ready_when_the_token_is_valid():
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text(auth_frame(make_token(41)))
        assert websocket.receive_text() == READY
        assert 41 in hub._connections
    assert 41 not in hub._connections


def test_should_close_with_1008_and_drop_the_socket_when_the_session_has_ended(monkeypatch):
    monkeypatch.setattr(controller, "session_is_active", sessions_answer(False))
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text(auth_frame(make_token(43)))
        assert close_code(websocket) == 1008
    assert 43 not in hub._connections


def test_should_close_with_1013_when_the_user_already_has_as_many_sockets_as_allowed(monkeypatch):
    monkeypatch.setattr(ws_hub, "MAX_SOCKETS_PER_USER", 1)
    with client.websocket_connect("/ws") as first:
        first.send_text(auth_frame(make_token(44)))
        assert first.receive_text() == READY
        with client.websocket_connect("/ws") as second:
            second.send_text(auth_frame(make_token(44)))
            assert close_code(second) == 1013
        assert len(hub._connections[44]) == 1


def test_should_answer_pong_when_client_sends_ping():
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text(auth_frame(make_token(1)))
        assert websocket.receive_text() == READY
        websocket.send_text('{"type":"ping","payload":null}')
        assert websocket.receive_text() == '{"type":"pong","payload":null}'


def test_should_close_with_1008_when_the_token_expires_while_open():
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text(auth_frame(make_token(42, lifetime_seconds=2)))
        assert websocket.receive_text() == READY
        assert close_code(websocket) == 1008
    assert 42 not in hub._connections
