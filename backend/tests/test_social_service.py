import pytest
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from modules.social.service import (
    SocialService,
    FAME_LIKE_DELTA,
    FAME_VISIT_DELTA,
)
from core.presence import ONLINE_WINDOW_SECONDS

from modules.social.exceptions import (
    CannotVisitSelfException,
    CannotLikeSelfException,
    ProfilePhotoRequiredException,
    SocialUserNotFoundException,
    CannotBlockSelfException,
    CannotReportSelfException,
)
from modules.social.repository import RelationshipFlags


class FakeConnection:
    @asynccontextmanager
    async def transaction(self):
        yield


class FakeSocialRepository:
    def __init__(self):
        self.connection = FakeConnection()
        self.existing_users = {1, 2, 3}
        self.visits = {}
        self.likes = {}
        self.blocks = {}
        self.reports = {}
        self.visit_inserts = []
        self.activate_results = []

    async def user_exists(self, user_id: int) -> bool:
        return user_id in self.existing_users

    async def upsert_visit(self, viewer_id: int, target_id: int) -> bool:
        key = (viewer_id, target_id)
        inserted = key not in self.visits
        self.visits[key] = True
        self.visit_inserts.append(inserted)
        return inserted

    async def activate_like(self, from_user_id: int, to_user_id: int) -> tuple[bool, bool]:
        key = (from_user_id, to_user_id)
        existing = self.likes.get(key)
        if existing is None:
            self.likes[key] = "active"
            self.activate_results.append((True, True))
            return True, True
        if existing == "inactive":
            self.likes[key] = "active"
            self.activate_results.append((True, False))
            return True, False
        self.activate_results.append((False, False))
        return False, False

    async def soft_unlike(self, from_user_id: int, to_user_id: int) -> bool:
        key = (from_user_id, to_user_id)
        if self.likes.get(key) == "active":
            self.likes[key] = "inactive"
            return True
        return False

    async def is_connected(self, a: int, b: int) -> bool:
        return (
            self.likes.get((a, b)) == "active"
            and self.likes.get((b, a)) == "active"
        )

    async def get_relationship_flags(self, me: int, target: int) -> RelationshipFlags:
        return RelationshipFlags(
            liked_by_me=self.likes.get((me, target)) == "active",
            liked_you=self.likes.get((target, me)) == "active",
            connected=await self.is_connected(me, target),
            blocked_by_me=self.blocks.get((me, target)) == "active",
            blocked_you=self.blocks.get((target, me)) == "active",
        )

    async def list_visitors(self, user_id: int, limit: int, offset: int):
        return []

    async def list_likes_received(self, user_id: int, limit: int, offset: int):
        return []

    async def is_blocked_either_way(self, a: int, b: int) -> bool:
        return (
            self.blocks.get((a, b)) == "active"
            or self.blocks.get((b, a)) == "active"
        )

    async def activate_block(self, from_user_id: int, to_user_id: int) -> None:
        self.blocks[(from_user_id, to_user_id)] = "active"

    async def soft_unblock(self, from_user_id: int, to_user_id: int) -> None:
        key = (from_user_id, to_user_id)
        if self.blocks.get(key) == "active":
            self.blocks[key] = "inactive"

    async def list_blocks(self, user_id: int, limit: int, offset: int):
        return []

    async def upsert_report(self, reporter_id: int, target_id: int, reason):
        self.reports[(reporter_id, target_id)] = reason


class FakeUsersRepository:
    def __init__(self, has_avatar: bool = True, fame: int = 0, last_connection=None):
        self.has_avatar = has_avatar
        self.fame = fame
        self.fame_bumps = []
        self.last_connection = last_connection
        self.touches = []

    async def has_profile_photo(self, user_id: int) -> bool:
        return self.has_avatar

    async def bump_fame(self, user_id: int, delta: int) -> None:
        self.fame_bumps.append((user_id, delta))
        self.fame = min(100, max(0, self.fame + delta))

    async def touch_last_connection(self, user_id: int) -> None:
        self.touches.append(user_id)
        self.last_connection = datetime.now(timezone.utc)

    async def get_last_connection(self, user_id: int):
        return self.last_connection


@pytest.mark.asyncio
async def test_record_visit_rejects_self():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    with pytest.raises(CannotVisitSelfException):
        await service.record_visit(1, 1)
    assert users.fame_bumps == []


