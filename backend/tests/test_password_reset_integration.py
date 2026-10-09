"""Runs the password reset SQL on a real Postgres (`pytest -m integration`)."""
import datetime

import jwt
import pytest
import uuid

from core.config import settings
from core.ws_hub import ConnectionHub
from modules.auth.repository import AuthRepository
from modules.auth.service import TOKEN_LIFETIME, AuthService
from modules.auth.sessions_repository import SessionsRepository

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def add_user_with_password(connection, token) -> str:
    service = AuthService(AuthRepository(connection), ConnectionHub())
    email = f"{token}@example.com"
    await connection.execute(
        """
        INSERT INTO users (email, username, first_name, last_name, password_hash, is_verified)
        VALUES ($1, $2, 'Reset', 'Tester', $3, TRUE)
        """,
        email, f"{token}reset", service.hash_password("OldPass123!"),
    )
    return email


async def test_should_reset_the_password_when_the_requested_token_is_used(connection, token):
    email = await add_user_with_password(connection, token)
    service = AuthService(AuthRepository(connection), ConnectionHub())

    await service.request_password_reset(email)
    reset_token = await connection.fetchval(
        "SELECT password_reset_token FROM users WHERE email = $1", email
    )

    assert await service.reset_password(reset_token, "NewPass123!")


async def test_should_end_every_older_session_and_open_a_new_one_when_the_password_is_reset(connection, token):
    email = await add_user_with_password(connection, token)
    user_id = await connection.fetchval("SELECT id FROM users WHERE email = $1", email)
    sessions = SessionsRepository(connection)
    older = await sessions.open(user_id, TOKEN_LIFETIME)
    service = AuthService(AuthRepository(connection), ConnectionHub())
    await service.request_password_reset(email)
    reset_token = await connection.fetchval("SELECT password_reset_token FROM users WHERE email = $1", email)

    access_token = await service.reset_password(reset_token, "NewPass123!")

    claims = jwt.decode(access_token, settings.JWT_SECRET.get_secret_value(), algorithms=[settings.JWT_ALGORITHM])
    assert await sessions.is_active(older, user_id) is False
    assert await sessions.is_active(uuid.UUID(claims["sid"]), user_id) is True


async def test_should_keep_the_reset_token_valid_for_one_hour_when_a_reset_is_requested(
    connection, token
):
    email = await add_user_with_password(connection, token)

    await AuthService(AuthRepository(connection), ConnectionHub()).request_password_reset(email)
    valid_for = await connection.fetchval(
        "SELECT password_reset_expires_at - NOW() FROM users WHERE email = $1", email
    )

    assert datetime.timedelta(minutes=59) < valid_for <= datetime.timedelta(hours=1)
