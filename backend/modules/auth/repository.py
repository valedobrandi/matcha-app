import datetime
from typing import Any, Optional
import asyncpg
from modules.auth.exceptions import DuplicateEmailException, DuplicateUsernameException, OAuthAccountConflictException
from modules.auth.schemas import UserRecord, UserRegisterInput
from core.config import settings
from modules.notifications.outbox_repository import OutboxRepository

USER_COLUMNS = "id, email, username, first_name, last_name, password_hash, fortytwo_id, is_verified"

class AuthRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def _fetch_one(self, query: str, *args: Any) -> Optional[UserRecord]:
        row = await self.connection.fetchrow(query, *args)
        return UserRecord.model_validate(dict(row)) if row else None

    async def find_by_username(self, username: str) -> Optional[UserRecord]:
        query = f"SELECT {USER_COLUMNS} FROM users WHERE username = $1"
        return await self._fetch_one(query, username)

    async def find_by_email(self, email: str) -> Optional[UserRecord]:
        query = f"SELECT {USER_COLUMNS} FROM users WHERE email = $1"
        return await self._fetch_one(query, email)

    async def find_by_fortytwo_id(self, fortytwo_id: int) -> Optional[UserRecord]:
        query = f"SELECT {USER_COLUMNS} FROM users WHERE fortytwo_id = $1"
        return await self._fetch_one(query, fortytwo_id)

    async def register_user(
        self,
        data: UserRegisterInput,
        hash_password: str,
        email_token: str,
    ) -> UserRecord:
        async with self.connection.transaction():
            user = await self.create_user(data, hash_password, email_token)
            outbox = OutboxRepository(self.connection)
            await outbox.enqueue_verification_email(
                recipient_email=data.email,
                user_id=user.id,
                verification_token=email_token,
                max_attempts=settings.OUTBOX_MAX_ATTEMPTS,
            )
        return user

    async def rotate_verification_token_and_enqueue(
        self,
        user_id: int,
        email: str,
        email_token: str,
    ) -> None:
        async with self.connection.transaction():
            row = await self.connection.fetchrow(
                """
                UPDATE users
                SET verification_token = $1
                WHERE id = $2 AND is_verified = FALSE
                RETURNING id
                """,
                email_token,
                user_id,
            )
            if not row:
                return

            outbox = OutboxRepository(self.connection)
            await outbox.enqueue_verification_email(
                recipient_email=email,
                user_id=user_id,
                verification_token=email_token,
                max_attempts=settings.OUTBOX_MAX_ATTEMPTS,
            )

    async def create_user(
        self, data: UserRegisterInput, hash_password: str, email_token: str
    ) -> UserRecord:
        query = f"""
            INSERT INTO users (email, username, first_name, last_name, password_hash, verification_token)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING {USER_COLUMNS};
        """
        try:
            return await self._fetch_one(
                query,
                data.email,
                data.username,
                data.first_name,
                data.last_name,
                hash_password,
                email_token,
            )

        except asyncpg.UniqueViolationError as exc:
            if exc.constraint_name == "users_email_key":
                raise DuplicateEmailException(data.email) from None
            if exc.constraint_name == "users_username_key":
                raise DuplicateUsernameException(data.username) from None
            raise

    async def create_oauth_user(
        self,
        email: str,
        username: str,
        first_name: str,
        last_name: str,
        fortytwo_id: int,
    ) -> Optional[UserRecord]:
        query = f"""
            INSERT INTO users (email, username, first_name, last_name, fortytwo_id, is_verified)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING {USER_COLUMNS};
        """
        try:
            return await self._fetch_one(
                query,
                email, username, first_name, last_name, fortytwo_id
            )
        except asyncpg.UniqueViolationError:
            raise OAuthAccountConflictException() from None

    async def verify_user_email(self, email_token: str) -> Optional[UserRecord]:
        query = f"""
            UPDATE users SET is_verified = TRUE, verification_token = NULL 
            WHERE verification_token = $1
            RETURNING {USER_COLUMNS};
        """
        return await self._fetch_one(query, email_token)

    async def set_password_reset_token_and_enqueue(
        self,
        user_id: int,
        token: str,
        expires_at: datetime.datetime,
        email: str,
    ) -> None:
        async with self.connection.transaction():
            await self.connection.execute(
                """
                    UPDATE users 
                    SET password_reset_token = $1, password_reset_expires_at = $2 
                    WHERE id = $3
                """,
                token,
                expires_at,
                user_id,
            )

            outbox = OutboxRepository(self.connection)

            await outbox.enqueue_password_reset_email(
                recipient_email=email,
                user_id=user_id,
                reset_token=token,
                max_attempts=settings.OUTBOX_MAX_ATTEMPTS,
            )

    async def reset_password_with_token(
        self, token: str, hash_password: str
    ) -> None | UserRecord:
        query = f"""
            UPDATE users 
                SET password_hash = $2,
                password_reset_token = NULL,
                password_reset_expires_at = NULL
            WHERE password_reset_token = $1
                AND password_reset_expires_at > NOW()
                AND password_hash IS NOT NULL
            RETURNING {USER_COLUMNS};
        """
        return await self._fetch_one(query, token, hash_password)
