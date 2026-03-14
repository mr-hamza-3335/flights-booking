"""
routers/track.py
────────────────
GET /api/track/{reference_id}

Public endpoint — no authentication required.
Returns booking status + basic flight info by reference number.
Intentionally returns only fields safe to expose publicly.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.database import get_db
from app.models.db_models import BookingRecord

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Bookings"])

STATUS_LABELS = {
    "new":       "Under Review",
    "pending":   "Under Review",
    "contacted": "Contacted",
    "confirmed": "Confirmed",
    "completed": "Confirmed",
    "cancelled": "Cancelled",
}

STATUS_DESCRIPTIONS = {
    "new":       "Your request has been received and is being reviewed by our team.",
    "pending":   "Your request has been received and is being reviewed by our team.",
    "contacted": "Our team has reviewed your request and will be in contact shortly.",
    "confirmed": "Your booking has been confirmed. Our team will contact you with payment details.",
    "completed": "Your booking has been confirmed. Our team will contact you with payment details.",
    "cancelled": "Your booking request has been cancelled. Please contact us if this is incorrect.",
}


class BookingTrackResponse(BaseModel):
    reference_id: str
    status: str
    status_label: str
    status_description: str
    first_name: str
    origin: str
    destination: str
    airline: str
    flight_number: str
    departure_date: str
    return_date: Optional[str]
    num_passengers: int
    cabin_class: str
    created_at: str


@router.get("/track/{reference_id}", response_model=BookingTrackResponse)
async def track_booking(
    reference_id: str,
    db: AsyncSession = Depends(get_db),
) -> BookingTrackResponse:
    """Look up a booking by reference number — public endpoint, no auth required."""
    # Only allow real SR-... reference IDs (not pending placeholders)
    if not reference_id.startswith("SR-"):
        raise HTTPException(status_code=404, detail="Booking not found")

    result = await db.execute(
        select(BookingRecord).where(
            BookingRecord.reference_id == reference_id,
            BookingRecord.is_verified == True,  # noqa: E712
        )
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")

    return BookingTrackResponse(
        reference_id=r.reference_id,
        status=r.status,
        status_label=STATUS_LABELS.get(r.status, r.status.capitalize()),
        status_description=STATUS_DESCRIPTIONS.get(r.status, ""),
        first_name=r.first_name,
        origin=r.origin,
        destination=r.destination,
        airline=r.airline,
        flight_number=r.flight_number,
        departure_date=r.departure_date,
        return_date=r.return_date,
        num_passengers=r.num_passengers,
        cabin_class=r.cabin_class,
        created_at=r.created_at.isoformat(),
    )
