import pytest

from db_support import add_user
from modules.chat.repository import ChatRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_should_return_the_latest_messages_newest_first_when_no_cursor_is_given(
    connection, token
):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    chat = ChatRepository(connection)
    await chat.insert_message(me, bob, "first")
    second = await chat.insert_message(bob, me, "second")
    third = await chat.insert_message(me, bob, "third")

    page = await chat.list_messages(me, bob, 2, None)

    assert [m.id for m in page] == [third.id, second.id]


async def test_should_return_the_messages_older_than_the_cursor_when_before_is_given(
    connection, token
):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    chat = ChatRepository(connection)
    first = await chat.insert_message(me, bob, "first")
    second = await chat.insert_message(bob, me, "second")
    third = await chat.insert_message(me, bob, "third")

    page = await chat.list_messages(me, bob, 50, third.id)

    assert [m.id for m in page] == [second.id, first.id]


async def test_should_leave_out_other_conversations_when_listing_a_pair(connection, token):
    me = await add_user(connection, token, "me")
    bob = await add_user(connection, token, "bob")
    carol = await add_user(connection, token, "carol")
    chat = ChatRepository(connection)
    to_bob = await chat.insert_message(me, bob, "to bob")
    await chat.insert_message(me, carol, "to carol")
    from_bob = await chat.insert_message(bob, me, "from bob")
    await chat.insert_message(bob, carol, "bob to carol")

    page = await chat.list_messages(me, bob, 50, None)

    assert [m.id for m in page] == [from_bob.id, to_bob.id]
