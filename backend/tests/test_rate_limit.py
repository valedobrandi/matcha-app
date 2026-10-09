import pytest

from core.rate_limit import Limit, RateLimiter, TooManyRequestsException

THREE_PER_MINUTE = Limit(attempts=3, per_seconds=60)


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_should_refuse_the_attempt_and_say_when_to_retry_when_the_limit_is_reached():
    clock = Clock()
    limiter = RateLimiter(clock)
    for _ in range(3):
        limiter.hit("key", THREE_PER_MINUTE)
        clock.now += 10

    with pytest.raises(TooManyRequestsException) as refused:
        limiter.hit("key", THREE_PER_MINUTE)

    assert refused.value.retry_after == 30


def test_should_allow_an_attempt_again_when_the_earlier_attempts_have_left_the_window():
    clock = Clock()
    limiter = RateLimiter(clock)
    for _ in range(3):
        limiter.hit("key", THREE_PER_MINUTE)

    clock.now += 60

    limiter.hit("key", THREE_PER_MINUTE)


def test_should_allow_a_key_when_another_key_is_at_its_limit():
    limiter = RateLimiter(Clock())
    for _ in range(3):
        limiter.hit("first", THREE_PER_MINUTE)

    limiter.hit("second", THREE_PER_MINUTE)


def test_should_not_count_an_attempt_when_it_is_only_checked():
    limiter = RateLimiter(Clock())
    for _ in range(5):
        limiter.check("key", THREE_PER_MINUTE)

    limiter.hit("key", THREE_PER_MINUTE)
