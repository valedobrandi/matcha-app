import logging
import pytest
from core.ws_hub import ConnectionHub, decode_user_id_from_token
from starlette.websockets import WebSocketDisconnect
from core.config import settings
import jwt
import datetime
import time

class FakeWebSocket:
    def __init__(self):
        self.accepted = False
        self.sent = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, data):
        self.sent.append(data)


class ClosedWebSocket(FakeWebSocket):
    """A tab that closed while the server still holds its socket."""

    def __init__(self):
        super().__init__()
        self.send_attempts = 0

    async def send_json(self, data):
        self.send_attempts += 1
        raise WebSocketDisconnect(code=1006)


class BrokenWebSocket(FakeWebSocket):
    """A socket whose send fails for a reason other than a closed tab."""

    async def send_json(self, data):
        raise RuntimeError("unexpected send failure")

def _token(user_id: int) -> str:
    now = datetime.datetime.now(datetime.UTC)
    return jwt.encode(
        {"sub": str(user_id), "exp": time.time() + 3600, "iat": int(now.timestamp())},
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


@pytest.mark.asyncio
async def test_should_push_when_user_connected():
    hub = ConnectionHub()
    ws = FakeWebSocket()
    await hub.connect(1, ws)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert ws.sent == [{"type": "notification", "payload": {"id": 1}}]


@pytest.mark.asyncio
async def test_should_noop_push_when_user_offline():
    hub = ConnectionHub()
    await hub.push(99, {"type": "notification", "payload": {}})


def test_should_decode_valid_token():
    assert decode_user_id_from_token(_token(7)) == 7


def test_should_reject_invalid_token():
    assert decode_user_id_from_token("not-a-jwt") is None
    assert decode_user_id_from_token("") is None

@pytest.mark.asyncio
async def test_should_push_to_every_tab_when_user_has_two_sockets():
    hub = ConnectionHub()
    first_tab, second_tab = FakeWebSocket(), FakeWebSocket()
    await hub.connect(1, first_tab)
    await hub.connect(1, second_tab)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert first_tab.sent == [{"type": "notification", "payload": {"id": 1}}]
    assert second_tab.sent == [{"type": "notification", "payload": {"id": 1}}]

@pytest.mark.asyncio
async def test_should_keep_pushing_to_other_tab_when_one_tab_disconnects():
    hub = ConnectionHub()
    first_tab, second_tab = FakeWebSocket(), FakeWebSocket()
    await hub.connect(1, first_tab)
    await hub.connect(1, second_tab)
    hub.disconnect(1, first_tab)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert first_tab.sent == []
    assert second_tab.sent == [{"type": "notification", "payload": {"id": 1}}]


@pytest.mark.asyncio
async def test_should_drop_closed_socket_and_reach_other_tab_when_a_send_fails():
    hub = ConnectionHub()
    closed_tab, open_tab = ClosedWebSocket(), FakeWebSocket()
    await hub.connect(1, closed_tab)
    await hub.connect(1, open_tab)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    await hub.push(1, {"type": "notification", "payload": {"id": 2}})
    assert closed_tab.send_attempts == 1
    assert open_tab.sent == [
        {"type": "notification", "payload": {"id": 1}},
        {"type": "notification", "payload": {"id": 2}},
    ]


@pytest.mark.asyncio
async def test_should_not_log_a_warning_when_a_closed_tab_misses_a_push(caplog):
    hub = ConnectionHub()
    await hub.connect(1, ClosedWebSocket())
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert [record for record in caplog.records if record.levelno >= logging.WARNING] == []


@pytest.mark.asyncio
async def test_should_log_an_error_when_a_send_fails_unexpectedly(caplog):
    hub = ConnectionHub()
    await hub.connect(1, BrokenWebSocket())
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert [record.levelname for record in caplog.records] == ["ERROR"]
