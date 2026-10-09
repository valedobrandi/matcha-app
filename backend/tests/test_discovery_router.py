import uuid
from fastapi.testclient import TestClient
from main import app
import pytest
import datetime
import time
import jwt
from core.config import settings
from core.auth import get_current_session, get_current_user_id, read_session_token
from core.presence import get_current_user_id_and_touch
from modules.discovery.controller import get_discovery_service
from modules.discovery.schemas import (
    DiscoveryProfileCard,
    SuggestQueryParams,
    SearchQueryParams,
    SearchingBarProfile,
)
from modules.discovery.exceptions import (
    LocationRequiredException,
    InvalidFilterException,
)
from modules.discovery.service import DiscoveryService
from modules.discovery.schemas import ViewerContext


client = TestClient(app)


class FakeDiscoveryRepository:
    def __init__(self, viewer: ViewerContext):
        self.viewer = viewer

    async def get_viewer_context(self, user_id: int):
        return self.viewer

    async def list_profiles(self, query):
        return []


def make_token(user_id: int) -> str:
    now = datetime.datetime.now(datetime.UTC)
    payload = {
        "sub": str(user_id),
        "sid": str(uuid.uuid4()),
        "exp": time.time() + 36000,
        "iat": int(now.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


class FakeDiscoveryService:
    def __init__(self):
        self.raise_location = False
        self.raise_invalid_filter = False
        self.search_by_name_calls = []

    async def suggest(self, viewer_id: int, params: SuggestQueryParams):
        if self.raise_location:
            raise LocationRequiredException()
        if self.raise_invalid_filter:
            raise InvalidFilterException("Unknown sort key", field="sort")
        return [
            DiscoveryProfileCard(
                id=2,
                username="bob",
                first_name="Bob",
                last_name="B",
                age=28,
                gender="male",
                fame_rating=5,
                distance_km=1.2,
                common_tags_count=1,
                location_label="Paris",
                liked_by_me=False,
                profile_photo_url="/uploads/bob.jpg",
            )
        ]

    async def search_by_name(self, viewer_id: int, target: str):
        self.search_by_name_calls.append((viewer_id, target))
        if self.raise_invalid_filter:
            raise InvalidFilterException("Invalid target", field="target")
        return [
            SearchingBarProfile(id=2, username="bob", first_name="Bob", last_name="B")
        ]

    async def search(self, viewer_id: int, params: SearchQueryParams):
        if self.raise_location:
            raise LocationRequiredException()
        if self.raise_invalid_filter:
            raise InvalidFilterException("Unknown sort key", field="sort")
        return await self.suggest(viewer_id, params)


@pytest.fixture
def override_discovery():
    fake = FakeDiscoveryService()
    app.dependency_overrides[get_discovery_service] = lambda: fake
    app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
    app.dependency_overrides[get_current_session] = read_session_token
    yield fake
    app.dependency_overrides.clear()


class TestDiscoveryRouter:
    def test_suggest_requires_auth(self):
        response = client.get("/discovery/suggest")
        assert response.status_code == 401

    def test_suggest_ok(self, override_discovery):
        token = make_token(1)
        response = client.get(
            "/discovery/suggest",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        assert body[0]["id"] == 2
        assert "fame_rating" in body[0]
        assert body[0]["profile_photo_url"].startswith("/uploads/bob.jpg?expires=")
        assert "distance_km" in body[0]
        assert "common_tags_count" in body[0]

    def test_search_ok(self, override_discovery):
        token = make_token(1)
        response = client.get(
            "/discovery/search",
            params=[("tag_ids", "1"), ("tag_ids", "2"), ("age_min", "20")],
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_suggest_ignores_tag_ids_query_binding(self, override_discovery):
        token = make_token(1)
        response = client.get(
            "/discovery/suggest",
            params=[("tag_ids", "1")],
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    def test_location_required_maps_to_400(self, override_discovery):
        override_discovery.raise_location = True
        token = make_token(1)
        response = client.get(
            "/discovery/suggest",
            params={"sort": "distance"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "LOCATION_REQUIRED"

    def test_invalid_filter_maps_to_400(self, override_discovery):
        override_discovery.raise_invalid_filter = True
        token = make_token(1)
        response = client.get(
            "/discovery/suggest",
            params={"sort": "nope"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "INVALID_FILTER"
        assert response.json()["field"] == "sort"

    def test_unknown_sort_end_to_end_invalid_filter(self):
        """Real service validation (not fake flags) → 400 INVALID_FILTER."""
        repo = FakeDiscoveryRepository(
            ViewerContext(id=1, gender="male", sexual_preference="bisexual")
        )
        app.dependency_overrides[get_discovery_service] = (
            lambda: DiscoveryService(repo)
        )
        app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
        app.dependency_overrides[get_current_session] = read_session_token
        try:
            token = make_token(1)
            response = client.get(
                "/discovery/suggest",
                params={"sort": "nope"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 400
            body = response.json()
            assert body["code"] == "INVALID_FILTER"
            assert body["field"] == "sort"
        finally:
            app.dependency_overrides.clear()

    def test_age_out_of_bounds_end_to_end_invalid_filter(self):
        repo = FakeDiscoveryRepository(
            ViewerContext(id=1, gender="male", sexual_preference="bisexual")
        )
        app.dependency_overrides[get_discovery_service] = (
            lambda: DiscoveryService(repo)
        )
        app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
        app.dependency_overrides[get_current_session] = read_session_token
        try:
            token = make_token(1)
            response = client.get(
                "/discovery/search",
                params={"age_min": "10"},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 400
            assert response.json()["code"] == "INVALID_FILTER"
            assert response.json()["field"] == "age_min"
        finally:
            app.dependency_overrides.clear()


class TestSearchByName:
    def test_should_return_401_when_unauthenticated(self):
        response = client.get("/discovery/search-list", params={"target": "bo"})
        assert response.status_code == 401

    def test_should_return_422_when_target_missing(self, override_discovery):
        token = make_token(1)
        response = client.get(
            "/discovery/search-list",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422

    def test_should_return_422_when_target_shorter_than_two_chars(self, override_discovery):
        token = make_token(1)
        response = client.get(
            "/discovery/search-list",
            params={"target": "b"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422
        assert override_discovery.search_by_name_calls == []

    def test_should_pass_viewer_id_and_target_to_service_when_valid(self, override_discovery):
        token = make_token(7)
        response = client.get(
            "/discovery/search-list",
            params={"target": "bob"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert override_discovery.search_by_name_calls == [(7, "bob")]
        assert response.json() == [
            {"id": 2, "username": "bob", "first_name": "Bob", "last_name": "B"}
        ]

    def test_should_map_invalid_filter_to_400_when_service_rejects_target(self, override_discovery):
        override_discovery.raise_invalid_filter = True
        token = make_token(1)
        response = client.get(
            "/discovery/search-list",
            params={"target": "bob"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
