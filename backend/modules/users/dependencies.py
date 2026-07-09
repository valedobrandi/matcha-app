from fastapi import Header, Depends
import jwt
from core.config import settings
from modules.users.exceptions import (
    MissingAuthorizationHeaderException,
    InvalidAuthorizationHeaderException,
    InvalidAccessTokenException
)


async def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise MissingAuthorizationHeaderException()
    
    if not authorization.startswith("Bearer "):
        raise InvalidAuthorizationHeaderException()
    
    token = authorization[len("Bearer "):].strip()
    if not token:
        raise InvalidAccessTokenException()
    
    return token

async def get_current_user_id(token: str = Depends(get_bearer_token)) ->int:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        raise InvalidAccessTokenException()
    sub = payload.get("sub")
    if sub is None:        
        raise InvalidAccessTokenException()
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise InvalidAccessTokenException()
            
    return user_id
