"""Runs the in-app notification SQL on a real Postgres (`pytest -m integration`).

ADR-0011: a listed notification and a newly created one both carry the actor's name, read in
the same query, so the client never fetches the actor separately.
"""
import pytest

from db_support import add_block, add_like, add_notification, add_user
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.schemas import NotificationActor, UnreadCountOut

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_should_carry_the_actor_name_when_listing_notifications(connection, token):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    await add_notification(connection, me, bob)

    notifications = await InAppNotificationsRepository(connection).list_for_user(me, 20, 0)

    assert [n.actor for n in notifications] == [
        NotificationActor(id=bob, username=f"{token}bob", first_name="Bob", last_name="Tester")
    ]


async def test_should_carry_the_actor_name_when_creating_a_notification(connection, token):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")

    notification = await InAppNotificationsRepository(connection).create(me, "liked", bob)

    assert notification.actor == NotificationActor(
        id=bob, username=f"{token}bob", first_name="Bob", last_name="Tester"
    )


async def connect(connection, a, b) -> None:
    await add_like(connection, a, b)
    await add_like(connection, b, a)


async def test_should_count_unread_messages_apart_from_the_other_unread_notifications(
    connection, token
):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    blocked = await add_user(connection, token, "blocked")
    await connect(connection, me, bob)
    await connect(connection, me, blocked)
    await add_notification(connection, me, bob, type="message")
    await add_notification(connection, me, bob, type="message")
    await add_notification(connection, me, bob, type="liked")
    await add_notification(connection, me, blocked, type="message")
    await add_block(connection, me, blocked)

    counts = await InAppNotificationsRepository(connection).unread_count(me)

    assert counts == UnreadCountOut(unread_count=3, unread_messages=2)


async def test_should_mark_read_only_that_actors_message_notifications_when_marking_by_actor(
    connection, token
):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    carol = await add_user(connection, token, "carol")
    await connect(connection, me, bob)
    await connect(connection, me, carol)
    await connect(connection, carol, bob)
    await add_notification(connection, me, bob, type="message", entity_id=10)
    await add_notification(connection, me, bob, type="liked")
    await add_notification(connection, me, carol, type="message", entity_id=11)
    await add_notification(connection, carol, bob, type="message", entity_id=12)
    notifications = InAppNotificationsRepository(connection)

    await notifications.mark_read_by_actor(me, bob, "message", 12)

    assert await notifications.unread_count(me) == UnreadCountOut(unread_count=2, unread_messages=1)
    assert await notifications.unread_count(carol) == UnreadCountOut(unread_count=1, unread_messages=1)


async def test_should_count_unread_messages_only_from_senders_the_user_can_still_chat_with(
    connection, token
):
    me = await add_user(connection, token, "me")
    connected = await add_user(connection, token, "connected")
    unliked = await add_user(connection, token, "unliked")
    await connect(connection, me, connected)
    await add_like(connection, me, unliked)
    await add_like(connection, unliked, me, status="inactive")
    await add_notification(connection, me, connected, type="message", entity_id=1)
    await add_notification(connection, me, unliked, type="message", entity_id=2)

    counts = await InAppNotificationsRepository(connection).unread_count(me)

    assert counts == UnreadCountOut(unread_count=2, unread_messages=1)


async def test_should_leave_a_later_message_unread_when_marking_read_up_to_an_earlier_one(
    connection, token
):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    await connect(connection, me, bob)
    await add_notification(connection, me, bob, type="message", entity_id=10)
    await add_notification(connection, me, bob, type="message", entity_id=11)
    notifications = InAppNotificationsRepository(connection)

    await notifications.mark_read_by_actor(me, bob, "message", 10)

    assert await notifications.unread_count(me) == UnreadCountOut(unread_count=1, unread_messages=1)
