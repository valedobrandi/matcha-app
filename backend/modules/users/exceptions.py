class UsersException(Exception):
    """
    Base exception for all users domain errors.
    """
    code: str = "USERS_ERROR"
    field: str | None = None

class UserNotFoundException(UsersException):
    code = "USER_NOT_FOUND"
    field = "None"
    def __init__(self):
        super().__init__("User not found")

class TargetUserNotFoundException(UsersException):
    code = "TARGET_USER_NOT_FOUND"
    field = "None"
    def __init__(self):
        super().__init__("Target user not found")

class FileTooLargeException(UsersException):
    code = "FILE_TOO_LARGE"
    field = "None"
    def __init__(self):
        super().__init__("File too large")

class InvalidPhotoTypeException(UsersException):
    code = "INVALID_PHOTO_TYPE"
    field = "file"
    def __init__(self):
        super().__init__("Invalid photo type")

class MaxPhotosReachedException(UsersException):
    code = "MAX_FIVE_PHOTOS"
    field = "None"
    def __init__(self):
        super().__init__("Max_five_photos")

class EmailAlreadyTakenException(UsersException):
    code = "EMAIL_TAKEN"
    field = "email"
    def __init__(self, email: str):
        super().__init__(f"The email '{email}' is already registered.")

class UsernameAlreadyTakenException(UsersException):
    code = "USERNAME_TAKEN"
    field = "username"
    def __init__(self, username: str):
        super().__init__(f"The username '{username}' is already registered.")