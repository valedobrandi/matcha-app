import pytest
from datetime import datetime, UTC
from modules.users.schemas import (
    UserProfile,
    UserLocationInput,
    UserAccountInput,
    PasswordChangeInput,
    EditProfileInput
)
from modules.users.service import UsersService
from modules.users.exceptions import (
    UserNotFoundException,
    TargetUserNotFoundException,
    InvalidLocationException,
    EmailAlreadyTakenException,
)
import bcrypt
from modules.auth.exceptions import (
    InvalidCredentialsException,
    NoPasswordSetException,
)
from modules.auth.repository import AuthRepository
from types import SimpleNamespace
from pydantic import ValidationError


class FakeSocial:
    def __init__(self, blocked=False, likes_received=3, visitors=5):
        self.blocked = blocked
        self.likes_received = likes_received
        self.visitors = visitors

    async def is_blocked_either_way(self, user_a: int, user_b: int) -> bool:
        return self.blocked

    async def count_likes_received(self, target_user_id: int) -> int:
        return self.likes_received

    async def count_visitors(self, target_user_id: int) -> int:
        return self.visitors


class FakeUserAuth:
    def __init__(self, id=1, password_hash=None, is_verified=True):
        self.id = id
        self.password_hash = password_hash
        self.is_verified = is_verified

@pytest.mark.asyncio
async def test_change_password_wrong_current_password(monkeypatch):
    oldPwd = bcrypt.hashpw(b"OldPwd123!", bcrypt.gensalt()).decode("utf-8")
    fake_auth_user = FakeUserAuth(password_hash=oldPwd, is_verified=True)

    async def fake_user_by_id(self, user_id):
        return fake_auth_user

    monkeypatch.setattr(AuthRepository, "find_by_id", fake_user_by_id)
    service = UsersService(repository=SimpleNamespace(connection=None), social_repo=FakeSocial())

    passwords = PasswordChangeInput(
        current_password="WrongPassword123!",
        new_password="Xk9#mQvzTr4!!",
        confirm_password="Xk9#mQvzTr4!!",
    )

    with pytest.raises(InvalidCredentialsException):
        await service.change_password(passwords, 1)


@pytest.mark.asyncio
async def test_change_password_no_password_set(monkeypatch):
    fake_auth_user = FakeUserAuth(password_hash=None, is_verified=True)

    async def fake_user_by_id(self, user_id):
        return fake_auth_user

    monkeypatch.setattr(AuthRepository, "find_by_id", fake_user_by_id)
    service = UsersService(repository=SimpleNamespace(connection=None), social_repo=FakeSocial())

    passwords = PasswordChangeInput(
        current_password="emptySoAnything!",
        new_password="Xk9#mQvzTr4!!",
        confirm_password="Xk9#mQvzTr4!!",
    )

    with pytest.raises(NoPasswordSetException):
        await service.change_password(passwords, 1)


@pytest.mark.asyncio
async def test_change_password_success(monkeypatch):
    oldPwd = bcrypt.hashpw(b"OldPwd123!", bcrypt.gensalt()).decode("utf-8")
    fake_auth_user = FakeUserAuth(password_hash=oldPwd, is_verified=True)

    async def fake_user_by_id(self, user_id):
        return fake_auth_user

    monkeypatch.setattr(AuthRepository, "find_by_id", fake_user_by_id)

    class FakeUserRepo:
        def __init__(self):
            self.connection = None
            self.change_password_called = None

        async def change_password(self, hashed_password, current_user_id):
            self.change_password_called = (hashed_password, current_user_id)

    fake_repo = FakeUserRepo()
    service = UsersService(fake_repo, FakeSocial())

    passwords = PasswordChangeInput(
        current_password="OldPwd123!",
        new_password="Xk9#mQvzTr4!!",
        confirm_password="Xk9#mQvzTr4!!",
    )

    res = await service.change_password(passwords, 1)

    assert res is None

    assert fake_repo.change_password_called is not None
    hashed_password, current_user_id = fake_repo.change_password_called
    assert current_user_id == 1

    assert hashed_password != "Xk9#mQvzTr4!!"
    assert bcrypt.checkpw(b"Xk9#mQvzTr4!!", hashed_password.encode("utf-8"))

