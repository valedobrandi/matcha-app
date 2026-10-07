import io

import pytest
from PIL import Image

from modules.users.image_type import detect_image_type


def encoded_image(image_format: str) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(buffer, format=image_format)
    return buffer.getvalue()


@pytest.mark.parametrize("image_format, expected", [("JPEG", "jpeg"), ("PNG", "png"), ("GIF", "gif"), ("WEBP", "webp")])
def test_should_name_the_format_when_the_file_decodes_as_an_allowed_image(image_format, expected):
    assert detect_image_type(encoded_image(image_format)) == expected


@pytest.mark.parametrize(
    "content",
    [
        b"",
        b"not an image",
        b"<svg xmlns='http://www.w3.org/2000/svg'/>",
        b"RIFF\x00\x00\x00\x00WAVEfmt ",
        b"\xff\xd8\xff<html><script>alert(1)</script>",
        b"\x89PNG\r\n\x1a\n" + b"\x00" * 8,
    ],
    ids=["empty", "text", "svg", "riff_wave", "html_behind_a_jpeg_signature", "png_signature_only"],
)
def test_should_return_none_when_the_bytes_are_not_an_allowed_image(content):
    assert detect_image_type(content) is None


def test_should_return_none_when_the_image_is_cut_short():
    assert detect_image_type(encoded_image("PNG")[:-20]) is None


def test_should_return_none_when_the_image_format_is_not_allowed():
    assert detect_image_type(encoded_image("BMP")) is None
