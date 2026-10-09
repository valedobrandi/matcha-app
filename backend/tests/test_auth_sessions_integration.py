"""Runs the auth session queries (migration 0018) on a real Postgres.

See test_discovery_visibility_integration.py for how to run these tests.
"""
import datetime
import uuid

import pytest

from db_support import add_user
from modules.auth.sessions_repository import SessionsRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

DAY = datetime.timedelta(days=1)


async def test_should_find_an_opened_session_active_for_its_own_user_only(connection, token):
    owner = await add_user(connection, token, "owner")
    other = await add_user(connection, token, "other")
    sessions = SessionsRepository(connection)

    session_id = await sessions.open(owner, DAY)

    assert await sessions.is_active(session_id, owner) is True
    assert await sessions.is_active(session_id, other) is False


async def test_should_not_find_a_session_active_once_it_has_expired(connection, token):
    user = await add_user(connection, token, "expired")
    sessions = SessionsRepository(connection)

    session_id = await sessions.open(user, datetime.timedelta(seconds=-1))

    assert await sessions.is_active(session_id, user) is False


async def test_should_not_find_a_session_active_when_it_was_never_opened(connection, token):
    user = await add_user(connection, token, "nobody")

    assert await SessionsRepository(connection).is_active(uuid.uuid4(), user) is False
