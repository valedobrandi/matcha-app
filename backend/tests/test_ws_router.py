from datetime import datetime, UTC
from fastapi.testclient import TestClient
from main import app
from starlette.websockets import WebSocketDisconnect
import time
import jwt
from core.config import settings
from modules.realtime.controller import PING, PONG

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


def test_should_reject_websocket_without_token():
    with client.websocket_connect("/ws") as websocket:
        try:
            websocket.receive_text()
            assert False, "expected disconnect after auth rejection"
        except WebSocketDisconnect as exc:
            assert exc.code == 1008


def test_should_reject_websocket_with_invalid_token():
    with client.websocket_connect("/ws?token=not-a-jwt") as websocket:
        try:
            websocket.receive_text()
            assert False, "expected disconnect after auth rejection"
        except WebSocketDisconnect as exc:
            assert exc.code == 1008


def test_should_accept_websocket_with_valid_token():
    token = make_token(1)
    with client.websocket_connect(f"/ws?token={token}") as websocket:
        websocket.send_text("ping")


def test_should_answer_pong_when_client_sends_ping():
    token = make_token(1)
    with client.websocket_connect(f"/ws?token={token}") as websocket:
        websocket.send_text(PING)
        assert websocket.receive_text() == PONG
