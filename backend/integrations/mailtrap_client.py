import asyncio
from core.config import settings
import mailtrap as mt

class MailtrapException(Exception):
    pass

class MailtrapClient:
    def __init__(
        self, 
        api_key: str,
        from_email: str,
        from_name: str,
        verification_url: str,
        password_reset_url: str,
        ) -> None:
        self._client = mt.MailtrapClient(token=api_key)
        self._from_email = from_email
        self._from_name = from_name
        self._verification_url = verification_url
        self._password_reset_url = password_reset_url

    def _send_email_sync(
        self, to_email: str, subject: str, text: str, category: str,
        ) -> None:
        mail = mt.Mail(
            sender=mt.Address(email=self._from_email, name=self._from_name),
            to=[mt.Address(email=to_email)],
            subject=subject,
            text=text,
            category=category,
        )
        response = self._client.send(mail)
        if not response:
            raise MailtrapException(f"Failed to send {category} email")  

    async def _send_password_reset_email_sync(
        self, to_email: str, token: str,
    ) -> None:
            reset_url = f"{self._password_reset_url}?token={token}"
            self._send_email_sync(
                to_email,
                "Reset you Match account",
                (
                    f"Reset your account by opening this link:\n{reset_url}\n\n"
                    "If you did not request a password reset, ignore this email."
                ),
                "Password Reset"
            )

    async def send_password_reset_email(self, to_email: str, token: str) -> None:
        try:
            await asyncio.to_thread(
                self._send_email_sync,
                to_email,
                token,
            )
        except MailtrapException:
            raise
        except Exception as e:
            raise MailtrapException(f"Failed to send password reset email") from e

    def _send_verification_email_sync(self, to_email: str, token: str) -> None:
        verify_url = f"{self._verification_url}?token={token}"

        self._send_email_sync(
            to_email,
            "Verify your Match account",
            (
                "Welcome to Matcha!\n\n"
                f"Verify your account by opening this link:\n{verify_url}\n\n"
                "If you did not register, ignore this email."
            ),
            "Account Verification",
        )

    async def send_verification_email(self, to_email: str, token: str) -> None:
        try:
            await asyncio.to_thread(
                self._send_verification_email_sync,
                to_email,
                token,
            )
        except MailtrapException:
            raise
        except Exception as e:
            raise MailtrapException(f"Failed to send verification email.") from e

def build_mailtrap_client() -> MailtrapClient:
    token = settings.MAILTRAP_API_KEY.get_secret_value()
    if not token:
        raise MailtrapException("MAILTRAP_API_KEY is not set")
    return MailtrapClient(
        api_key=token,
        from_email=settings.MAILTRAP_FROM_EMAIL,
        from_name=settings.MAILTRAP_FROM_NAME,
        verification_url=settings.VERIFICATION_URL_BASE,
        password_reset_url=settings.PASSWORD_RESET_URL_BASE,
    )