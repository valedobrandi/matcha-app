"""Runs the password change and the sessions it ends on a real Postgres (`pytest -m integration`)."""
import pytest

from modules.auth.repository import AuthRepository
from modules.auth.service import TOKEN_LIFETIME, AuthService
from modules.auth.sessions_repository import SessionsRepository
from modules.social.repository import SocialRepository
from modules.users.repository import UsersRepository
from modules.users.schemas import PasswordChangeInput
from modules.users.service import UsersService

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_should_keep_the_current_session_and_end_the_others_when_the_password_changes(connection, token):
    password_hash = AuthService(AuthRepository(connection)).hash_password("OldPass123!")
    user_id = await connection.fetchval(
        """
        INSERT INTO users (email, username, first_name, last_name, password_hash, is_verified)
        VALUES ($1, $2, 'Change', 'Tester', $3, TRUE)
        RETURNING id
        """,
        f"{token}@example.com", f"{token}change", password_hash,
    )
    sessions = SessionsRepository(connection)
    current = await sessions.open(user_id, TOKEN_LIFETIME)
    other_device = await sessions.open(user_id, TOKEN_LIFETIME)
    service = UsersService(UsersRepository(connection), SocialRepository(connection))

    await service.change_password(
        PasswordChangeInput(current_password="OldPass123!", new_password="Xk9#mQvzTr4!!", confirm_password="Xk9#mQvzTr4!!"),
        user_id,
        current,
    )

    assert await sessions.is_active(current, user_id) is True
    assert await sessions.is_active(other_device, user_id) is False
