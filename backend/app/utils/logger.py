"""
Structured logging utility.

Usage:
    from app.utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Flight search", extra={"origin": "LHR", "dest": "DXB"})
"""

import logging
import sys
from typing import Optional


_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
_initialized = False


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger. Call once at application startup."""
    global _initialized
    if _initialized:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _initialized = True


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Return a named logger. setup_logging() must be called first."""
    return logging.getLogger(name)
