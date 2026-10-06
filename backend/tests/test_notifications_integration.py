"""Runs the in-app notification SQL on a real Postgres (`pytest -m integration`).

ADR-0011: a listed notification and a newly created one both carry the actor's name, read in
the same query, so the client never fetches the actor separately.
"""
import pytest

from db_support import add_block, add_notification, add_user
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


async def test_should_count_unread_messages_apart_from_the_other_unread_notifications(
    connection, token
):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    blocked = await add_user(connection, token, "blocked")
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
    await add_notification(connection, me, bob, type="message")
    await add_notification(connection, me, bob, type="liked")
    await add_notification(connection, me, carol, type="message")
    await add_notification(connection, carol, bob, type="message")
    notifications = InAppNotificationsRepository(connection)

    await notifications.mark_read_by_actor(me, bob, "message")

    assert await notifications.unread_count(me) == UnreadCountOut(unread_count=2, unread_messages=1)
    assert await notifications.unread_count(carol) == UnreadCountOut(unread_count=1, unread_messages=1)
