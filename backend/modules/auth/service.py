import datetime
import uuid
import jwt
import bcrypt
import httpx
from integrations.fortytwo_client import FortyTwoClient, FortyTwoClientException
from core.config import settings
from modules.auth.schemas import CurrentUserResponse, LoginInput, UserRecord, UserRegisterInput
from modules.auth.repository import AuthRepository
from modules.auth.sessions_repository import SessionsRepository
from modules.users.repository import UsersRepository

from modules.auth.exceptions import (
    InvalidCredentialsException,
    AccountNotVerifiedException,
    InvalidResetTokenException,
    OAuthExchangeException,
    InvalidVerificationTokenException,
    InvalidTokenException,
)

TOKEN_LIFETIME = datetime.timedelta(days=1)


class AuthService:
    def __init__(
        self,
        repository: AuthRepository,
        auth_client: FortyTwoClient | None = None,
        sessions: SessionsRepository | None = None,
    ):
        self.repository = repository
        self.sessions = sessions or SessionsRepository(repository.connection)
        self.auth_client = auth_client or FortyTwoClient(
            settings.FT_CLIENT_ID, settings.FT_CLIENT_SECRET, settings.FT_REDIRECT_URI
        )

    def _hash_password(self, plain:str) -> str:
        hashed_bytes = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())
        return hashed_bytes.decode("utf-8")

    def hash_password(self, plain:str) -> str:
        """
        Public entry point for hashing a password. 
        """
        return self._hash_password(plain)

    async def issue_token(self, user_id: int) -> str:
        session_id = await self.sessions.open(user_id, TOKEN_LIFETIME)
        now = datetime.datetime.now(datetime.UTC)
        payload = {
            "sub": str(user_id),
            "sid": str(session_id),
            "exp": int((now + TOKEN_LIFETIME).timestamp()),
            "iat": int(now.timestamp()),
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET.get_secret_value(),
            algorithm=settings.JWT_ALGORITHM,
        )

    async def register_user(self, data: UserRegisterInput) -> UserRecord:

        hashed_str = self._hash_password(data.password)
        email_token = str(uuid.uuid4())

        user = await self.repository.register_user(
            data=data, hash_password=hashed_str, email_token=email_token
        )

        return user

    async def resend_verification_email(self, email: str) -> None:
        user = await self.repository.find_by_email(email)
        if not user or user.is_verified or not user.password_hash:
            return

        email_token = str(uuid.uuid4())
        await self.repository.rotate_verification_token_and_enqueue(
            user_id=user.id, email=user.email, email_token=email_token
        )

    async def login_user(self, credentials: LoginInput) -> str:
        user = await self.repository.find_by_username(credentials.username)
        if not user or not user.password_hash:
            raise InvalidCredentialsException()

        if not bcrypt.checkpw(
            credentials.password.encode("utf-8"), user.password_hash.encode("utf-8")
        ):
            raise InvalidCredentialsException()

        if not user.is_verified:
            raise AccountNotVerifiedException()

        return await self.issue_token(user.id)

    async def handle_fortytwo_callback(self, code: str) -> str:
        try:
            profile = await self.auth_client.authenticate(code)
        except (httpx.HTTPError, FortyTwoClientException):
            raise OAuthExchangeException() from None

        required = ("id", "email", "login", "first_name", "last_name")
        if not all(key in profile for key in required):
            raise OAuthExchangeException()

        fortytwo_id = int(profile["id"])
        user = await self.repository.find_by_fortytwo_id(fortytwo_id)

        if not user:
            user = await self.repository.create_oauth_user(
                email=profile["email"],
                username=profile["login"],
                first_name=profile["first_name"],
                last_name=profile["last_name"],
                fortytwo_id=fortytwo_id,
            )

            if not user:
                raise OAuthExchangeException()

        return await self.issue_token(user.id)

    async def verify_user_email(self, email_token: str) -> UserRecord:
        user = await self.repository.verify_user_email(email_token)
        if not user:
            raise InvalidVerificationTokenException()
        return user

    async def verify_user_email_and_issue_token(self, email_token: str) -> str:
        user = await self.verify_user_email(email_token)
        return await self.issue_token(user.id)

    async def request_password_reset(self, email: str) -> None:
        user = await self.repository.find_by_email(email)
        if not user or not user.password_hash:
            return

        token = str(uuid.uuid4())
        await self.repository.set_password_reset_token_and_enqueue(
            user_id=user.id,
            token=token,
            valid_for=datetime.timedelta(hours=1),
            email=user.email,
        )

    async def reset_password(self, token: str, new_password: str) -> str:
        hashed_str = self._hash_password(new_password)

        user = await self.repository.reset_password_with_token(token, hashed_str)
        if not user:
            raise InvalidResetTokenException()
        return await self.issue_token(user.id)

    async def get_current_user(self, user_id: int) -> CurrentUserResponse:
        user = await self.repository.find_by_id(user_id)
        if not user:
            raise InvalidTokenException()
        profile_completed = await UsersRepository(self.repository.connection).is_profile_completed(user_id)

        return CurrentUserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            email_verified=user.is_verified,
            profile_completed=profile_completed,
            has_password=user.password_hash is not None,
        )
