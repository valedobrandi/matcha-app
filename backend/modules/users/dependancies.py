from fastapi import Header
from modules.users.exceptions import (
    MissingAuthorizationHeaderException,
    InvalidAuthorizationHeaderException,
    InvalidAccessTokenException
)


async def get_bearer_token (authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise MissingAuthorizationHeaderException()
    
    if not authorization.startswith("Bearer "):
        raise InvalidAuthorizationHeaderException()
    
    token = authorization[len("Bearer "):].strip()
    if not token:
        raise InvalidAccessTokenException()
    
    return token