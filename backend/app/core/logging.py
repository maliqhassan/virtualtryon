import logging
import sys


def configure_logging(debug: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        stream=sys.stdout,
    )
    # httpx logs every request's full URL at INFO. A try-on provider's result
    # link is a signed URL that opens an image of the user's body for days,
    # so it must not reach the server logs. Warnings and errors still do.
    for name in ("httpx", "httpcore"):
        logging.getLogger(name).setLevel(logging.WARNING)
