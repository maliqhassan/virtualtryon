from app.services.attempt_limiter import SlidingWindowLimiter


def test_limit_per_key_and_window_slides() -> None:
    now = [0.0]
    limiter = SlidingWindowLimiter(2, window_seconds=10, clock=lambda: now[0])

    assert limiter.try_acquire("a")
    assert limiter.try_acquire("a")
    assert not limiter.try_acquire("a")
    assert limiter.try_acquire("b")  # keys are independent

    now[0] = 10.5  # the first two attempts have left the window
    assert limiter.try_acquire("a")
