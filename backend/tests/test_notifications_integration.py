"""Runs the in-app notification SQL on a real Postgres (`pytest -m integration`).

ADR-0011: a listed notification and a newly created one both carry the actor's name, read in
the same query, so the client never fetches the actor separately.
"""
import pytest

from db_support import add_notification, add_user
from modules.notifications.repository import InAppNotificationsRepository
from modules.notifications.schemas import NotificationActor

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