class FakeRepository:
    def __init__(self, user, tags=None, photos=None, completed=True):
        self.user = user
        self.completed = completed
        self.tags = tags or []
        self.photos = photos or []
        self.current_user_id = None
        self.updated_location = None
        self.edited_profile = None
        self.updated_account = None
        self.raise_on_account = None

    async def get_user_by_id(self, user_id: int):
        self.current_user_id = user_id
        return self.user

    async def is_profile_completed(self, user_id: int) -> bool:
        return self.completed

    async def get_my_tags(self, user_id: int):
        return self.tags

    async def get_my_photos(self, user_id: int):
        return self.photos

    async def edit_profile(self, current_user_id: int, payload: EditProfileInput):
        self.edited_profile = (current_user_id, payload)
        return self.user

    async def update_location(self, current_user_id: int, payload: UserLocationInput):
        self.updated_location = (current_user_id, payload)
        if not self.user:
            return None
        return self.user.model_copy(
            update={
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "location_label": payload.location_label,
                "location_consent": payload.location_consent,
            }
        )

    async def update_account(
        self,
        current_user_id: int,
        payload: UserAccountInput,
        *,
        reverify_email: bool = False,
    ):
        if self.raise_on_account is not None:
            raise self.raise_on_account
        self.updated_account = (current_user_id, payload, reverify_email)
        if not self.user:
            return None
        return self.user.model_copy(
            update={
                "username": payload.username,
                "first_name": payload.first_name,
                "last_name": payload.last_name,
                "email": payload.email,
                "is_verified": False if reverify_email else self.user.is_verified,
            }
        )


def _complete_user(**overrides) -> UserProfile:
    data = dict(
        id=1,
        email="aaa@gmail.com",
        username="aaa",
        first_name="Ann",
        last_name="MOMO",
        is_verified=True,
        created_at=datetime.now(UTC),
        gender="female",
        sexual_preference="man",
        age=24,
        bio="hello",
        fame_rating=0,
        location_consent=False,
    )
    data.update(overrides)
    return UserProfile(**data)


@pytest.mark.asyncio
async def test_get_profile_when_user_found():
    user = _complete_user()
    repo = FakeRepository(user, tags=[{"id": 1}], photos=[{"id": 1}])
    service = UsersService(repo, FakeSocial())

    res = await service.get_profile(1)
    assert res.id == user.id
    assert res.is_profile_completed is True
    assert res.fame_rating == 0
    assert res.location_consent is False
    assert repo.current_user_id == 1


@pytest.mark.asyncio
async def test_get_profile_is_incomplete_when_the_repository_says_incomplete() -> None:
    user = _complete_user()
    repo = FakeRepository(user, completed=False)
    service = UsersService(repo, FakeSocial())

    res = await service.get_profile(1)
    assert res.is_profile_completed is False


@pytest.mark.asyncio
async def test_get_profile_completed_without_location() -> None:
    user = _complete_user(latitude=None, longitude=None, location_consent=False)
    repo = FakeRepository(user, tags=[{"id": 1}], photos=[{"id": 1}])
    service = UsersService(repo, FakeSocial())

    res = await service.get_profile(1)
    assert res.is_profile_completed is True


@pytest.mark.asyncio
async def test_get_profile_when_user_not_found():
    repo = FakeRepository(None)
    service = UsersService(repo, FakeSocial())

    with pytest.raises(UserNotFoundException):
        await service.get_profile(12)


@pytest.mark.asyncio
async def test_update_location_rejects_when_consent_false():
    user = _complete_user()
    repo = FakeRepository(user, tags=[1], photos=[1])
    service = UsersService(repo, FakeSocial())
    with pytest.raises(InvalidLocationException):
        await service.update_location(
            1,
            UserLocationInput(
                latitude=48.85,
                longitude=2.35,
                location_label="Paris",
                location_consent=False,
            ),
        )
    assert repo.updated_location is None


@pytest.mark.asyncio
async def test_update_location_succeeds_when_consent_true():
    user = _complete_user()
    repo = FakeRepository(user, tags=[1], photos=[1])
    service = UsersService(repo, FakeSocial())
    payload = UserLocationInput(
        latitude=48.85,
        longitude=2.35,
        location_label="Paris",
        location_consent=True,
    )
    res = await service.update_location(1, payload)
    assert res.latitude == 48.85
    assert res.longitude == 2.35
    assert res.location_label == "Paris"
    assert res.location_consent is True
    assert repo.updated_location == (1, payload)


@pytest.mark.asyncio
async def test_should_store_gps_coordinates_at_neighborhood_precision_when_the_location_is_shared():
    repo = FakeRepository(_complete_user(), tags=[1], photos=[1])
    service = UsersService(repo, FakeSocial())

    await service.update_location(
        1,
        UserLocationInput(latitude=48.858372, longitude=2.294481, location_label="Gros-Caillou, Paris", location_consent=True),
    )

    _, stored = repo.updated_location
    assert (stored.latitude, stored.longitude) == (48.86, 2.29)


@pytest.mark.asyncio
async def test_should_store_coordinates_at_neighborhood_precision_when_the_profile_is_edited():
    repo = FakeRepository(_complete_user(), tags=[1], photos=[1])
    service = UsersService(repo, FakeSocial())

    await service.edit_profile(
        1,
        EditProfileInput(
            gender="female", sexual_preference="man", age=24, bio="hello",
            latitude=45.757813, longitude=4.832011, location_label="Lyon", location_consent=False,
        ),
    )

    _, stored = repo.edited_profile
    assert (stored.latitude, stored.longitude) == (45.76, 4.83)


