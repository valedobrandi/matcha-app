from typing import Awaitable, Callable
from integrations.mailtrap_client import MailtrapClient
from modules.notifications.outbox_repository import OutboxMessage
from workers.exceptions import OutboxPayloadError

OutboxHandler = Callable[[OutboxMessage, MailtrapClient], Awaitable[None]]

async def handle_verification(message: OutboxMessage, mail_client: MailtrapClient) -> None:
    token = message.payload.get("verification_token")
    if not token:
        raise OutboxPayloadError("Verification token is missing in payload")
    await mail_client.send_verification_email(message.recipient_email, token)

async def handle_password_reset(message: OutboxMessage, mail_client: MailtrapClient) -> None:
    reset_token = message.payload.get("reset_token")
    if not reset_token:
        raise OutboxPayloadError("Reset token is missing in payload")
    await mail_client.send_password_reset_email(message.recipient_email, reset_token)

HANDLERS: dict[str, OutboxHandler] = {
    "verification": handle_verification,
    "password_reset": handle_password_reset,
}