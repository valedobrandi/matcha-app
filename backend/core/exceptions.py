class AuthException(Exception):
    """Base exception for all authentication domain errors."""
    code: str = "AUTH_ERROR"
    field: str | None = None


class MissingTokenException(AuthException):
    code = "MISSING_TOKEN"

    def __init__(self) -> None:
        super().__init__("Authentication token is required.")


class InvalidTokenException(AuthException):
    code = "INVALID_TOKEN"

    def __init__(self) -> None:
        super().__init__("Invalid authentication token.")


class ExpiredTokenException(AuthException):
    code = "EXPIRED_TOKEN"

    def __init__(self) -> None:
        super().__init__("Authentication token has expired.")
