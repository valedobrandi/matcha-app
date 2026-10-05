import pytest
from pydantic import ValidationError

from core.config import Settings


def test_should_reject_a_jwt_secret_shorter_than_32_bytes_when_settings_load():
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None, JWT_SECRET="too-short")


def test_should_refuse_to_start_without_a_jwt_secret_when_none_is_configured(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None)


def test_should_accept_a_jwt_secret_of_32_bytes_when_settings_load():
    settings = Settings(_env_file=None, JWT_SECRET="x" * 32)
    assert settings.JWT_SECRET.get_secret_value() == "x" * 32
