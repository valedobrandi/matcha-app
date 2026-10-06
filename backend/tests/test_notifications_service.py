import pytest
from datetime import datetime, UTC
from modules.notifications.service import NotificationsService
from modules.notifications.schemas import NotificationActor, NotificationOut, UnreadCountOut
from modules.notifications.exceptions import NotificationNotFoundException


class FakeRepo:
    def __init__(self):
        self.rows: list[NotificationOut] = []
        self._next_id = 1

    async def create(self, user_id, type, actor_id, entity_id=None):
        row = NotificationOut(
            id=self._next_id,
            type=type,
            actor=NotificationActor(
                id=actor_id, username=f"user{actor_id}", first_name="First", last_name="Last"
            ),
            entity_id=entity_id,
            read_at=None,
            created_at=datetime.now(UTC),
        )
        self._next_id += 1
        self.rows.append((user_id, row))
        return row

    async def list_for_user(self, user_id, limit, offset):
        owned = [r for uid, r in self.rows if uid == user_id]
        return owned[offset:offset + limit]

    async def mark_read(self, user_id, notification_id):
        for uid, row in self.rows:
            if uid == user_id and row.id == notification_id:
                row.read_at = datetime.now(UTC)
                return True
        return False

    async def mark_all_read(self, user_id):
        n = 0
        for uid, row in self.rows:
            if uid == user_id and row.read_at is None:
                row.read_at = datetime.now(UTC)
                n += 1
        return n

    async def unread_count(self, user_id):
        unread = [row for uid, row in self.rows if uid == user_id and row.read_at is None]
        return UnreadCountOut(
            unread_count=len(unread),
            unread_messages=sum(1 for row in unread if row.type == "message"),
        )


class FakeHub:
    def __init__(self):
        self.pushed = []

    async def push(self, user_id, envelope):
        self.pushed.append((user_id, envelope))


@pytest.mark.asyncio
async def test_should_create_row_when_event():
    repo = FakeRepo()
    service = NotificationsService(repo)
    result = await service.create_event(user_id=2, type="liked", actor_id=1)
    assert result.type == "liked"
    assert result.actor.id == 1
    assert result.read_at is None
    assert len(repo.rows) == 1


@pytest.mark.asyncio
async def test_should_push_the_notification_with_its_actor_when_an_event_is_created():
    hub = FakeHub()
    service = NotificationsService(FakeRepo(), hub=hub)
    await service.create_event(user_id=2, type="liked", actor_id=1)
    [(user_id, envelope)] = hub.pushed
    assert user_id == 2
    assert envelope["type"] == "notification"
    assert envelope["payload"]["actor"] == {
        "id": 1,
        "username": "user1",
        "first_name": "First",
        "last_name": "Last",
    }


@pytest.mark.asyncio
async def test_should_count_unread_when_unread_exists():
    repo = FakeRepo()
    service = NotificationsService(repo)
    await service.create_event(2, "liked", 1)
    await service.create_event(2, "visited", 1)
    count = await service.unread_count(2)
    assert count.unread_count == 2


@pytest.mark.asyncio
async def test_should_mark_read_when_owned():
    repo = FakeRepo()
    service = NotificationsService(repo)
    created = await service.create_event(2, "liked", 1)
    await service.mark_read(2, created.id)
    count = await service.unread_count(2)
    assert count.unread_count == 0


@pytest.mark.asyncio
async def test_should_not_mark_read_when_other_users_notification():
    repo = FakeRepo()
    service = NotificationsService(repo)
    created = await service.create_event(2, "liked", 1)
    with pytest.raises(NotificationNotFoundException):
        await service.mark_read(99, created.id)
