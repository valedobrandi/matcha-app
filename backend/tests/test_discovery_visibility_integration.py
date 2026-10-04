"""Runs the viewer-visibility SQL of discovery on a real Postgres.

Not part of the default run. From backend/, with `docker compose up -d database` running
and the schema migrated (`python -m database.migrate`):

    pytest -m integration

Fixtures and row builders live in conftest.py and db_support.py. Each test finds its own
users through a unique name token, so rows that already exist in the database do not
change the result.
"""
import pytest

from db_support import add_block, add_user
from modules.discovery.repository import DiscoveryRepository
from modules.discovery.schemas import DiscoveryQuery

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

MANY = 1000


async def search_ids(connection, viewer_id, term, limit=MANY) -> list[int]:
    profiles = await DiscoveryRepository(connection).search_by_name(viewer_id, term, limit)
    return [p.id for p in profiles]


async def test_should_return_only_the_four_public_fields_and_never_the_viewer_when_term_matches(
    connection, token, tag_id
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id])
    alice = await add_user(connection, token, "alice", tag_ids=[tag_id])

    profiles = await DiscoveryRepository(connection).search_by_name(viewer, token, MANY)

    assert [p.id for p in profiles] == [alice]
    assert set(profiles[0].model_dump()) == {"id", "username", "first_name", "last_name"}


async def test_should_exclude_users_blocked_in_either_direction_when_the_block_is_active(
    connection, token, tag_id
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id])
    blocked_by_viewer = await add_user(connection, token, "blockedbyme", tag_ids=[tag_id])
    blocking_viewer = await add_user(connection, token, "blockingme", tag_ids=[tag_id])
    inactive_block = await add_user(connection, token, "inactiveblock", tag_ids=[tag_id])
    await add_block(connection, viewer, blocked_by_viewer)
    await add_block(connection, blocking_viewer, viewer)
    await add_block(connection, viewer, inactive_block, status="inactive")

    assert await search_ids(connection, viewer, token) == [inactive_block]


@pytest.mark.parametrize(
    "missing",
    [{"photo": False}, {"tag_ids": ()}, {"bio": None}, {"age": None}],
    ids=["no_photo", "no_tags", "no_bio", "no_age"],
)
async def test_should_exclude_incomplete_profiles_when_a_required_part_is_missing(
    connection, token, tag_id, missing
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id])
    complete = await add_user(connection, token, "complete", tag_ids=[tag_id])
    await add_user(connection, token, "incomplete", **{"tag_ids": [tag_id], **missing})

    assert await search_ids(connection, viewer, token) == [complete]


@pytest.mark.parametrize("wildcard", ["%", "_", "\\"])
async def test_should_match_wildcard_characters_literally_when_the_term_contains_them(
    connection, token, tag_id, wildcard
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id])
    mine = [await add_user(connection, token, name, tag_ids=[tag_id]) for name in ("alice", "bob")]

    found = await search_ids(connection, viewer, wildcard)

    assert not set(mine) & set(found)


async def test_should_order_by_username_and_cap_at_the_limit_when_many_users_match(
    connection, token, tag_id
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id])
    await add_user(connection, token, "carol", tag_ids=[tag_id])
    alice = await add_user(connection, token, "alice", tag_ids=[tag_id])
    bob = await add_user(connection, token, "bob", tag_ids=[tag_id])

    assert await search_ids(connection, viewer, token, limit=2) == [alice, bob]


async def test_should_apply_the_same_visibility_rules_to_suggest_and_search_when_a_user_is_blocked(
    connection, token, tag_id
):
    viewer = await add_user(connection, token, "viewer", tag_ids=[tag_id])
    visible = await add_user(connection, token, "visible", tag_ids=[tag_id])
    blocked = await add_user(connection, token, "blocked", tag_ids=[tag_id])
    await add_block(connection, viewer, blocked)
    query = DiscoveryQuery(
        viewer_id=viewer, viewer_lat=None, viewer_lon=None,
        candidate_genders=["female"], interested_in_viewer_prefs=["bisexual"],
        tag_ids=[tag_id], sort="fame", order="desc", limit=MANY, offset=0,
    )

    cards = await DiscoveryRepository(connection).list_profiles(query)

    assert [card.id for card in cards] == [visible]
