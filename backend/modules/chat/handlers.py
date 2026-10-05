from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from modules.chat.exceptions import (
    ChatException,
    NotConnectedException,
    ChatUserNotFoundException,
)

_EXCEPTION_STATUS = {
    NotConnectedException: status.HTTP_403_FORBIDDEN,
    ChatUserNotFoundException: status.HTTP_404_NOT_FOUND,
}


def register_chat_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ChatException)
    async def handle_chat_exception(_, exc: ChatException):
        status_code = _EXCEPTION_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return JSONResponse(
            status_code=status_code,
            content={"detail": str(exc), "code": exc.code, "field": exc.field},
        )
