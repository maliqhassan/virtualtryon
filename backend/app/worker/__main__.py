"""CLI entrypoint: `python -m app.worker`. Registers OS signal handlers for
graceful shutdown (SIGINT/SIGTERM set WorkerRunner's shutdown signal rather
than killing the process outright) and starts the polling loop.
"""

import asyncio
import logging
import signal

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.worker.worker_runner import WorkerRunner

logger = logging.getLogger(__name__)


async def main() -> None:
    settings = get_settings()
    configure_logging(settings.DEBUG)

    runner = WorkerRunner(poll_interval_seconds=settings.WORKER_POLL_INTERVAL_SECONDS)

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, runner.request_shutdown)
        except NotImplementedError:
            # Windows' ProactorEventLoop doesn't support add_signal_handler
            # for SIGTERM (SIGINT still raises KeyboardInterrupt normally,
            # handled below) — a local-dev-on-Windows limitation, not a
            # production one: the real deployment target (docker-compose's
            # `worker` service, Linux) supports both.
            logger.warning(
                "signal handler for %s not supported on this platform; "
                "Ctrl+C (SIGINT via KeyboardInterrupt) still works",
                sig.name,
            )

    try:
        await runner.run()
    except KeyboardInterrupt:
        runner.request_shutdown()


if __name__ == "__main__":
    asyncio.run(main())
