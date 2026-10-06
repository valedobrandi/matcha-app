from datetime import datetime

import pytest

from db_support import add_block, add_like, add_user
from modules.social.repository import SocialRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

MANY = 1000


async def connect(connection, a, b) -> None:
    await add_like(connection, a, b)
    await add_like(connection, b, a)


async def connection_ids(connection, user_id) -> list[int]:
    return [c.id for c in await SocialRepository(connection).list_connections(user_id, MANY, 0)]


async def test_should_list_only_mutual_active_likes_when_listing_connections(connection, token):
    me = await add_user(connection, token, "me")
    mutual = await add_user(connection, token, "mutual")
    liked_by_me = await add_user(connection, token, "likedbyme")
    liking_me = await add_user(connection, token, "likingme")
    lapsed = await add_user(connection, token, "lapsed")
    await connect(connection, me, mutual)
    await add_like(connection, me, liked_by_me)
    await add_like(connection, liking_me, me)
    await add_like(connection, me, lapsed)
    await add_like(connection, lapsed, me, status="inactive")

    assert await connection_ids(connection, me) == [mutual]


async def test_should_list_the_newest_connection_first_when_its_second_like_is_the_latest(
    connection, token
):
    me = await add_user(connection, token, "me")
    older = await add_user(connection, token, "older")
    newer = await add_user(connection, token, "newer")
    await add_like(connection, me, older, at=datetime(2026, 1, 1))
    await add_like(connection, older, me, at=datetime(2026, 1, 2))
    await add_like(connection, newer, me, at=datetime(2025, 12, 1))
    await add_like(connection, me, newer, at=datetime(2026, 1, 3))

    connections = await SocialRepository(connection).list_connections(me, MANY, 0)

    assert [(c.id, c.connected_at) for c in connections] == [
        (newer, datetime(2026, 1, 3)),
        (older, datetime(2026, 1, 2)),
    ]


async def test_should_hide_a_connection_when_a_block_is_active_either_way(connection, token):
    me = await add_user(connection, token, "me")
    blocked_by_me = await add_user(connection, token, "blockedbyme")
    blocking_me = await add_user(connection, token, "blockingme")
    other = await add_user(connection, token, "other")
    for user in (blocked_by_me, blocking_me, other):
        await connect(connection, me, user)
    await add_block(connection, me, blocked_by_me)
    await add_block(connection, blocking_me, me)

    assert await connection_ids(connection, me) == [other]


async def test_should_bring_a_connection_back_when_the_block_is_lifted(connection, token):
    me = await add_user(connection, token, "me")
    peer = await add_user(connection, token, "peer")
    await connect(connection, me, peer)
    await add_block(connection, me, peer, status="inactive")

    assert await connection_ids(connection, me) == [peer]


async def test_should_agree_on_who_is_connected_in_the_list_the_check_and_the_relationship(
    connection, token
):
    me = await add_user(connection, token, "me")
    mutual = await add_user(connection, token, "mutual")
    one_way = await add_user(connection, token, "oneway")
    lapsed = await add_user(connection, token, "lapsed")
    await connect(connection, me, mutual)
    await add_like(connection, me, one_way)
    await add_like(connection, me, lapsed)
    await add_like(connection, lapsed, me, status="inactive")
    social = SocialRepository(connection)

    listed = set(await connection_ids(connection, me))
    checked = {u for u in (mutual, one_way, lapsed) if await social.is_connected(me, u)}
    flagged = {
        u for u in (mutual, one_way, lapsed)
        if (await social.get_relationship_flags(me, u)).connected
    }

    assert listed == checked == flagged == {mutual}
