from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient

from core.upload_urls import VALIDITY_WINDOW_SECONDS, sign_upload_url, upload_url_is_valid
from main import app
from modules.discovery.schemas import DiscoveryProfileCard
from modules.users import controller as users_controller
from modules.users.schemas import PhotoOut

client = TestClient(app)

NOW = 1_700_000_000.0


def query_of(url: str) -> dict[str, str]:
    return {key: values[0] for key, values in parse_qs(urlsplit(url).query).items()}


def test_should_sign_a_local_upload_for_at_least_an_hour_and_the_same_way_within_that_hour():
    url = sign_upload_url("/uploads/a.jpg", now=NOW)

    expires = int(query_of(url)["expires"])
    assert url.startswith("/uploads/a.jpg?")
    assert NOW + VALIDITY_WINDOW_SECONDS <= expires <= NOW + 2 * VALIDITY_WINDOW_SECONDS
    assert sign_upload_url("/uploads/a.jpg", now=NOW + 1) == url


def test_should_leave_a_url_that_is_not_a_local_upload_unchanged():
    assert sign_upload_url("https://cdn.example.com/a.jpg", now=NOW) == "https://cdn.example.com/a.jpg"


def test_should_accept_only_the_signature_made_for_that_file_and_only_before_it_expires():
    query = query_of(sign_upload_url("/uploads/a.jpg", now=NOW))
    expires, signature = int(query["expires"]), query["signature"]

    assert upload_url_is_valid("a.jpg", expires, signature, now=NOW) is True
    assert upload_url_is_valid("b.jpg", expires, signature, now=NOW) is False
    assert upload_url_is_valid("a.jpg", expires + VALIDITY_WINDOW_SECONDS, signature, now=NOW) is False
    assert upload_url_is_valid("a.jpg", expires, signature, now=expires) is False


def test_should_sign_photo_urls_only_when_a_response_is_written_as_json():
    photo = PhotoOut(id=1, url="/uploads/a.jpg", is_profile_photo=True)
    card = DiscoveryProfileCard(
        id=1, username="ana", first_name="Ana", last_name="Lee", age=30, gender="female",
        fame_rating=0, liked_by_me=False, profile_photo_url="/uploads/a.jpg",
    )

    assert photo.model_dump()["url"] == "/uploads/a.jpg"
    assert "signature=" in photo.model_dump(mode="json")["url"]
    assert "signature=" in card.model_dump(mode="json")["profile_photo_url"]


def test_should_serve_a_photo_only_through_a_valid_signed_url(monkeypatch, tmp_path):
    (tmp_path / "a.jpg").write_bytes(b"jpeg-bytes")
    monkeypatch.setattr(users_controller, "UPLOAD_DIR", tmp_path)
    signed = sign_upload_url("/uploads/a.jpg")
    query = query_of(signed)

    served = client.get(signed)

    assert (served.status_code, served.content) == (200, b"jpeg-bytes")
    assert client.get("/uploads/a.jpg").status_code == 404
    assert client.get(f"/uploads/b.jpg?expires={query['expires']}&signature={query['signature']}").status_code == 404
    assert client.get(sign_upload_url("/uploads/missing.jpg")).status_code == 404
