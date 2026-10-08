"""Names the image format of an upload by decoding it with Pillow.

Only the formats the profile photo upload allows are recognised. A file that does not decode
completely as one of them, including one that only starts like an image, returns None.
"""

import io
import warnings

from PIL import Image

_FORMATS = {"JPEG": "jpeg", "PNG": "png", "GIF": "gif", "WEBP": "webp"}


def detect_image_type(content: bytes) -> str | None:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                image_format = image.format
                image.load()
    except (OSError, SyntaxError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        return None
    return _FORMATS.get(image_format or "")
