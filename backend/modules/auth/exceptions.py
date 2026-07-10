from core.exceptions import (
    AuthException,
    ExpiredTokenException,
    InvalidTokenException,
    MissingTokenException,
)

__all__ = [
    "AuthException",
    "DuplicateEmailException",
    "DuplicateUsernameException",
    "InvalidCredentialsException",
    "AccountNotVerifiedException",
    "OAuthExchangeException",
    "InvalidVerificationTokenException",
    "InvalidResetTokenException",
    "OAuthAccountConflictException",
    "MissingTokenException",
    "InvalidTokenException",
    "ExpiredTokenException",
]


class DuplicateEmailException(AuthException):
    code = "EMAIL_TAKEN"
    field = "email"

    def __init__(self, email: str) -> None:
        super().__init__(f"The email '{email}' is already registered.")


class DuplicateUsernameException(AuthException):
    code = "USERNAME_TAKEN"
    field = "username"

    def __init__(self, username: str) -> None:
        super().__init__(f"The username '{username}' is already taken.")


class InvalidCredentialsException(AuthException):
    code = "INVALID_CREDENTIALS"

    def __init__(self) -> None:
        super().__init__("Invalid username or password.")


class AccountNotVerifiedException(AuthException):
    code = "ACCOUNT_NOT_VERIFIED"

    def __init__(self) -> None:
        super().__init__("This account has not been verified via email yet.")


class OAuthExchangeException(AuthException):
    code = "OAUTH_EXCHANGE_FAILED"

    def __init__(self) -> None:
        super().__init__("Failed to exchange OAuth code for access token.")


class InvalidVerificationTokenException(AuthException):
    code = "INVALID_VERIFICATION_TOKEN"

    def __init__(self) -> None:
        super().__init__("Invalid or expired verification token.")


class InvalidResetTokenException(AuthException):
    code = "INVALID_RESET_TOKEN"

    def __init__(self) -> None:
        super().__init__("Invalid or expired password reset token.")


class OAuthAccountConflictException(AuthException):
    code = "OAUTH_ACCOUNT_CONFLICT"

    def __init__(self) -> None:
        super().__init__(
            "An account exists with this email or username. "
            "Please login with your credentials."
        )
