import math
import time
from collections import deque
from typing import Callable, NamedTuple

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

FORGET_AFTER_SECONDS = 3600
SWEEP_ABOVE_KEYS = 10_000


class Limit(NamedTuple):
    attempts: int
    per_seconds: float


class TooManyRequestsException(Exception):
    code = "TOO_MANY_REQUESTS"

    def __init__(self, retry_after: int) -> None:
        super().__init__("Too many attempts. Please wait and try again.")
        self.retry_after = retry_after


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._attempts: dict[str, deque[float]] = {}
        self._sweep_above = SWEEP_ABOVE_KEYS

    def check(self, key: str, limit: Limit) -> None:
        now = self._clock()
        attempts = self._attempts.get(key)
        if attempts is None:
            return
        while attempts and attempts[0] <= now - limit.per_seconds:
            attempts.popleft()
        if len(attempts) >= limit.attempts:
            raise TooManyRequestsException(retry_after=max(1, math.ceil(attempts[0] + limit.per_seconds - now)))

    def hit(self, key: str, limit: Limit) -> float:
        self.check(key, limit)
        return self.record(key)

    def record(self, key: str) -> float:
        now = self._clock()
        if len(self._attempts) > self._sweep_above:
            self._attempts = {
                kept: attempts
                for kept, attempts in self._attempts.items()
                if attempts and attempts[-1] > now - FORGET_AFTER_SECONDS
            }
            self._sweep_above = max(SWEEP_ABOVE_KEYS, 2 * len(self._attempts))
        self._attempts.setdefault(key, deque()).append(now)
        return now

    def release(self, key: str, at: float) -> None:
        attempts = self._attempts.get(key)
        if attempts is not None and at in attempts:
            attempts.remove(at)


rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    return rate_limiter


def register_rate_limit_exception_handler(app: FastAPI) -> None:
    @app.exception_handler(TooManyRequestsException)
    async def handle_too_many_requests(_: Request, exc: TooManyRequestsException):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": str(exc), "code": exc.code, "field": None},
            headers={"Retry-After": str(exc.retry_after)},
        )
