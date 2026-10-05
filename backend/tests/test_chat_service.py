import pytest
from datetime import datetime, UTC
from modules.chat.service import ChatService
from modules.chat.schemas import MessageOut, SendMessageInput
from modules.chat.exceptions import (
    NotConnectedException,
    ChatUserNotFoundException,
)


class FakeChatRepo:
    def __init__(self):
        self.messages = []
        self._next_id = 1

    async def insert_message(self, from_user_id, to_user_id, body):
        msg = MessageOut(
            id=self._next_id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            body=body,
            created_at=datetime.now(UTC),
        )
        self._next_id += 1
        self.messages.append(msg)
        return msg

    async def list_messages(self, me, peer, limit, offset):
        owned = [
            m
            for m in self.messages
            if {m.from_user_id, m.to_user_id} == {me, peer}
        ]
        return owned[offset:offset + limit]


class FakeSocial:
    def __init__(self, connected=False, blocked=False, users=None):
        self.connected = connected
        self.blocked = blocked
        self.users = users or {1, 2}

    async def user_exists(self, user_id):
        return user_id in self.users

    async def is_blocked_either_way(self, a, b):
        return self.blocked

    async def is_connected(self, a, b):
        return self.connected


class FakeNotifier:
    def __init__(self):
        self.events = []

    async def create_event(self, user_id, type, actor_id, entity_id=None):
        self.events.append(
            {
                "user_id": user_id,
                "type": type,
                "actor_id": actor_id,
                "entity_id": entity_id,
            }
        )


@pytest.mark.asyncio
async def test_should_send_when_connected():
    service = ChatService(FakeChatRepo(), FakeSocial(connected=True))
    msg = await service.send(1, 2, SendMessageInput(body="hi"))
    assert msg.body == "hi"
    assert msg.from_user_id == 1
    assert msg.to_user_id == 2


@pytest.mark.asyncio
async def test_should_forbid_when_not_connected():
    service = ChatService(FakeChatRepo(), FakeSocial(connected=False))
    with pytest.raises(NotConnectedException):
        await service.send(1, 2, SendMessageInput(body="hi"))


@pytest.mark.asyncio
async def test_should_answer_user_not_found_when_blocked():
    service = ChatService(
        FakeChatRepo(), FakeSocial(connected=True, blocked=True)
    )
    with pytest.raises(ChatUserNotFoundException):
        await service.send(1, 2, SendMessageInput(body="hi"))


@pytest.mark.asyncio
async def test_should_list_when_connected():
    repo = FakeChatRepo()
    service = ChatService(repo, FakeSocial(connected=True))
    await service.send(1, 2, SendMessageInput(body="a"))
    await service.send(2, 1, SendMessageInput(body="b"))
    msgs = await service.list_messages(1, 2, 50, 0)
    assert [m.body for m in msgs] == ["a", "b"]


@pytest.mark.asyncio
async def test_should_emit_message_notification_when_sent():
    notifier = FakeNotifier()
    service = ChatService(
        FakeChatRepo(), FakeSocial(connected=True), notifier=notifier
    )
    msg = await service.send(1, 2, SendMessageInput(body="hi"))
    assert notifier.events == [
        {"user_id": 2, "type": "message", "actor_id": 1, "entity_id": msg.id}
    ]


@pytest.mark.asyncio
async def test_should_raise_when_peer_missing():
    service = ChatService(FakeChatRepo(), FakeSocial(connected=True, users={1}))
    with pytest.raises(ChatUserNotFoundException):
        await service.send(1, 2, SendMessageInput(body="hi"))