@pytest.mark.asyncio
async def test_update_account_should_keep_verified_when_email_unchanged():
    user = _complete_user(email="aaa@gmail.com", is_verified=True)
    repo = FakeRepository(user)
    service = UsersService(repo, FakeSocial())
    payload = UserAccountInput(
        username="aaa",
        first_name="New",
        last_name="Name",
        email="aaa@gmail.com",
    )
    res = await service.update_account(1, payload)
    assert res.first_name == "New"
    assert res.is_verified is True
    assert repo.updated_account == (1, payload, False)


@pytest.mark.asyncio
async def test_update_account_should_require_reverification_when_email_changes():
    user = _complete_user(email="aaa@gmail.com", is_verified=True)
    repo = FakeRepository(user)
    service = UsersService(repo, FakeSocial())
    payload = UserAccountInput(
        username="aaa",
        first_name="Ann",
        last_name="MOMO",
        email="new@example.com",
    )
    res = await service.update_account(1, payload)
    assert res.email == "new@example.com"
    assert res.is_verified is False
    assert repo.updated_account == (1, payload, True)


@pytest.mark.asyncio
async def test_update_account_propagates_email_taken():
    user = _complete_user()
    repo = FakeRepository(user)
    repo.raise_on_account = EmailAlreadyTakenException("taken@example.com")
    service = UsersService(repo, FakeSocial())
    with pytest.raises(EmailAlreadyTakenException):
        await service.update_account(
            1,
            UserAccountInput(
                username="aaa",
                first_name="Ann",
                last_name="MOMO",
                email="taken@example.com",
            ),
        )


@pytest.mark.asyncio
async def test_update_account_should_raise_when_user_missing():
    repo = FakeRepository(None)
    service = UsersService(repo, FakeSocial())
    with pytest.raises(UserNotFoundException):
        await service.update_account(
            1,
            UserAccountInput(
                username="aaa",
                first_name="Ann",
                last_name="MOMO",
                email="a@b.com",
            ),
        )


def test_edit_profile_rejects_missing_location_label():
    with pytest.raises(ValidationError):
        EditProfileInput(
            gender="female",
            sexual_preference="man",
            age=24,
            bio="hello",
            latitude=48.85,
            longitude=2.35,
            location_label=None,
            location_consent=True,
        )

def test_edit_profile_rejects_blank_location_label():
    with pytest.raises(ValidationError):
        EditProfileInput(
            gender="female", sexual_preference="man", age=24, bio="hello",
            latitude=48.85, longitude=2.35,
            location_label="   ",
            location_consent=True,
        )

def test_edit_profile_accepts_complete_location():
    profile = EditProfileInput(
        gender="female", sexual_preference="man", age=24, bio="hello",
        latitude=48.85, longitude=2.35,
        location_label="Paris",
        location_consent=True,
    )
    assert profile.location_label == "Paris"


@pytest.mark.asyncio
async def test_get_public_profile_should_return_projection_without_email():
    from modules.users.schemas import PublicProfile, PhotoOut
    from modules.tags.schemas import TagOut

    target = _complete_user(id=2, email="secret@example.com", username="bob")
    photos = [PhotoOut(id=1, url="/uploads/a.jpg", is_profile_photo=True)]
    tags = [TagOut(id=1, name="music")]

    service = UsersService(
        FakeRepository(target, tags=tags, photos=photos),
        social_repo=FakeSocial(likes_received=7, visitors=11),
    )
    result = await service.get_public_profile(viewer_id=1, target_id=2)
    assert isinstance(result, PublicProfile)
    assert result.id == 2
    assert result.username == "bob"
    assert result.fame_rating == 0
    assert result.tags == tags
    assert result.photos == photos
    assert result.likes_received_count == 7
    assert result.visitors_count == 11
    assert "email" not in result.model_dump()


@pytest.mark.asyncio
async def test_get_public_profile_should_raise_target_not_found_when_blocked():
    from modules.users.exceptions import TargetUserNotFoundException

    target = _complete_user(id=2)

    service = UsersService(FakeRepository(target), social_repo=FakeSocial(blocked=True))
    with pytest.raises(TargetUserNotFoundException):
        await service.get_public_profile(viewer_id=1, target_id=2)


@pytest.mark.asyncio
async def test_get_public_profile_should_raise_when_missing():
    service = UsersService(FakeRepository(None), social_repo=FakeSocial())
    with pytest.raises(TargetUserNotFoundException):
        await service.get_public_profile(viewer_id=1, target_id=99)


def test_target_user_not_found_should_not_share_the_caller_account_code():
    assert TargetUserNotFoundException.code == "TARGET_USER_NOT_FOUND"
    assert TargetUserNotFoundException.code != UserNotFoundException.code

def test_should_accept_a_profile_without_an_orientation_when_none_is_given():
    from modules.users.schemas import UserProfileInput

    profile = UserProfileInput(gender="male", age=25, bio="hello")

    assert profile.sexual_preference is None
