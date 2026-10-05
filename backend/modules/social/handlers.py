from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from modules.social.exceptions import (
    SocialException,
    SocialUserNotFoundException,
    CannotVisitSelfException,
    CannotLikeSelfException,
    ProfilePhotoRequiredException,
    CannotBlockSelfException,
    CannotReportSelfException,
)

_EXCEPTION_STATUS = {
    SocialUserNotFoundException: status.HTTP_404_NOT_FOUND,
    CannotVisitSelfException: status.HTTP_400_BAD_REQUEST,
    CannotLikeSelfException: status.HTTP_400_BAD_REQUEST,
    ProfilePhotoRequiredException: status.HTTP_403_FORBIDDEN,
    CannotBlockSelfException: status.HTTP_400_BAD_REQUEST,
    CannotReportSelfException: status.HTTP_400_BAD_REQUEST,
}

def register_social_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SocialException)
    async def handle_social_exception(_, exc: SocialException):
        status_code = _EXCEPTION_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return JSONResponse(
            status_code=status_code,
            content={"detail": str(exc), "code": exc.code, "field": exc.field},
        )
