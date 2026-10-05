import pytest

from modules.users.image_type import detect_image_type

SAMPLES = {
    "jpeg": b"\xff\xd8\xff\xe0\x00\x10JFIF\x00",
    "png": b"\x89PNG\r\n\x1a\n" + b"\x00" * 8,
    "gif": b"GIF89a" + b"\x00" * 8,
    "webp": b"RIFF\x24\x00\x00\x00WEBPVP8 ",
}


@pytest.mark.parametrize("expected", SAMPLES)
def test_should_name_the_format_when_the_bytes_start_with_its_signature(expected):
    assert detect_image_type(SAMPLES[expected]) == expected


@pytest.mark.parametrize(
    "content",
    [b"", b"not an image", b"<svg xmlns='http://www.w3.org/2000/svg'/>", b"RIFF\x00\x00\x00\x00WAVEfmt "],
    ids=["empty", "text", "svg", "riff_wave"],
)
def test_should_return_none_when_the_bytes_are_not_an_allowed_image(content):
    assert detect_image_type(content) is None
