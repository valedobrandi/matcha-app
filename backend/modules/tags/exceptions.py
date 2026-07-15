class TagsException(Exception):
    code: str = "TAGS_ERROR"
    field: str | None = None

class TagContentProfanity(TagsException):
    code = "TAG_CONTENT_PROFANITY"
    field = "tags"
    def __init__(self):
        super().__init__("Tag content contains profanity")