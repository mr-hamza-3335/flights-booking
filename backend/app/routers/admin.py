"""
routers/admin.py
────────────────
Admin-only endpoints (require role=admin).

GET  /api/admin/stats                   — dashboard counts
GET  /api/admin/bookings                — all bookings (paginated, filterable)
GET  /api/admin/bookings/{id}           — single booking full detail
PUT  /api/admin/bookings/{id}/status    — update booking status
GET  /api/admin/users                   — all users (paginated, searchable)
PUT  /api/admin/users/{id}/role         — change user role / deactivate

Status values: new | contacted | confirmed | cancelled
(Legacy values "pending" and "completed" are also accepted for backward compat.)
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.db_models import BookingRecord, User
from app.services.auth_service import get_admin_user, get_current_user
from app.services.email_service import send_status_update_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

# All valid status values (new/pending are aliases; confirmed/completed are aliases)
VALID_STATUSES = {"new", "pending", "contacted", "confirmed", "completed", "cancelled"}

# Display labels for the UI
STATUS_LABELS = {
    "new":       "New",
    "pending":   "New",
    "contacted": "Contacted",
    "confirmed": "Confirmed",
    "completed": "Confirmed",
    "cancelled": "Cancelled",
}


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AdminBooking(BaseModel):
    id: int
    reference_id: str
    status: str
    status_label: str
    first_name: str
    last_name: str
    email: str
    phone: str
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
    passenger_names: List[str]
    special_requests: Optional[str]
    email_sent: bool
    user_id: Optional[int]
    created_at: str


class AdminUser(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: str
    is_active: bool
    booking_count: int
    created_at: str


class StatusUpdateRequest(BaseModel):
    status: str


class ManualEmailRequest(BaseModel):
    message: str = ""  # optional admin note; if blank, a default is used


class RoleUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class StatsResponse(BaseModel):
    total_bookings: int
    new: int          # new + pending
    contacted: int
    confirmed: int    # confirmed + completed
    cancelled: int
    total_users: int
    email_sent_count: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _booking_to_schema(r: BookingRecord) -> AdminBooking:
    return AdminBooking(
        id=r.id,
        reference_id=r.reference_id,
        status=r.status,
        status_label=STATUS_LABELS.get(r.status, r.status.capitalize()),
        first_name=r.first_name,
        last_name=r.last_name,
        email=r.email,
        phone=r.phone,
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
        passenger_names=r.passenger_names,
        special_requests=r.special_requests,
        email_sent=r.email_sent,
        user_id=r.user_id,
        created_at=r.created_at.isoformat(),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

class DailyStat(BaseModel):
    day: str    # YYYY-MM-DD
    count: int


@router.get("/stats/daily", response_model=List[DailyStat])
async def get_daily_stats(
    days: int = Query(30, ge=7, le=90, description="How many days of history to return"),
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[DailyStat]:
    """Return verified booking counts grouped by day for the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.strftime("%Y-%m-%d", BookingRecord.created_at).label("day"),
            func.count(BookingRecord.id).label("count"),
        )
        .where(
            BookingRecord.is_verified == True,  # noqa: E712
            BookingRecord.created_at >= cutoff,
        )
        .group_by(func.strftime("%Y-%m-%d", BookingRecord.created_at))
        .order_by(func.strftime("%Y-%m-%d", BookingRecord.created_at))
    )
    rows = result.all()
    day_map = {row.day: row.count for row in rows}

    # Fill every day in the range (zero for days with no bookings)
    return [
        DailyStat(
            day=(datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d"),
            count=day_map.get(
                (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d"), 0
            ),
        )
        for i in range(days)
    ]


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> StatsResponse:
    verified = BookingRecord.is_verified == True  # noqa: E712

    total_b = (await db.execute(select(func.count(BookingRecord.id)).where(verified))).scalar() or 0

    # new = "new" or legacy "pending"
    new_cnt = (
        await db.execute(
            select(func.count(BookingRecord.id)).where(
                verified, BookingRecord.status.in_(["new", "pending"])
            )
        )
    ).scalar() or 0

    contacted = (
        await db.execute(
            select(func.count(BookingRecord.id)).where(verified, BookingRecord.status == "contacted")
        )
    ).scalar() or 0

    # confirmed = "confirmed" or legacy "completed"
    confirmed = (
        await db.execute(
            select(func.count(BookingRecord.id)).where(
                verified, BookingRecord.status.in_(["confirmed", "completed"])
            )
        )
    ).scalar() or 0

    cancelled = (
        await db.execute(
            select(func.count(BookingRecord.id)).where(verified, BookingRecord.status == "cancelled")
        )
    ).scalar() or 0

    total_u = (await db.execute(select(func.count(User.id)))).scalar() or 0

    email_sent = (
        await db.execute(
            select(func.count(BookingRecord.id)).where(
                verified, BookingRecord.email_sent == True  # noqa: E712
            )
        )
    ).scalar() or 0

    return StatsResponse(
        total_bookings=total_b,
        new=new_cnt,
        contacted=contacted,
        confirmed=confirmed,
        cancelled=cancelled,
        total_users=total_u,
        email_sent_count=email_sent,
    )


@router.get("/bookings", response_model=List[AdminBooking])
async def list_bookings(
    q: Optional[str] = Query(None, description="Search by email, name, or reference"),
    booking_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminBooking]:
    stmt = select(BookingRecord).where(
        BookingRecord.is_verified == True  # noqa: E712
    ).order_by(BookingRecord.created_at.desc())

    if booking_status:
        # Accept canonical or alias values
        if booking_status in ("new", "pending"):
            stmt = stmt.where(BookingRecord.status.in_(["new", "pending"]))
        elif booking_status in ("confirmed", "completed"):
            stmt = stmt.where(BookingRecord.status.in_(["confirmed", "completed"]))
        else:
            stmt = stmt.where(BookingRecord.status == booking_status)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                BookingRecord.email.ilike(like),
                BookingRecord.first_name.ilike(like),
                BookingRecord.last_name.ilike(like),
                BookingRecord.reference_id.ilike(like),
            )
        )

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return [_booking_to_schema(r) for r in result.scalars().all()]