@pytest.mark.asyncio
async def test_first_visit_bumps_fame_repeat_does_not():
    social = FakeSocialRepository()
    users = FakeUsersRepository(fame=10)
    service = SocialService(social, users)
    await service.record_visit(1, 2)
    await service.record_visit(1, 2)
    assert users.fame_bumps == [(2, FAME_VISIT_DELTA)]
    assert users.fame == 11


@pytest.mark.asyncio
async def test_like_requires_profile_photo():
    social = FakeSocialRepository()
    users = FakeUsersRepository(has_avatar=False)
    service = SocialService(social, users)
    with pytest.raises(ProfilePhotoRequiredException):
        await service.like(1, 2)
    assert users.fame_bumps == []


@pytest.mark.asyncio
async def test_like_self_rejected():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    with pytest.raises(CannotLikeSelfException):
        await service.like(1, 1)


@pytest.mark.asyncio
async def test_like_target_not_found():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    with pytest.raises(SocialUserNotFoundException):
        await service.like(1, 99)


@pytest.mark.asyncio
async def test_mutual_like_sets_connected():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    first = await service.like(1, 2)
    assert first.liked is True
    assert first.connected is False
    second = await service.like(2, 1)
    assert second.connected is True


@pytest.mark.asyncio
async def test_unlike_clears_connected_and_is_idempotent():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    await service.like(1, 2)
    await service.like(2, 1)
    res = await service.unlike(1, 2)
    assert res.liked is False
    assert res.connected is False
    again = await service.unlike(1, 2)
    assert again.liked is False


@pytest.mark.asyncio
async def test_like_bumps_fame_only_when_newly_inserted():
    social = FakeSocialRepository()
    users = FakeUsersRepository(fame=0)
    service = SocialService(social, users)
    await service.like(1, 2)
    await service.like(1, 2)
    assert users.fame_bumps == [(2, FAME_LIKE_DELTA)]
    assert users.fame == 5


@pytest.mark.asyncio
async def test_unlike_then_relike_does_not_bump_fame():
    social = FakeSocialRepository()
    users = FakeUsersRepository(fame=0)
    service = SocialService(social, users)
    await service.like(1, 2)
    await service.unlike(1, 2)
    await service.like(1, 2)
    assert users.fame_bumps == [(2, FAME_LIKE_DELTA)]
    assert users.fame == 5


@pytest.mark.asyncio
async def test_fame_clamp_at_100():
    social = FakeSocialRepository()
    users = FakeUsersRepository(fame=99)
    service = SocialService(social, users)
    await service.like(1, 2)
    assert users.fame == 100


@pytest.mark.asyncio
async def test_block_self_rejected():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    with pytest.raises(CannotBlockSelfException):
        await service.block(1, 1)


@pytest.mark.asyncio
async def test_should_answer_not_found_to_like_and_visit_when_the_viewer_blocked_the_target():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    await service.block(1, 2)
    with pytest.raises(SocialUserNotFoundException):
        await service.like(1, 2)
    with pytest.raises(SocialUserNotFoundException):
        await service.record_visit(1, 2)


@pytest.mark.asyncio
async def test_should_answer_not_found_to_like_and_visit_when_the_target_blocked_the_viewer():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    await service.block(2, 1)
    with pytest.raises(SocialUserNotFoundException):
        await service.like(1, 2)
    with pytest.raises(SocialUserNotFoundException):
        await service.record_visit(1, 2)


@pytest.mark.asyncio
async def test_unblock_allows_like_again():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    await service.block(1, 2)
    await service.unblock(1, 2)
    res = await service.like(1, 2)
    assert res.liked is True


@pytest.mark.asyncio
async def test_should_keep_the_likes_and_restore_the_connection_when_the_block_is_lifted():
    social = FakeSocialRepository()
    service = SocialService(social, FakeUsersRepository())
    await service.like(1, 2)
    await service.like(2, 1)
    await service.block(1, 2)
    assert social.likes == {(1, 2): "active", (2, 1): "active"}
    await service.unblock(1, 2)
    assert (await service.get_relationship(1, 2)).connected is True


@pytest.mark.asyncio
async def test_should_answer_not_found_to_the_relationship_when_the_target_blocked_the_viewer():
    social = FakeSocialRepository()
    service = SocialService(social, FakeUsersRepository())
    await service.block(2, 1)
    with pytest.raises(SocialUserNotFoundException):
        await service.get_relationship(1, 2)


@pytest.mark.asyncio
async def test_report_rejects_self():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    with pytest.raises(CannotReportSelfException):
        await service.report(1, 1, "x")


