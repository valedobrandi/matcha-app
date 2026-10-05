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


def test_should_keep_a_rejected_jwt_secret_out_of_the_error_when_it_is_too_short():
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None, JWT_SECRET="my-real-but-short-key")
    assert "my-real-but-short-key" not in str(error.value)


def test_should_keep_other_secrets_out_of_the_error_when_the_jwt_secret_is_missing(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.setenv("FT_CLIENT_SECRET", "ft-secret-value-that-must-not-leak")
    with pytest.raises(ValidationError) as error:
        Settings(_env_file=None)
    assert "must-not-leak" not in str(error.value)
