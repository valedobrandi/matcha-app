import jwt
from fastapi import Header

from core.config import settings
from core.exceptions import (
    ExpiredTokenException,
    InvalidTokenException,
    MissingTokenException,
)


async def get_current_user_id(
    authorization: str | None = Header(default=None),
) -> int:
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
    if sub is None:
        raise InvalidTokenException()

    try:
        return int(sub)
    except (ValueError, TypeError):
        raise InvalidTokenException() from None
