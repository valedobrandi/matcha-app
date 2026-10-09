import uuid
from typing import NamedTuple

import asyncpg
import jwt
from fastapi import Depends, Header

from core.config import settings
from core.database import get_db_connection
from core.exceptions import (
    ExpiredTokenException,
    InvalidTokenException,
    MissingTokenException,
)
from modules.auth.sessions_repository import SessionsRepository


class SessionClaims(NamedTuple):
    user_id: int
    session_id: uuid.UUID


async def read_session_token(
    authorization: str | None = Header(default=None),
) -> SessionClaims:
    if not authorization:
        raise MissingTokenException()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise InvalidTokenException()

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise ExpiredTokenException() from None
    except jwt.PyJWTError:
        raise InvalidTokenException() from None

    sub = payload.get("sub")
    sid = payload.get("sid")
    if sub is None or not isinstance(sid, str):
        raise InvalidTokenException()

    try:
        return SessionClaims(user_id=int(sub), session_id=uuid.UUID(sid))
    except (ValueError, TypeError):
        raise InvalidTokenException() from None


async def get_current_session(
    claims: SessionClaims = Depends(read_session_token),
    connection: asyncpg.Connection = Depends(get_db_connection),
) -> SessionClaims:
    if not await SessionsRepository(connection).is_active(claims.session_id, claims.user_id):
        raise InvalidTokenException()
    return claims


async def get_current_user_id(
    session: SessionClaims = Depends(get_current_session),
) -> int:
    return session.user_id
