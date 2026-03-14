"""
otp_service.py
──────────────
Reusable helpers for:
  - generating and validating 6-digit OTPs
  - generating guaranteed-unique booking reference IDs
"""

import logging
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 5
MAX_REF_ATTEMPTS   = 5


def generate_otp() -> str:
    """Return a 6-digit numeric OTP string."""
    return "".join(random.choices(string.digits, k=6))


def get_otp_expiry() -> datetime:
    """Return a timezone-aware expiry datetime 5 minutes from now."""
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)


# ── Reference ID generation ───────────────────────────────────────────────────

def _make_reference_id() -> str:
    """
    Build a candidate reference ID: SR-{YYYYMMDD}-{RANDOM6}
    Example: SR-20260313-X8H2LQ
    Characters: uppercase A-Z + digits 0-9 (no ambiguous chars like 0/O, 1/I).
    """
    today  = datetime.now(timezone.utc).strftime("%Y%m%d")
    # Use only unambiguous characters to reduce human transcription errors
    chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(random.choices(chars, k=6))
    return f"SR-{today}-{suffix}"


async def generate_unique_reference_id(db: AsyncSession) -> str:
    """
    Generate a booking reference ID that is guaranteed not to exist in the DB.

    Strategy:
      1. Generate a candidate ID.
      2. Check the bookings table for an existing row with that reference_id.
      3. If clear → return it.
      4. If collision → regenerate, up to MAX_REF_ATTEMPTS times.
      5. If still colliding after all attempts → raise RuntimeError.

    This proactive check virtually eliminates the UNIQUE constraint error.
    The caller should still have an IntegrityError catch as a final safety net.
    """
    # Import here to avoid circular import (db_models → database → otp_service)
    from app.models.db_models import BookingRecord

    for attempt in range(1, MAX_REF_ATTEMPTS + 1):
        candidate = _make_reference_id()
        result = await db.execute(
            select(BookingRecord.id).where(BookingRecord.reference_id == candidate)
        )
        if result.scalar_one_or_none() is None:
            logger.debug("Reference ID %s is available (attempt %d)", candidate, attempt)
            return candidate
        logger.warning(
            "Reference ID collision: %s already exists (attempt %d/%d)",
            candidate, attempt, MAX_REF_ATTEMPTS,
        )

    # Extremely unlikely (would require all 5 random strings to collide)
    raise RuntimeError(
        f"Could not generate a unique reference ID after {MAX_REF_ATTEMPTS} attempts"
    )


def is_otp_valid(submitted: str, stored: Optional[str], expiry: Optional[datetime]) -> bool:
    """
    Return True only if:
    - stored code exists
    - expiry exists and has not passed
    - submitted code matches stored code (constant-time-ish via ==)
    """
    if not stored or not expiry:
        return False
    # Ensure timezone-aware comparison
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expiry:
        return False
    return submitted == stored
