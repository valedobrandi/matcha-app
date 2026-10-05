"""Names the image format of an upload from its leading bytes.

Replaces the standard-library imghdr (deprecated in 3.11, removed in 3.13). Only the formats
the profile photo upload allows are recognised; anything else, including SVG, returns None.
"""

_SIGNATURES = (
    ("jpeg", lambda head: head.startswith(b"\xff\xd8\xff")),
    ("png", lambda head: head.startswith(b"\x89PNG\r\n\x1a\n")),
    ("gif", lambda head: head.startswith((b"GIF87a", b"GIF89a"))),
    ("webp", lambda head: head[:4] == b"RIFF" and head[8:12] == b"WEBP"),
)


def detect_image_type(content: bytes) -> str | None:
    head = content[:12]
    return next((name for name, matches in _SIGNATURES if matches(head)), None)
