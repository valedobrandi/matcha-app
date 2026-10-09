import json
import logging
import uuid
import pytest
from fastapi import WebSocketDisconnect
from core.ws_hub import ConnectionHub, SocketIdentity, decode_socket_identity
from core.config import settings
import jwt
import datetime
import time


class FakeWebSocket:
    def __init__(self):
        self.texts = []
        self.close_code = None

    @property
    def sent(self):
        return [json.loads(text) for text in self.texts]

    async def send_text(self, data):
        self.texts.append(data)

    async def close(self, code=1000):
        self.close_code = code


class ClosedWebSocket(FakeWebSocket):
    """A tab that closed while the server still holds its socket."""

    def __init__(self):
        super().__init__()
        self.send_attempts = 0

    async def send_text(self, data):
        self.send_attempts += 1
        raise WebSocketDisconnect(code=1006)


class BrokenWebSocket(FakeWebSocket):
    """A socket whose send fails for a reason other than a closed tab."""

    async def send_text(self, data):
        raise RuntimeError("unexpected send failure")


class TabThatClosesTheOther(FakeWebSocket):
    """While a send to this tab awaits, the user's other tab closes and leaves the hub.

    A send to a closed tab raises what uvicorn's legacy implementation raises.
    """

    def __init__(self, hub):
        super().__init__()
        self.hub = hub
        self.other = None
        self.closed = False

    async def send_text(self, data):
        if self.closed:
            raise RuntimeError("Unexpected ASGI message 'websocket.send', after sending 'websocket.close'")
        await super().send_text(data)
        self.other.closed = True
        self.hub.disconnect(1, self.other)


SESSION = uuid.UUID("00000000-0000-4000-8000-000000000001")


def _token(user_id: int, exp: float | None = None) -> str:
    now = datetime.datetime.now(datetime.UTC)
    return jwt.encode(
        {"sub": str(user_id), "sid": str(SESSION), "exp": exp or time.time() + 3600, "iat": int(now.timestamp())},
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


@pytest.mark.asyncio
async def test_should_push_when_user_connected():
    hub = ConnectionHub()
    ws = FakeWebSocket()
    hub.connect(1, ws, SESSION)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert ws.sent == [{"type": "notification", "payload": {"id": 1}}]


@pytest.mark.asyncio
async def test_should_noop_push_when_user_offline():
    hub = ConnectionHub()
    await hub.push(99, {"type": "notification", "payload": {}})


def test_should_decode_the_user_session_and_expiry_when_the_token_is_valid():
    exp = time.time() + 3600
    assert decode_socket_identity(_token(7, exp)) == SocketIdentity(user_id=7, session_id=SESSION, expires_at=exp)


def test_should_reject_the_token_when_it_is_invalid_empty_or_has_no_expiry_or_session():
    secret = settings.JWT_SECRET.get_secret_value()
    no_expiry = jwt.encode({"sub": "7", "sid": str(SESSION)}, secret, algorithm=settings.JWT_ALGORITHM)
    no_session = jwt.encode({"sub": "7", "exp": time.time() + 3600}, secret, algorithm=settings.JWT_ALGORITHM)
    assert decode_socket_identity("not-a-jwt") is None
    assert decode_socket_identity("") is None
    assert decode_socket_identity(no_expiry) is None
    assert decode_socket_identity(no_session) is None


@pytest.mark.asyncio
async def test_should_push_to_every_tab_when_user_has_two_sockets():
    hub = ConnectionHub()
    first_tab, second_tab = FakeWebSocket(), FakeWebSocket()
    hub.connect(1, first_tab, SESSION)
    hub.connect(1, second_tab, SESSION)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert first_tab.sent == [{"type": "notification", "payload": {"id": 1}}]
    assert second_tab.sent == [{"type": "notification", "payload": {"id": 1}}]


@pytest.mark.asyncio
async def test_should_keep_pushing_to_other_tab_when_one_tab_disconnects():
    hub = ConnectionHub()
    first_tab, second_tab = FakeWebSocket(), FakeWebSocket()
    hub.connect(1, first_tab, SESSION)
    hub.connect(1, second_tab, SESSION)
    hub.disconnect(1, first_tab)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert first_tab.sent == []
    assert second_tab.sent == [{"type": "notification", "payload": {"id": 1}}]


@pytest.mark.asyncio
async def test_should_drop_closed_socket_and_reach_other_tab_when_a_send_fails():
    hub = ConnectionHub()
    closed_tab, open_tab = ClosedWebSocket(), FakeWebSocket()
    hub.connect(1, closed_tab, SESSION)
    hub.connect(1, open_tab, SESSION)
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
    hub.connect(1, ClosedWebSocket(), SESSION)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert [record for record in caplog.records if record.levelno >= logging.WARNING] == []


@pytest.mark.asyncio
async def test_should_log_an_error_when_a_send_fails_unexpectedly(caplog):
    hub = ConnectionHub()
    hub.connect(1, BrokenWebSocket(), SESSION)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert [record.levelname for record in caplog.records] == ["ERROR"]


@pytest.mark.asyncio
async def test_should_skip_a_tab_that_closed_during_the_same_push(caplog):
    hub = ConnectionHub()
    first_tab, second_tab = TabThatClosesTheOther(hub), TabThatClosesTheOther(hub)
    first_tab.other, second_tab.other = second_tab, first_tab
    hub.connect(1, first_tab, SESSION)
    hub.connect(1, second_tab, SESSION)
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert len(first_tab.sent) + len(second_tab.sent) == 1
    assert [record for record in caplog.records if record.levelno >= logging.WARNING] == []


@pytest.mark.asyncio
async def test_should_log_and_keep_every_tab_when_the_envelope_is_not_json(caplog):
    hub = ConnectionHub()
    first_tab, second_tab = FakeWebSocket(), FakeWebSocket()
    hub.connect(1, first_tab, SESSION)
    hub.connect(1, second_tab, SESSION)
    await hub.push(1, {"type": "notification", "payload": object()})
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})
    assert [record.levelname for record in caplog.records] == ["ERROR"]
    assert first_tab.sent == [{"type": "notification", "payload": {"id": 1}}]
    assert second_tab.sent == [{"type": "notification", "payload": {"id": 1}}]


@pytest.mark.asyncio
async def test_should_close_and_drop_only_the_sockets_of_ended_sessions():
    hub = ConnectionHub()
    ended_session = uuid.UUID("00000000-0000-4000-8000-000000000002")
    kept_tab, ended_tab = FakeWebSocket(), FakeWebSocket()
    hub.connect(1, kept_tab, SESSION)
    hub.connect(1, ended_tab, ended_session)

    await hub.end_sessions(1, [ended_session])
    await hub.push(1, {"type": "notification", "payload": {"id": 1}})

    assert (kept_tab.close_code, ended_tab.close_code) == (None, 1008)
    assert kept_tab.sent == [{"type": "notification", "payload": {"id": 1}}]
    assert ended_tab.sent == []


@pytest.mark.asyncio
async def test_should_send_the_same_text_as_starlette_send_json():
    hub = ConnectionHub()
    tab = FakeWebSocket()
    hub.connect(1, tab, SESSION)
    await hub.push(1, {"type": "notification", "payload": {"first_name": "Zoë"}})
    assert tab.texts == ['{"type":"notification","payload":{"first_name":"Zoë"}}']
