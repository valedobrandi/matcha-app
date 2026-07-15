from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from modules.users.exceptions import (
    UsersException,
    MissingAuthorizationHeaderException,
    InvalidAuthorizationHeaderException,
    InvalidAccessTokenException,
    UserNotFoundException,
    FileTooLargeException
)

_EXCEPTION_STATUS = {
    MissingAuthorizationHeaderException: status.HTTP_401_UNAUTHORIZED,
    InvalidAuthorizationHeaderException: status.HTTP_401_UNAUTHORIZED,
    InvalidAccessTokenException: status.HTTP_401_UNAUTHORIZED,
    UserNotFoundException: status.HTTP_404_NOT_FOUND,
    FileTooLargeException: status.HTTP_413_CONTENT_TOO_LARGE
}


def register_users_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UsersException)
    async def handle_user_exception(_, exc: UsersException):
        status_code = _EXCEPTION_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return JSONResponse(status_code=status_code,
                            content={
                                "detail": str(exc),
                                "code": exc.code,
                                "field": exc.field
                            })
