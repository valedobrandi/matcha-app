from modules.auth.service import AuthService


class FakeRepository:
    pass


def test_hash_password_returns_bcrypt_hash():
    service = AuthService(FakeRepository())
    hashed = service._hash_password("Password1")
    assert hashed.startswith("$2")


def test_generate_jwt_token_returns_string():
    service = AuthService(FakeRepository())
    token = service.generate_jwt_token(1)
    assert isinstance(token, str)
    assert len(token) > 0
