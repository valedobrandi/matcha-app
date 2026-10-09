from urllib.parse import parse_qs, urlsplit

from core.upload_urls import VALIDITY_WINDOW_SECONDS, sign_upload_url, upload_url_is_valid
from modules.discovery.schemas import DiscoveryProfileCard
from modules.users.schemas import PhotoOut

NOW = 1_700_000_000.0


def query_of(url: str) -> dict[str, str]:
    return {key: values[0] for key, values in parse_qs(urlsplit(url).query).items()}


def test_should_keep_the_same_url_for_one_to_two_hours_when_it_is_signed_again_within_the_hour():
    url = sign_upload_url("/uploads/a.jpg", now=NOW)

    expires = int(query_of(url)["expires"])
    assert url.startswith("/uploads/a.jpg?")
    assert NOW + VALIDITY_WINDOW_SECONDS <= expires <= NOW + 2 * VALIDITY_WINDOW_SECONDS
    assert sign_upload_url("/uploads/a.jpg", now=NOW + 1) == url


def test_should_leave_the_url_unchanged_when_it_is_not_a_local_upload():
    assert sign_upload_url("https://cdn.example.com/a.jpg", now=NOW) == "https://cdn.example.com/a.jpg"


def test_should_accept_a_signature_only_when_it_was_made_for_that_file_and_has_not_expired():
    query = query_of(sign_upload_url("/uploads/a.jpg", now=NOW))
    expires, signature = query["expires"], query["signature"]

    assert upload_url_is_valid("a.jpg", expires, signature, now=NOW) is True
    assert upload_url_is_valid("b.jpg", expires, signature, now=NOW) is False
    assert upload_url_is_valid("a.jpg", str(int(expires) + VALIDITY_WINDOW_SECONDS), signature, now=NOW) is False
    assert upload_url_is_valid("a.jpg", expires, signature, now=int(expires)) is False


def test_should_sign_photo_urls_only_when_a_response_is_written_as_json():
    photo = PhotoOut(id=1, url="/uploads/a.jpg", is_profile_photo=True)
    card = DiscoveryProfileCard(
        id=1, username="ana", first_name="Ana", last_name="Lee", age=30, gender="female",
        fame_rating=0, liked_by_me=False, profile_photo_url="/uploads/a.jpg",
    )

    assert photo.model_dump()["url"] == "/uploads/a.jpg"
    assert "signature=" in photo.model_dump(mode="json")["url"]
    assert "signature=" in card.model_dump(mode="json")["profile_photo_url"]
