"""Runs the block rule of ADR-0005 and ADR-0006 on a real Postgres.

Same setup as test_discovery_visibility_integration.py (`pytest -m integration`). A user
with an active block, in either direction, must not appear in the visitors, likes-received
or notification lists. Unblocking brings the history back, and every count follows its list.
"""
import pytest

from db_support import add_block, add_like, add_notification, add_user, add_visit
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.schemas import UnreadCountOut
from modules.social.repository import SocialRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

MANY = 1000


async def visitor_ids(connection, viewer_id) -> list[int]:
    return [v.id for v in await SocialRepository(connection).list_visitors(viewer_id, MANY, 0)]


async def liker_ids(connection, viewer_id) -> list[int]:
    return [
        like.id for like in await SocialRepository(connection).list_likes_received(viewer_id, MANY, 0)
    ]


async def notification_actor_ids(connection, user_id) -> list[int]:
    notifications = await InAppNotificationsRepository(connection).list_for_user(user_id, MANY, 0)
    return [n.actor.id for n in notifications]


async def test_should_hide_blocked_users_from_visitors_when_the_block_is_active_either_way(
    connection, token
):
    me = await add_user(connection, token, "me")
    blocked_by_me = await add_user(connection, token, "blockedbyme")
    blocking_me = await add_user(connection, token, "blockingme")
    other = await add_user(connection, token, "other")
    for visitor in (blocked_by_me, blocking_me, other):
        await add_visit(connection, visitor, me)
    await add_block(connection, me, blocked_by_me)
    await add_block(connection, blocking_me, me)

    assert await visitor_ids(connection, me) == [other]


async def test_should_hide_blocked_users_from_likes_received_when_the_block_is_active_either_way(
    connection, token
):
    me = await add_user(connection, token, "me")
    blocked_by_me = await add_user(connection, token, "blockedbyme")
    blocking_me = await add_user(connection, token, "blockingme")
    other = await add_user(connection, token, "other")
    for liker in (blocked_by_me, blocking_me, other):
        await add_like(connection, liker, me)
    await add_block(connection, me, blocked_by_me)
    await add_block(connection, blocking_me, me)

    assert await liker_ids(connection, me) == [other]


async def test_should_hide_blocked_actors_from_notifications_and_the_unread_count_when_the_block_is_active(
    connection, token
):
    me = await add_user(connection, token, "me")
    blocked_by_me = await add_user(connection, token, "blockedbyme")
    blocking_me = await add_user(connection, token, "blockingme")
    other = await add_user(connection, token, "other")
    for actor in (blocked_by_me, blocking_me, other):
        await add_notification(connection, me, actor)
    await add_block(connection, me, blocked_by_me)
    await add_block(connection, blocking_me, me)

    assert await notification_actor_ids(connection, me) == [other]
    assert await InAppNotificationsRepository(connection).unread_count(me) == UnreadCountOut(
        unread_count=1, unread_messages=0
    )


async def test_should_bring_the_history_back_when_the_block_is_inactive(connection, token):
    me = await add_user(connection, token, "me")
    visitor = await add_user(connection, token, "visitor")
    await add_visit(connection, visitor, me)
    await add_like(connection, visitor, me)
    await add_notification(connection, me, visitor)
    await add_block(connection, me, visitor, status="inactive")

    assert await visitor_ids(connection, me) == [visitor]
    assert await liker_ids(connection, me) == [visitor]
    assert await notification_actor_ids(connection, me) == [visitor]
    assert await InAppNotificationsRepository(connection).unread_count(me) == UnreadCountOut(
        unread_count=1, unread_messages=0
    )
    assert await SocialRepository(connection).count_likes_received(me) == 1
    assert await SocialRepository(connection).count_visitors(me) == 1


async def test_should_count_only_the_listed_users_when_a_block_is_active_either_way(
    connection, token
):
    me = await add_user(connection, token, "me")
    blocked_by_me = await add_user(connection, token, "blockedbyme")
    blocking_me = await add_user(connection, token, "blockingme")
    other = await add_user(connection, token, "other")
    for user in (blocked_by_me, blocking_me, other):
        await add_like(connection, user, me)
        await add_visit(connection, user, me)
    await add_block(connection, me, blocked_by_me)
    await add_block(connection, blocking_me, me)
    social = SocialRepository(connection)

    assert await social.count_likes_received(me) == len(await liker_ids(connection, me)) == 1
    assert await social.count_visitors(me) == len(await visitor_ids(connection, me)) == 1


async def test_should_see_a_block_from_both_sides_only_while_it_is_active(connection, token):
    blocker = await add_user(connection, token, "blocker")
    blocked = await add_user(connection, token, "blocked")
    stranger = await add_user(connection, token, "stranger")
    unblocked = await add_user(connection, token, "unblocked")
    await add_block(connection, blocker, blocked)
    await add_block(connection, blocker, unblocked, status="inactive")
    social = SocialRepository(connection)

    assert await social.is_blocked_either_way(blocker, blocked)
    assert await social.is_blocked_either_way(blocked, blocker)
    assert not await social.is_blocked_either_way(blocker, stranger)
    assert not await social.is_blocked_either_way(blocker, unblocked)
