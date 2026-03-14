"""
Reusable validation helpers shared across models and routers.
"""

import re
from datetime import date
from typing import Optional


_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PHONE_RE = re.compile(r"^\+?[\d\s\-().]{7,20}$")
_DATE_RE  = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_IATA_RE  = re.compile(r"^[A-Z]{3}$")


def is_valid_email(value: str) -> bool:
    return bool(_EMAIL_RE.match(value.strip()))


def is_valid_phone(value: str) -> bool:
    return bool(_PHONE_RE.match(value.strip()))


def is_valid_date_string(value: str) -> bool:
    """Check that the string is YYYY-MM-DD and a real calendar date."""
    if not _DATE_RE.match(value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def is_future_date(value: str) -> bool:
    """Return True if the YYYY-MM-DD date is today or in the future."""
    try:
        return date.fromisoformat(value) >= date.today()
    except ValueError:
        return False


def is_valid_iata(value: str) -> bool:
    return bool(_IATA_RE.match(value.upper()))


def sanitise_name(value: str) -> str:
    """Strip leading/trailing whitespace; collapse internal spaces."""
    return re.sub(r"\s+", " ", value).strip()


def validate_date_range(departure: str, return_date: Optional[str]) -> bool:
    """Return True if return_date is after departure (or return_date is None)."""
    if return_date is None:
        return True
    try:
        return date.fromisoformat(return_date) > date.fromisoformat(departure)
    except ValueError:
        return False
