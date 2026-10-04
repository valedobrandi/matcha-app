class SocialException(Exception):
    code: str = "SOCIAL_ERROR"
    field: str | None = None

class SocialUserNotFoundException(SocialException):
    code = "TARGET_USER_NOT_FOUND"
    field = None
    def __init__(self):
        super().__init__("Target user not found")

class CannotVisitSelfException(SocialException):
    code = "CANNOT_VISIT_SELF"
    field = "target_user_id"
    def __init__(self):
        super().__init__("Cannot visit your own profile")

class CannotLikeSelfException(SocialException):
    code = "CANNOT_LIKE_SELF"
    field = "target_user_id"
    def __init__(self):
        super().__init__("Cannot like yourself")

class ProfilePhotoRequiredException(SocialException):
    code = "PROFILE_PHOTO_REQUIRED"
    field = "photos"
    def __init__(self):
        super().__init__("A profile photo is required to like someone")

class CannotBlockSelfException(SocialException):
    code = "CANNOT_BLOCK_SELF"
    field = "target_user_id"
    def __init__(self):
        super().__init__("Cannot block yourself")

class CannotReportSelfException(SocialException):
    code = "CANNOT_REPORT_SELF"
    field = "target_user_id"
    def __init__(self):
        super().__init__("Cannot report yourself")

class BlockedException(SocialException):
    code = "BLOCKED"
    field = None
    def __init__(self):
        super().__init__("Action not allowed because of a block")
