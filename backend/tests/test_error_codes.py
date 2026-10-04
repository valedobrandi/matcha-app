from core.error_codes import ErrorCode
from core.exceptions import AuthException
from main import app
from modules.chat.exceptions import ChatException
from modules.discovery.exceptions import DiscoveryException
from modules.notifications.exceptions import NotificationsException
from modules.social.exceptions import SocialException
from modules.tags.exceptions import TagsException
from modules.users.exceptions import UsersException

BASES = (
    AuthException,
    ChatException,
    DiscoveryException,
    NotificationsException,
    SocialException,
    TagsException,
    UsersException,
)


def _all_subclasses(cls: type) -> set[type]:
    found: set[type] = set()
    for sub in cls.__subclasses__():
        found |= {sub} | _all_subclasses(sub)
    return found


def _declared_code(cls: type) -> str | None:
    code = getattr(cls, "code", None)
    if isinstance(code, str):
        return code
    try:
        return cls().code
    except TypeError:
        return None


def test_should_list_every_exception_code_when_exceptions_are_declared():
    declared = {
        code
        for base in BASES
        for cls in {base} | _all_subclasses(base)
        if (code := _declared_code(cls)) is not None
    }
    assert declared
    assert declared - {c.value for c in ErrorCode} == set()


def test_should_publish_error_contract_when_openapi_is_generated():
    schemas = app.openapi()["components"]["schemas"]
    assert set(schemas["ErrorCode"]["enum"]) == {c.value for c in ErrorCode}
    assert set(schemas["ErrorResponse"]["required"]) == {"detail", "code", "field"}
