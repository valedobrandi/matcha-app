from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient

from core.upload_urls import sign_upload_url
from main import app
from modules.users import controller as users_controller

client = TestClient(app)


def query_of(url: str) -> dict[str, str]:
    return {key: values[0] for key, values in parse_qs(urlsplit(url).query).items()}


def test_should_serve_the_photo_only_when_its_url_carries_a_valid_signature(monkeypatch, tmp_path):
    (tmp_path / "a.jpg").write_bytes(b"jpeg-bytes")
    monkeypatch.setattr(users_controller, "UPLOAD_DIR", tmp_path)
    signed = sign_upload_url("/uploads/a.jpg")
    query = query_of(signed)

    served = client.get(signed)

    assert (served.status_code, served.content) == (200, b"jpeg-bytes")
    assert client.get("/uploads/a.jpg").status_code == 404
    assert client.get(f"/uploads/b.jpg?expires={query['expires']}&signature={query['signature']}").status_code == 404
    assert client.get(sign_upload_url("/uploads/missing.jpg")).status_code == 404


def test_should_answer_an_empty_404_when_the_signature_is_not_ascii():
    response = client.get("/uploads/a.jpg?expires=9999999999&signature=%C3%A9")

    assert (response.status_code, response.content) == (404, b"")
