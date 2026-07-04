import datetime
import json
from dataclasses import dataclass
import asyncpg

@dataclass
class OutboxMessage:
    id: int
    event_type: str
    recipient_email: str
    payload: dict
    attempts: int
    max_attempts: int

class OutboxRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def _enqueue(
        self,
        event_type: str,
        recipient_email: str,
        payload: dict,
        max_attempts: int,
    ) -> None:
        
        await self.connection.execute(
            """
            INSERT INTO email_outbox (event_type, recipient_email, payload, max_attempts)
            VALUES ($1, $2, $3::jsonb, $4)
            """,
            event_type,
            recipient_email,
            json.dumps(payload),
            max_attempts,
        )

    async def enqueue_password_reset_email(
        self,
        recipient_email: str,
        reset_token: str,
        max_attempts: int,
        user_id: int,
    ) -> None:

        await self._enqueue(
            "password_reset",
            recipient_email,
            {"user_id": user_id, "reset_token": reset_token},
            max_attempts,
        )

    async def enqueue_verification_email(
        self, 
        recipient_email: str,
        user_id: int, 
        verification_token: str,
        max_attempts: int,
    ) -> None:
        await self._enqueue(
            "verification",
            recipient_email,
            {"user_id": user_id, "verification_token": verification_token},
            max_attempts,
        )

    async def recover_stale_processing(self) -> None:
        await self.connection.execute(
            """
            UPDATE email_outbox
            SET status = 'pending'
            WHERE status = 'processing'
             AND created_at < NOW() - INTERVAL '10 minutes'
            """
        )

    async def claim_pending_batch(self, limit: int) -> list[OutboxMessage]:
        rows = await self.connection.fetch(
            """
            UPDATE email_outbox
            SET status = 'processing'
            WHERE id IN(
                SELECT id
                FROM email_outbox
                WHERE status = 'pending'
                    AND attempts < max_attempts
                ORDER BY created_at
                FOR UPDATE SKIP LOCKED
                LIMIT $1
            )
            RETURNING id, event_type, recipient_email, payload, attempts, max_attempts
            """,
            limit,
        )
        return [
            OutboxMessage(
                id=row['id'],
                event_type=row['event_type'],
                recipient_email=row['recipient_email'],
                payload=dict(row["payload"]),
                attempts=row['attempts'],
                max_attempts=row['max_attempts'],
            )
            for row in rows
        ]

    async def mark_sent(self, message_id: int) -> None:
        await self.connection.execute(
            """
            UPDATE email_outbox
            SET status = 'sent', processed_at = $2, last_error = NULL
            WHERE id = $1
            """,
            message_id,
            datetime.datetime.now(datetime.timezone.utc),
        )

    async def mark_failed(self, message_id: int, error: str, *, retry: bool) -> None:
        status = 'pending' if retry else 'failed'
        await self.connection.execute(
            """
            UPDATE email_outbox
            SET status = $2, last_error = $3, attempts = attempts + 1
            WHERE id = $1
            """,
            message_id,
            status,
            error[:2000],
        )