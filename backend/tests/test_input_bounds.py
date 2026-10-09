import uuid

import pytest
from fastapi.testclient import TestClient

from core.auth import SessionClaims, get_current_session, get_current_user_id
from core.database import get_db_connection
from core.presence import get_current_user_id_and_touch
from main import app
from modules.auth.schemas import UserRegisterInput

client = TestClient(app, raise_server_exceptions=False)

ABOVE_INT4 = 2_147_483_648
STRONG = "Zq9!Xv7#Lm2$Kp"
LONG_PASSWORD = "Zq9!Xv7#Lm2$Kp" * 6


def register_body(**overrides):
    return {"email": "a@ex.org", "username": "u", "first_name": "A", "last_name": "B", "password": STRONG} | overrides


def profile_body(**overrides):
    return {
        "gender": "male", "age": 20, "bio": "hi", "latitude": 1, "longitude": 1,
        "location_label": "Paris", "location_consent": False,
    } | overrides


@pytest.fixture(autouse=True)
def requests_never_reach_the_database():
    app.dependency_overrides[get_db_connection] = lambda: None
    app.dependency_overrides[get_current_user_id] = lambda: 1
    app.dependency_overrides[get_current_user_id_and_touch] = lambda: 1
    app.dependency_overrides[get_current_session] = lambda: SessionClaims(user_id=1, session_id=uuid.uuid4())
    yield
    app.dependency_overrides.clear()


@pytest.mark.parametrize("method, path, body", [
    ("post", "/auth/register", register_body(username="u" * 51)),
    ("post", "/auth/register", register_body(username="   ")),
    ("post", "/auth/register", register_body(first_name="f" * 51)),
    ("post", "/auth/register", register_body(last_name="")),
    ("post", "/auth/register", register_body(email="a" * 95 + "@ex.org")),
    ("post", "/auth/register", register_body(password=LONG_PASSWORD)),
    ("post", "/auth/reset-password", {"token": "t", "password": LONG_PASSWORD}),
    ("post", "/auth/login", {"username": "u", "password": LONG_PASSWORD}),
    ("patch", "/users/me/account", {"username": "u" * 51, "first_name": "A", "last_name": "B", "email": "a@ex.org"}),
    ("patch", "/users/me/password-change",
     {"current_password": LONG_PASSWORD, "new_password": STRONG, "confirm_password": STRONG}),
    ("post", "/users/me/tags", {"name": "t" * 51}),
    ("post", "/users/me/tags", {"name": "  "}),
    ("patch", "/users/me/profile", profile_body(bio="   ")),
    ("patch", "/users/me/profile", profile_body(bio="b" * 1001)),
    ("patch", "/users/me/profile", profile_body(location_label="l" * 101)),
    ("post", "/chat/conversations/1/read", {"up_to_message_id": ABOVE_INT4}),
], ids=[
    "long_username", "blank_username", "long_first_name", "empty_last_name", "long_email", "long_password",
    "reset_long_password", "login_long_password", "account_long_username", "password_change_long_current",
    "long_tag", "blank_tag", "blank_bio", "long_bio", "long_location", "read_id_above_int4",
])
def test_should_answer_422_when_a_field_is_out_of_bounds(method, path, body):
    assert getattr(client, method)(path, json=body).status_code == 422


@pytest.mark.parametrize("method, path", [
    ("get", f"/users/{ABOVE_INT4}"),
    ("post", f"/social/likes/{ABOVE_INT4}"),
    ("delete", f"/social/blocks/{ABOVE_INT4}"),
    ("post", f"/social/reports/{ABOVE_INT4}"),
    ("get", f"/chat/messages/{ABOVE_INT4}"),
    ("get", f"/chat/messages/1?before={ABOVE_INT4}"),
    ("post", f"/notifications/{ABOVE_INT4}/read"),
    ("delete", f"/users/me/photos/{ABOVE_INT4}"),
    ("delete", f"/users/me/tags/{ABOVE_INT4}"),
    ("get", f"/social/visitors?offset={ABOVE_INT4}"),
    ("get", f"/discovery/search?tag_ids={ABOVE_INT4}"),
    ("get", "/users/0"),
])
def test_should_answer_422_when_an_id_or_offset_does_not_fit_a_postgres_integer(method, path):
    assert getattr(client, method)(path).status_code == 422


def test_should_trim_the_names_and_accept_50_characters_when_registering():
    data = UserRegisterInput(**register_body(username=" " + "u" * 50 + " ", first_name=" Ana "))
    assert (data.username, data.first_name) == ("u" * 50, "Ana")
