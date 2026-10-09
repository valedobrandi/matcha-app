import base64
import hashlib
import hmac
import time
from typing import Annotated

from pydantic import PlainSerializer

from core.config import settings

UPLOADS_PATH = "/uploads/"
VALIDITY_WINDOW_SECONDS = 3600


def _signature(file_name: str, expires: int) -> str:
    key = hmac.new(settings.JWT_SECRET.get_secret_value().encode(), b"upload-urls", hashlib.sha256).digest()
    digest = hmac.new(key, f"{file_name}:{expires}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def sign_upload_url(url: str, now: float | None = None) -> str:
    if not url.startswith(UPLOADS_PATH):
        return url
    current = time.time() if now is None else now
    expires = (int(current) // VALIDITY_WINDOW_SECONDS + 2) * VALIDITY_WINDOW_SECONDS
    file_name = url[len(UPLOADS_PATH):]
    return f"{url}?expires={expires}&signature={_signature(file_name, expires)}"


def upload_url_is_valid(file_name: str, expires: int, signature: str, now: float | None = None) -> bool:
    current = time.time() if now is None else now
    return expires > current and hmac.compare_digest(signature.encode(), _signature(file_name, expires).encode())


UploadUrl = Annotated[str, PlainSerializer(sign_upload_url, return_type=str, when_used="json")]
