from fastapi.testclient import TestClient
from main import app
import pytest
import datetime
import time
import jwt
from core.config import settings
from core.auth import get_current_user_id
from core.presence import get_current_user_id_and_touch
from modules.social.controller import get_social_service
from modules.social.schemas import (
    SocialOkResponse,
    LikeStateResponse,
    BlockStateResponse,
    RelationshipResponse,
    VisitorOut,
    LikeReceivedOut,
)
from modules.social.exceptions import (
    CannotVisitSelfException,
    ProfilePhotoRequiredException,
    SocialUserNotFoundException,
    CannotBlockSelfException,
    CannotReportSelfException,
)
from modules.auth.controller import get_auth_service
from modules.auth.schemas import CurrentUserResponse


client = TestClient(app)


def make_token(user_id: int) -> str:
    now = datetime.datetime.now(datetime.UTC)
    payload = {
        "sub": str(user_id),
        "exp": time.time() + 36000,
        "iat": int(now.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


class FakeSocialService:
    def __init__(self):
        self.has_avatar = True
        self.users = {1, 2}
        self.blocked = False

    async def record_visit(self, viewer_id: int, target_id: int) -> SocialOkResponse:
        if viewer_id == target_id:
            raise CannotVisitSelfException()
        if target_id not in self.users:
            raise SocialUserNotFoundException()
        if self.blocked:
            raise SocialUserNotFoundException()
        return SocialOkResponse()

    async def list_visitors(self, user_id: int, limit: int, offset: int):
        return [
            VisitorOut(
                id=2,
                username="bob",
                first_name="Bob",
                last_name="B",
                visited_at=datetime.datetime.now(datetime.UTC),
            )
        ][offset:offset + limit]

    async def like(self, from_user_id: int, to_user_id: int) -> LikeStateResponse:
        if not self.has_avatar:
            raise ProfilePhotoRequiredException()
        if to_user_id not in self.users:
            raise SocialUserNotFoundException()
        if self.blocked:
            raise SocialUserNotFoundException()
        return LikeStateResponse(liked=True, connected=False)

    async def unlike(self, from_user_id: int, to_user_id: int) -> LikeStateResponse:
        return LikeStateResponse(liked=False, connected=False)

    async def list_likes_received(self, user_id: int, limit: int, offset: int):
        return [
            LikeReceivedOut(
                id=2,
                username="bob",
                first_name="Bob",
                last_name="B",
                liked_at=datetime.datetime.now(datetime.UTC),
            )
        ]

    async def get_relationship(self, me: int, target_id: int) -> RelationshipResponse:
        if target_id not in self.users:
            raise SocialUserNotFoundException()
        return RelationshipResponse(
            liked_by_me=True,
            liked_you=False,
            connected=False,
            blocked_by_me=self.blocked,
            is_online=True,
            last_connection=datetime.datetime.now(datetime.UTC),
        )

    async def block(self, from_user_id: int, to_user_id: int) -> BlockStateResponse:
        if from_user_id == to_user_id:
            raise CannotBlockSelfException()
        if to_user_id not in self.users:
            raise SocialUserNotFoundException()
        self.blocked = True
        return BlockStateResponse(blocked=True)

    async def unblock(self, from_user_id: int, to_user_id: int) -> BlockStateResponse:
        self.blocked = False
        return BlockStateResponse(blocked=False)

    async def list_blocks(self, user_id: int, limit: int, offset: int):
        return []

    async def report(
        self, reporter_id: int, target_id: int, reason: str | None
    ) -> SocialOkResponse:
        if reporter_id == target_id:
            raise CannotReportSelfException()
        if target_id not in self.users:
            raise SocialUserNotFoundException()
        return SocialOkResponse()


@pytest.fixture
def override_social():
    fake = FakeSocialService()
    app.dependency_overrides[get_social_service] = lambda: fake
    app.dependency_overrides[get_current_user_id_and_touch] = get_current_user_id
    yield fake
    app.dependency_overrides.clear()


class TestSocialVisits:
    def test_visit_ok(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/visits/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json() == {"ok": True}

    def test_visit_self(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/visits/1",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "CANNOT_VISIT_SELF"

    def test_visit_not_found(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/visits/99",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert response.json()["code"] == "TARGET_USER_NOT_FOUND"

    def test_should_answer_a_visit_like_a_missing_user_when_blocked(self, override_social):
        override_social.blocked = True
        token = make_token(1)
        response = client.post(
            "/social/visits/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert response.json()["code"] == "TARGET_USER_NOT_FOUND"


class TestSocialLikes:
    def test_like_requires_photo(self, override_social):
        override_social.has_avatar = False
        token = make_token(1)
        response = client.post(
            "/social/likes/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert response.json()["code"] == "PROFILE_PHOTO_REQUIRED"

    def test_like_ok(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/likes/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["liked"] is True
        assert "connected" in body


class TestSocialBlocks:
    def test_block_ok(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/blocks/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json() == {"blocked": True}

    def test_block_self(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/blocks/1",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == "CANNOT_BLOCK_SELF"

    def test_unblock_ok(self, override_social):
        token = make_token(1)
        response = client.delete(
            "/social/blocks/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json() == {"blocked": False}


class TestSocialReports:
    def test_report_ok(self, override_social):
        token = make_token(1)
        response = client.post(
            "/social/reports/2",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "fake account"},
        )
        assert response.status_code == 200
        assert response.json() == {"ok": True}


class TestSocialRelationship:
    def test_relationship_flags(self, override_social):
        token = make_token(1)
        response = client.get(
            "/social/relationship/2",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["liked_by_me"] is True
        assert body["liked_you"] is False
        assert body["connected"] is False
        assert "blocked_by_me" in body
        assert "blocked_you" not in body
        assert "is_online" in body

    def test_relationship_not_found(self, override_social):
        token = make_token(1)
        response = client.get(
            "/social/relationship/99",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert response.json()["code"] == "TARGET_USER_NOT_FOUND"


class TestSocialLists:
    def test_visitors_bare_array(self, override_social):
        token = make_token(1)
        response = client.get(
            "/social/visitors",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_likes_received_bare_array(self, override_social):
        token = make_token(1)
        response = client.get(
            "/social/likes/received",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAuthMeStaysThin:
    def test_auth_me_omits_social_payload(self):
        class FakeAuthService:
            async def get_current_user(self, user_id: int) -> CurrentUserResponse:
                return CurrentUserResponse(
                    id=1,
                    username="alice",
                    email="a@b.com",
                    first_name="A",
                    last_name="B",
                    email_verified=True,
                    profile_completed=True,
                    has_password=True,
                )

        app.dependency_overrides[get_current_user_id] = lambda: 1
        app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
        try:
            response = client.get("/auth/me")
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        body = response.json()
        assert "liked_by_me" not in body
        assert "connected" not in body
        assert "visitors" not in body
        assert "blocked_by_me" not in body