@pytest.mark.asyncio
async def test_report_stores_ok():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    service = SocialService(social, users)
    res = await service.report(1, 2, "fake")
    assert res.ok is True
    assert social.reports[(1, 2)] == "fake"


@pytest.mark.asyncio
async def test_relationship_includes_block_and_online_fields():
    social = FakeSocialRepository()
    recent = datetime.now(timezone.utc) - timedelta(seconds=60)
    users = FakeUsersRepository(last_connection=recent)
    service = SocialService(social, users)
    await service.block(1, 2)
    flags = await service.get_relationship(1, 2)
    assert flags.blocked_by_me is True
    assert not hasattr(flags, "blocked_you")
    assert flags.is_online is True
    assert flags.last_connection == recent


@pytest.mark.asyncio
async def test_relationship_offline_when_stale():
    social = FakeSocialRepository()
    stale = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_WINDOW_SECONDS + 10)
    users = FakeUsersRepository(last_connection=stale)
    service = SocialService(social, users)
    flags = await service.get_relationship(1, 2)
    assert flags.is_online is False


class FakeNotifier:
    def __init__(self, fail: bool = False):
        self.events = []
        self.fail = fail

    async def create_event(self, user_id, type, actor_id, entity_id=None):
        if self.fail:
            raise RuntimeError("notifier down")
        self.events.append(
            {"user_id": user_id, "type": type, "actor_id": actor_id, "entity_id": entity_id}
        )


@pytest.mark.asyncio
async def test_should_emit_visited_when_visit_inserted():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    notifier = FakeNotifier()
    service = SocialService(social, users, notifier=notifier)
    await service.record_visit(1, 2)
    await service.record_visit(1, 2)
    # Every successful visit emits (including revisits); fame still once.
    assert notifier.events == [
        {"user_id": 2, "type": "visited", "actor_id": 1, "entity_id": None},
        {"user_id": 2, "type": "visited", "actor_id": 1, "entity_id": None},
    ]
    assert users.fame_bumps == [(2, FAME_VISIT_DELTA)]


@pytest.mark.asyncio
async def test_should_emit_liked_when_like_activated():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    notifier = FakeNotifier()
    service = SocialService(social, users, notifier=notifier)
    await service.like(1, 2)
    assert {"user_id": 2, "type": "liked", "actor_id": 1, "entity_id": None} in notifier.events


@pytest.mark.asyncio
async def test_should_emit_matched_to_both_when_like_connects():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    notifier = FakeNotifier()
    service = SocialService(social, users, notifier=notifier)
    await service.like(1, 2)
    await service.like(2, 1)
    matched = [e for e in notifier.events if e["type"] == "matched"]
    assert {"user_id": 1, "type": "matched", "actor_id": 2, "entity_id": None} in matched
    assert {"user_id": 2, "type": "matched", "actor_id": 1, "entity_id": None} in matched


@pytest.mark.asyncio
async def test_should_emit_unliked_when_unlike():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    notifier = FakeNotifier()
    service = SocialService(social, users, notifier=notifier)
    await service.like(1, 2)
    notifier.events.clear()
    await service.unlike(1, 2)
    assert notifier.events == [{"user_id": 2, "type": "unliked", "actor_id": 1, "entity_id": None}]
    await service.unlike(1, 2)
    assert len(notifier.events) == 1


@pytest.mark.asyncio
async def test_should_answer_not_found_when_unliking_a_missing_user():
    service = SocialService(FakeSocialRepository(), FakeUsersRepository())
    with pytest.raises(SocialUserNotFoundException):
        await service.unlike(1, 99)


@pytest.mark.asyncio
@pytest.mark.parametrize("blocker, blocked", [(1, 2), (2, 1)])
async def test_should_answer_not_found_and_emit_nothing_when_unliking_across_a_block(blocker, blocked):
    social = FakeSocialRepository()
    notifier = FakeNotifier()
    service = SocialService(social, FakeUsersRepository(), notifier=notifier)
    await service.like(1, 2)
    await service.block(blocker, blocked)
    notifier.events.clear()
    with pytest.raises(SocialUserNotFoundException):
        await service.unlike(1, 2)
    assert social.likes[(1, 2)] == "active"
    assert notifier.events == []


@pytest.mark.asyncio
async def test_should_not_fail_like_when_notifier_raises():
    social = FakeSocialRepository()
    users = FakeUsersRepository()
    notifier = FakeNotifier(fail=True)
    service = SocialService(social, users, notifier=notifier)
    res = await service.like(1, 2)
    assert res.liked is True
