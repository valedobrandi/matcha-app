"""Runs the profile_completeness view (migrations 0012 and 0014) on a real Postgre.

The view is the only owner of the "profile completed" rule. /users/me, the session
contract and discovery all read it. See test_discovery_visibility_integration.py for how to
run these tests.
"""
import pytest

from db_support import add_user
from modules.users.repository import UsersRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_should_report_completed_when_every_required_part_is_present(connection, token, tag_id):
    user = await add_user(connection, token, "complete", tag_ids=[tag_id])

    assert await UsersRepository(connection).is_profile_completed(user) is True


@pytest.mark.parametrize(
    "missing",
    [
        {"photo": False},
        {"tag_ids": ()},
        {"bio": None},
        {"age": None},
        {"gender": None},
    ],
    ids=["no_photo", "no_tags", "no_bio", "no_age", "no_gender"],
)
async def test_should_report_incomplete_when_a_required_part_is_missing(connection, token, tag_id, missing):
    user = await add_user(connection, token, "incomplete", **{"tag_ids": [tag_id], **missing})

    assert await UsersRepository(connection).is_profile_completed(user) is False

async def test_should_report_completed_when_the_orientation_is_not_specified(connection, token, tag_id):
    user = await add_user(connection, token, "unspecified", tag_ids=[tag_id], sexual_preference=None)

    assert await UsersRepository(connection).is_profile_completed(user) is True

async def test_should_report_incomplete_when_the_user_does_not_exist(connection):
    assert await UsersRepository(connection).is_profile_completed(2**31 - 1) is False
