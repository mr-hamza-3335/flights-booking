"""
routers/otp.py
──────────────
POST /api/verify-otp    — verify the 6-digit code and confirm the booking
POST /api/resend-otp    — regenerate OTP and resend email
"""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import BookingRecord
from app.models.request import OtpVerifyRequest, OtpVerifyResponse, ResendOtpRequest
from app.services import email_service
from app.services.otp_service import (
    generate_otp,
    generate_unique_reference_id,
    get_otp_expiry,
    is_otp_valid,
)

logger  = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router  = APIRouter()


async def _load_pending(db: AsyncSession, request_id: int) -> BookingRecord:
    """Load a booking record that exists and is not yet verified."""
    result = await db.execute(
        select(BookingRecord).where(BookingRecord.id == request_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Booking request not found.")
    if record.is_verified:
        raise HTTPException(status_code=400, detail="This booking has already been verified.")
    return record


@router.post(
    "/verify-otp",
    response_model=OtpVerifyResponse,
    summary="Verify OTP and confirm the booking",
)
@limiter.limit("10/minute")
async def verify_otp(
    request: Request,
    body: OtpVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> OtpVerifyResponse:
    record = await _load_pending(db, body.request_id)

    if not is_otp_valid(body.otp_code, record.otp_code, record.otp_expiry):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP. Please try again or request a new code.",
        )

    # ── Generate a unique reference_id (pre-checked against DB, max 5 attempts) ─
    submitted_at = datetime.now(timezone.utc)
    try:
        reference_id = await generate_unique_reference_id(db)
    except RuntimeError as exc:
        logger.error("Reference ID generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Could not generate a booking reference. Please try again.")

    # ── Commit the verified booking ───────────────────────────────────────────
    record.reference_id = reference_id
    record.is_verified  = True
    record.otp_code     = None   # clear OTP so it can't be reused
    record.otp_expiry   = None
    record.status       = "new"
    try:
        await db.commit()
    except IntegrityError:
        # Final safety net — should never be reached after the pre-check
        await db.rollback()
        logger.error("Unexpected IntegrityError after pre-check for %s", reference_id)
        raise HTTPException(status_code=500, detail="Failed to confirm booking. Please try again.")

    await db.refresh(record)
    logger.info("Booking verified: request_id=%s → reference_id=%s", record.id, reference_id)

    # ── Send confirmation email (capped at 10 s) ──────────────────────────────
    try:
        confirmation_sent: bool = await asyncio.wait_for(
            email_service.send_confirmation_email(
                to_email=record.email,
                first_name=record.first_name,
                last_name=record.last_name,
                reference_id=reference_id,
                flight_number=record.flight_number,
                origin=record.origin,
                destination=record.destination,
                departure_date=record.departure_date,
                return_date=record.return_date,
                airline=record.airline,
                price=record.price,
                currency=record.currency,
                cabin_class=record.cabin_class,
                num_passengers=record.num_passengers,
                passenger_names=record.passenger_names,
            ),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        logger.warning("Confirmation email timed out for %s", reference_id)
        confirmation_sent = False

    # ── Agency notification (best-effort) ─────────────────────────────────────
    try:
        await asyncio.wait_for(
            email_service.send_agency_notification(
                reference_id=reference_id,
                first_name=record.first_name,
                last_name=record.last_name,
                email=record.email,
                phone=record.phone,
                flight_number=record.flight_number,
                origin=record.origin,
                destination=record.destination,
                departure_date=record.departure_date,
                return_date=record.return_date,
                airline=record.airline,
                price=record.price,
                currency=record.currency,
                cabin_class=record.cabin_class,
                num_passengers=record.num_passengers,
                passenger_names=record.passenger_names,
                special_requests=record.special_requests,
                terms_accepted=record.terms_accepted,
                data_consent=record.data_consent,
                submitted_at=submitted_at,
            ),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        logger.warning("Agency notification timed out for %s", reference_id)

    # Update email_sent flag
    record.email_sent = confirmation_sent
    await db.commit()

    if confirmation_sent:
        msg = "Booking confirmed! A confirmation email has been sent to your inbox."
    else:
        msg = "Booking confirmed! Our team will contact you within 24 hours."

    return OtpVerifyResponse(
        success=True,
        message=msg,
        reference_id=reference_id,
        submitted_at=submitted_at,
        email_sent=confirmation_sent,
    )


@router.post("/resend-otp", summary="Resend a new OTP to the customer's email")
@limiter.limit("5/minute")
async def resend_otp(
    request: Request,
    body: ResendOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    record = await _load_pending(db, body.request_id)

    new_otp        = generate_otp()
    record.otp_code   = new_otp
    record.otp_expiry = get_otp_expiry()
    await db.commit()

    try:
        otp_sent = await asyncio.wait_for(
            email_service.send_otp_email(
                to_email=record.email,
                first_name=record.first_name,
                otp_code=new_otp,
            ),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        logger.warning("Resend OTP email timed out for request_id=%s", record.id)
        otp_sent = False

    return {"message": "New verification code sent." if otp_sent else "Could not send email. Please try again.", "otp_sent": otp_sent}
