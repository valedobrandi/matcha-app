import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncpg
from fastapi import FastAPI
from core.config import settings
from workers.email_outbox_worker import run_email_outbox_worker


class DatabaseManager:
    def __init__(self):
        self.pool: asyncpg.pool.Pool | None = None

    async def init_pool(self) -> None:
        if self.pool is None:
            self.pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL, min_size=5, max_size=20, command_timeout=60.0)
        

    async def exit_pool(self):
        if self.pool:
            await self.pool.close()
    
db_manager = DatabaseManager()

@asynccontextmanager
async def db_lifespan(app: FastAPI):
    await db_manager.init_pool()
    worker_task = asyncio.create_task(run_email_outbox_worker(db_manager.pool))
    try:
        yield
    finally:
        worker_task.cancel()
        await asyncio.gather(worker_task, return_exceptions=True)
        await db_manager.exit_pool()

async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    if not db_manager.pool:
        raise RuntimeError("Database connection pool is not initialized.")
        
    async with db_manager.pool.acquire() as connection:
        yield connection