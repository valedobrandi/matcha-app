from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from modules.users.exceptions import (
    UsersException,
    UserNotFoundException,
    FileTooLargeException,
    InvalidPhotoTypeException,
    MaxPhotosReachedException
)

_EXCEPTION_STATUS = {
    UserNotFoundException: status.HTTP_404_NOT_FOUND,
    FileTooLargeException: status.HTTP_413_CONTENT_TOO_LARGE,
    InvalidPhotoTypeException: status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
    MaxPhotosReachedException: status.HTTP_406_NOT_ACCEPTABLE
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
