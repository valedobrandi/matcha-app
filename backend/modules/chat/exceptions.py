class ChatException(Exception):
    def __init__(self, message: str, code: str, field: str | None = None):
        self.message = message
        self.code = code
        self.field = field
        super().__init__(message)

    def __str__(self) -> str:
        return self.message


class NotConnectedException(ChatException):
    def __init__(self):
        super().__init__(
            "Users must be connected to chat",
            "CHAT_NOT_CONNECTED",
        )


class ChatUserNotFoundException(ChatException):
    def __init__(self):
        super().__init__("User not found", "CHAT_USER_NOT_FOUND")
