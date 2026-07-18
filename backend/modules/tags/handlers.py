from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from modules.tags.exceptions import (
    TagsException,
    TagContentProfanity,
)

_EXCEPTION_STATUS = {
    TagContentProfanity: status.HTTP_400_BAD_REQUEST
}

def register_tags_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(TagsException)
    async def handle_tags_exception(_, exc: TagsException):
        status_code = _EXCEPTION_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return JSONResponse(status_code=status_code,
                     content={
                         "detail": str(exc),
                         "code": exc.code,
                         "field": exc.field
                     })
