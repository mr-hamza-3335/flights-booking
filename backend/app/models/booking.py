"""
booking.py
──────────
Canonical module for booking-related Pydantic models.
Re-exports from models/request.py so that both
  from app.models.booking import BookingRequestSubmit
  from app.models.request import BookingRequestSubmit
continue to work.
"""

from app.models.request import (  # noqa: F401 – re-export
    BookingRequestSubmit,
    BookingRequestResponse,
    OtpVerifyRequest,
    OtpVerifyResponse,
    ResendOtpRequest,
)

__all__ = [
    "BookingRequestSubmit",
    "BookingRequestResponse",
    "OtpVerifyRequest",
    "OtpVerifyResponse",
    "ResendOtpRequest",
]
