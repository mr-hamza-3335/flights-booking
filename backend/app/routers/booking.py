"""
routers/booking.py
──────────────────
POST /api/booking-request

Accepts the booking form, generates a 6-digit OTP, saves the pending
booking record (unverified), and emails the OTP to the customer.
The booking is NOT confirmed until /api/verify-otp succeeds.
"""

import asyncio
import logging
import random
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.booking import BookingRequestResponse, BookingRequestSubmit
from app.models.db_models import BookingRecord, User
from app.services import email_service
from app.services.auth_service import get_optional_user
from app.services.otp_service import generate_otp, get_otp_expiry
from app.utils.validators import is_valid_email, is_valid_phone

logger  = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router  = APIRouter()


@router.post(
    "/booking-request",
    response_model=BookingRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a flight booking request (initiates OTP verification)",
)
@limiter.limit("5/minute")
async def submit_booking_request(
    request: Request,
    body: BookingRequestSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
) -> BookingRequestResponse:
    if not is_valid_email(body.email):
        raise HTTPException(status_code=400, detail="Invalid email address format.")
    if not is_valid_phone(body.phone):
        raise HTTPException(status_code=400, detail="Invalid phone number format.")
    if not body.terms_accepted or not body.data_consent:
        raise HTTPException(status_code=422, detail="Terms acceptance and data consent are required.")
    if len(body.passenger_names) != body.num_passengers:
        raise HTTPException(
            status_code=400,
            detail=f"Expected {body.num_passengers} passenger names, received {len(body.passenger_names)}.",
        )

    otp_code   = generate_otp()
    otp_expiry = get_otp_expiry()

    logger.info(
        "Booking request | %s %s <%s> | %s → %s | %s pax",
        body.first_name, body.last_name, body.email,
        body.origin, body.destination, body.num_passengers,
    )

    # Temporary placeholder — replaced with final SR-... ID after OTP verification.
    # Needed to satisfy existing DBs that have reference_id NOT NULL.
    temp_ref = "_PENDING_" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))

    # ── Persist pending booking (unverified, temp reference_id) ──────────────
    record = BookingRecord(
        reference_id=temp_ref,      # replaced with SR-... after OTP verification
        user_id=current_user.id if current_user else None,
        status="new",
        is_verified=False,
        otp_code=otp_code,
        otp_expiry=otp_expiry,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        phone=body.phone,
        flight_id=body.flight_id,
        flight_number=body.flight_number,
        origin=body.origin,
        destination=body.destination,
        departure_date=body.departure_date,
        return_date=body.return_date,
        airline=body.airline,
        price=body.price,
        currency=body.currency,
        cabin_class=body.cabin_class,
        num_passengers=body.num_passengers,
        special_requests=body.special_requests,
        terms_accepted=body.terms_accepted,
        data_consent=body.data_consent,
        email_sent=False,
    )
    record.passenger_names = body.passenger_names
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # ── Send OTP email (capped at 10 s) ──────────────────────────────────────
    try:
        otp_sent = await asyncio.wait_for(
            email_service.send_otp_email(
                to_email=body.email,
                first_name=body.first_name,
                otp_code=otp_code,
            ),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        logger.warning("OTP email timed out for request_id=%s", record.id)
        otp_sent = False

    if otp_sent:
        message = (
            f"A 6-digit verification code has been sent to {body.email}. "
            "Please enter it to confirm your booking."
        )
    else:
        message = (
            "Your booking request is saved. Email delivery is currently unavailable — "
            "please contact us or try again shortly."
        )

    return BookingRequestResponse(
        request_id=record.id,
        email=body.email,
        otp_sent=otp_sent,
        message=message,
    )
