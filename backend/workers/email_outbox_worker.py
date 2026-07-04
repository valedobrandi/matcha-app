import asyncio
import logging

import asyncpg

from workers.exceptions import OutboxPayloadError
from workers.outbox_handlers import HANDLERS
from core.config import settings
from integrations.mailtrap_client import MailtrapException, build_mailtrap_client
from modules.notifications.outbox_repository import OutboxRepository


logger = logging.getLogger(__name__)

async def process_outbox_batch(pool: asyncpg.Pool) -> None:
    mail_client = build_mailtrap_client()

    async with pool.acquire() as connection:
        outbox = OutboxRepository(connection)
        await outbox.recover_stale_processing()
        messages = await outbox.claim_pending_batch(settings.OUTBOX_BATCH_SIZE)

        for message in messages:
            handler = HANDLERS.get(message.event_type)

            if not handler:
                await outbox.mark_failed(
                    message.id,
                    f"Unsupported event type: {message.event_type}",
                    retry=False
                )
                continue

            try:
                await handler(message, mail_client)
                await outbox.mark_sent(message.id)
            except OutboxPayloadError as exc:
                await outbox.mark_failed(
                    message.id,
                    str(exc),
                    retry=False
                )
            except MailtrapException as exc:
                retry = (message.attempts+1) < message.max_attempts
                await outbox.mark_failed(
                    message.id,
                    str(exc),
                    retry=retry
                )
                logger.warning(
                    "email delivery failed for outbox id=%s type=%s attempt=%d retry=%s",
                    message.id,
                    message.event_type,
                    message.attempts,
                    retry,
                )

async def run_email_outbox_worker(pool: asyncpg.Pool) -> None:
    logger.info("email outbox worker started")
    while True:
        try:
            await process_outbox_batch(pool)
        except asyncio.CancelledError:
            logger.info("email outbox worker stopped")
            raise
        except Exception:
            logger.exception("email outbox worker batch failed")

        await asyncio.sleep(settings.OUTBOX_POLL_INTERVAL_SECONDS)