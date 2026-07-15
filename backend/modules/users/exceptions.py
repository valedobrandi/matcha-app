class UsersException(Exception):
    """
    Base exception for all users domain errors.
    """
    code: str = "USERS_ERROR"
    field: str | None = None

class MissingAuthorizationHeaderException(UsersException):
    code = "MISSING_AUTHORIZATION_HEADER"
    field = "authorization"
    def __init__(self):
        super().__init__("Missing authorization header")

class InvalidAuthorizationHeaderException(UsersException):
    code = "INVALID_AUTHORIZATION_HEADER"
    field = "authorization"
    def __init__(self):
        super().__init__("Invalid authorization scheme")

class InvalidAccessTokenException(UsersException):
    code = "INVALID_ACCESS_TOKEN"
    field = "authorization"
    def __init__(self):
        super().__init__("Invalid access token")

class UserNotFoundException(UsersException):
    code = "USER_NOT_FOUND"
    field = "None"
    def __init__(self):
        super().__init__("User not found")

class FileTooLargeException(UsersException):
    code = "FILE_TOO_LARGE"
    field = "None"
    def __init__(self):
        super().__init__("File too large")
