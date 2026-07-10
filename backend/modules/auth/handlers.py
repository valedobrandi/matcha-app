from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

from modules.auth.exceptions import (
    AccountNotVerifiedException,
    AuthException,
    DuplicateEmailException,
    DuplicateUsernameException,
    ExpiredTokenException,
    InvalidCredentialsException,
    InvalidResetTokenException,
    InvalidTokenException,
    InvalidVerificationTokenException,
    MissingTokenException,
    OAuthAccountConflictException,
    OAuthExchangeException,
)

_EXCEPTION_STATUS = {
    DuplicateEmailException: status.HTTP_409_CONFLICT,
    DuplicateUsernameException: status.HTTP_409_CONFLICT,
    InvalidCredentialsException: status.HTTP_401_UNAUTHORIZED,
    MissingTokenException: status.HTTP_401_UNAUTHORIZED,
    InvalidTokenException: status.HTTP_401_UNAUTHORIZED,
    ExpiredTokenException: status.HTTP_401_UNAUTHORIZED,
    AccountNotVerifiedException: status.HTTP_403_FORBIDDEN,
    OAuthExchangeException: status.HTTP_400_BAD_REQUEST,
    InvalidVerificationTokenException: status.HTTP_400_BAD_REQUEST,
    OAuthAccountConflictException: status.HTTP_409_CONFLICT,
    InvalidResetTokenException: status.HTTP_400_BAD_REQUEST,
}


def register_auth_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AuthException)
    async def handle_auth_exception(_, exc: AuthException):
        status_code = _EXCEPTION_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return JSONResponse(status_code=status_code,
         content={"detail": str(exc), "code": exc.code, "field": exc.field})