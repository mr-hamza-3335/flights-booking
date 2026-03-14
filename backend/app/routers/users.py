"""
routers/users.py
────────────────
GET    /api/users/bookings              — current user's booking history
GET    /api/users/bookings/{ref}        — single booking detail
GET    /api/users/saved-flights         — saved flights
POST   /api/users/saved-flights         — save a flight
DELETE /api/users/saved-flights/{id}    — remove saved flight
GET    /api/users/alerts                — price alerts
POST   /api/users/alerts                — create alert
DELETE /api/users/alerts/{id}           — delete alert
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import BookingRecord, FlightAlert, SavedFlight, User
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class BookingSummary(BaseModel):
    id: int
    reference_id: str
    status: str
    origin: str
    destination: str
    airline: str
    flight_number: str
    departure_date: str
    return_date: Optional[str]
    price: float
    currency: str
    cabin_class: str
    num_passengers: int
    email_sent: bool
    cancelled_at: Optional[str]
    created_at: str


class BookingDetail(BookingSummary):
    passenger_names: List[str]
    special_requests: Optional[str]
    first_name: str
    last_name: str
    email: str
    phone: str


class SaveFlightRequest(BaseModel):
    flight_data: Dict[str, Any]
    notes: Optional[str] = None


class SavedFlightOut(BaseModel):
    id: int
    flight_data: Dict[str, Any]
    notes: Optional[str]
    created_at: str


class AlertRequest(BaseModel):
    origin: str
    destination: str
    origin_label: str = ""
    destination_label: str = ""
    target_price: float


class AlertOut(BaseModel):
    id: int
    origin: str
    destination: str
    origin_label: str
    destination_label: str
    target_price: float
    is_active: bool
    created_at: str


# ── Booking endpoints ─────────────────────────────────────────────────────────

@router.get("/bookings", response_model=List[BookingSummary])
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[BookingSummary]:
    result = await db.execute(
        select(BookingRecord)
        .where(
            BookingRecord.user_id == current_user.id,
            BookingRecord.is_verified == True,  # noqa: E712
        )
        .order_by(BookingRecord.created_at.desc())
    )
    records = result.scalars().all()
    return [
        BookingSummary(
            id=r.id,
            reference_id=r.reference_id,
            status=r.status,
            origin=r.origin,
            destination=r.destination,
            airline=r.airline,
            flight_number=r.flight_number,
            departure_date=r.departure_date,
            return_date=r.return_date,
            price=r.price,
            currency=r.currency,
            cabin_class=r.cabin_class,
            num_passengers=r.num_passengers,
            email_sent=r.email_sent,
            cancelled_at=r.cancelled_at.isoformat() if r.cancelled_at else None,
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]


@router.get("/bookings/{reference_id}", response_model=BookingDetail)
async def get_my_booking(
    reference_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BookingDetail:
    result = await db.execute(
        select(BookingRecord).where(
            BookingRecord.reference_id == reference_id,
            BookingRecord.user_id == current_user.id,
        )
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")

    return BookingDetail(
        id=r.id, reference_id=r.reference_id, status=r.status,
        origin=r.origin, destination=r.destination, airline=r.airline,
        flight_number=r.flight_number, departure_date=r.departure_date,
        return_date=r.return_date, price=r.price, currency=r.currency,
        cabin_class=r.cabin_class, num_passengers=r.num_passengers,
        email_sent=r.email_sent,
        cancelled_at=r.cancelled_at.isoformat() if r.cancelled_at else None,
        created_at=r.created_at.isoformat(),
        passenger_names=r.passenger_names, special_requests=r.special_requests,
        first_name=r.first_name, last_name=r.last_name,
        email=r.email, phone=r.phone,
    )


@router.delete("/bookings/{reference_id}", status_code=status.HTTP_200_OK)
async def cancel_booking(
    reference_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancel a pending booking. Only the owner can cancel; confirmed bookings cannot be cancelled."""
    result = await db.execute(
        select(BookingRecord).where(
            BookingRecord.reference_id == reference_id,
            BookingRecord.user_id == current_user.id,
            BookingRecord.is_verified == True,  # noqa: E712
        )
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")
    if r.status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")
    if r.status in ("confirmed", "completed"):
        raise HTTPException(status_code=400, detail="Cannot cancel a confirmed booking. Please contact support.")

    r.status = "cancelled"
    r.cancelled_at = datetime.now(timezone.utc)
    await db.commit()
    logger.info("Booking cancelled: %s by user_id=%s", reference_id, current_user.id)
    return {"message": "Booking cancelled successfully", "reference_id": reference_id}


# ── Saved flights ─────────────────────────────────────────────────────────────

@router.get("/saved-flights", response_model=List[SavedFlightOut])
async def get_saved_flights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SavedFlightOut]:
    result = await db.execute(
        select(SavedFlight)
        .where(SavedFlight.user_id == current_user.id)
        .order_by(SavedFlight.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        SavedFlightOut(
            id=r.id,
            flight_data=r.flight_data,
            notes=r.notes,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/saved-flights", response_model=SavedFlightOut, status_code=status.HTTP_201_CREATED)
async def save_flight(
    body: SaveFlightRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SavedFlightOut:
    row = SavedFlight(
        user_id=current_user.id,
        flight_data_json=json.dumps(body.flight_data),
        notes=body.notes,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SavedFlightOut(
        id=row.id,
        flight_data=row.flight_data,
        notes=row.notes,
        created_at=row.created_at.isoformat(),
    )


@router.delete("/saved-flights/{flight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_flight(
    flight_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(SavedFlight).where(
            SavedFlight.id == flight_id,
            SavedFlight.user_id == current_user.id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Saved flight not found")
    await db.delete(row)
    await db.commit()


# ── Flight alerts ─────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=List[AlertOut])
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AlertOut]:
    result = await db.execute(
        select(FlightAlert)
        .where(FlightAlert.user_id == current_user.id)
        .order_by(FlightAlert.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        AlertOut(
            id=r.id, origin=r.origin, destination=r.destination,
            origin_label=r.origin_label, destination_label=r.destination_label,
            target_price=r.target_price, is_active=r.is_active,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/alerts", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(
    body: AlertRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AlertOut:
    row = FlightAlert(
        user_id=current_user.id,
        origin=body.origin.upper(),
        destination=body.destination.upper(),
        origin_label=body.origin_label,
        destination_label=body.destination_label,
        target_price=body.target_price,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return AlertOut(
        id=row.id, origin=row.origin, destination=row.destination,
        origin_label=row.origin_label, destination_label=row.destination_label,
        target_price=row.target_price, is_active=row.is_active,
        created_at=row.created_at.isoformat(),
    )


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(FlightAlert).where(
            FlightAlert.id == alert_id,
            FlightAlert.user_id == current_user.id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(row)
    await db.commit()