@router.get("/bookings/{booking_id}", response_model=AdminBooking)
async def get_booking(
    booking_id: int,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminBooking:
    result = await db.execute(select(BookingRecord).where(BookingRecord.id == booking_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _booking_to_schema(r)


@router.put("/bookings/{booking_id}/status", response_model=AdminBooking)
async def update_booking_status(
    booking_id: int,
    body: StatusUpdateRequest,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminBooking:
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )
    result = await db.execute(select(BookingRecord).where(BookingRecord.id == booking_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")

    r.status = body.status
    await db.commit()
    await db.refresh(r)
    logger.info("Booking %s status → %s", r.reference_id, body.status)
    return _booking_to_schema(r)


@router.get("/users", response_model=List[AdminUser])
async def list_users(
    q: Optional[str] = Query(None, description="Search by email or name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[AdminUser]:
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()

    user_ids = [u.id for u in users]
    counts: dict[int, int] = {}
    if user_ids:
        count_result = await db.execute(
            select(BookingRecord.user_id, func.count(BookingRecord.id))
            .where(BookingRecord.user_id.in_(user_ids))
            .group_by(BookingRecord.user_id)
        )
        counts = {uid: cnt for uid, cnt in count_result.all()}

    return [
        AdminUser(
            id=u.id, email=u.email,
            first_name=u.first_name, last_name=u.last_name,
            phone=u.phone, role=u.role, is_active=u.is_active,
            booking_count=counts.get(u.id, 0),
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]


@router.post("/bookings/{booking_id}/email")
async def send_manual_email(
    booking_id: int,
    body: ManualEmailRequest,
    _admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Send a manual status-update email to the customer for a booking."""
    result = await db.execute(
        select(BookingRecord).where(
            BookingRecord.id == booking_id,
            BookingRecord.is_verified == True,  # noqa: E712
        )
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Booking not found")
    if not r.reference_id:
        raise HTTPException(status_code=400, detail="Booking has no reference ID yet")

    import asyncio
    try:
        sent = await asyncio.wait_for(
            send_status_update_email(
                to_email=r.email,
                first_name=r.first_name,
                reference_id=r.reference_id,
                new_status=r.status,
                admin_message=body.message,
            ),
            timeout=10.0,
        )
    except asyncio.TimeoutError:
        sent = False

    return {"sent": sent, "to": r.email, "reference_id": r.reference_id}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete a user account. Cannot delete your own account."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    logger.info("User deleted: id=%s (%s) by admin %s", user_id, user.email, admin.email)


@router.put("/users/{user_id}/role", response_model=AdminUser)
async def update_user_role(
    user_id: int,
    body: RoleUpdateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account via admin panel")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        if body.role not in {"user", "admin"}:
            raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)

    count_result = await db.execute(
        select(func.count(BookingRecord.id)).where(BookingRecord.user_id == user.id)
    )
    cnt = count_result.scalar() or 0

    return AdminUser(
        id=user.id, email=user.email,
        first_name=user.first_name, last_name=user.last_name,
        phone=user.phone, role=user.role, is_active=user.is_active,
        booking_count=cnt,
        created_at=user.created_at.isoformat(),
    )
