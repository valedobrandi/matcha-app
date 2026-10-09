import mailtrap as mt
import pytest

from integrations.mailtrap_client import MailtrapClient, MailtrapException


def build_client() -> MailtrapClient:
    return MailtrapClient(
        api_key="test-key",
        from_email="no-reply@example.test",
        from_name="Matcha",
        verification_url="http://localhost:5173/verify",
        password_reset_url="http://localhost:5173/reset-password",
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("send", ["send_verification_email", "send_password_reset_email"])
async def test_should_keep_the_provider_reason_when_mailtrap_refuses_the_email(monkeypatch, send):
    def refuse(self, mail):
        raise mt.AuthorizationError(errors=["Unauthorized"])

    monkeypatch.setattr(mt.MailtrapClient, "send", refuse)

    with pytest.raises(MailtrapException, match="Unauthorized"):
        await getattr(build_client(), send)("ana@example.test", "token")
