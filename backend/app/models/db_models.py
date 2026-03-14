import json
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    bookings: Mapped[List["BookingRecord"]] = relationship("BookingRecord", back_populates="user")
    saved_flights: Mapped[List["SavedFlight"]] = relationship("SavedFlight", back_populates="user")
    alerts: Mapped[List["FlightAlert"]] = relationship("FlightAlert", back_populates="user")


class BookingRecord(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # For new DBs: nullable (filled in after OTP verified).
    # For existing DBs: a _PENDING_ placeholder is stored until verification.
    reference_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="new")  # new/contacted/confirmed/cancelled

    # OTP verification
    otp_code: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    otp_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Customer
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(50))

    # Flight
    flight_id: Mapped[str] = mapped_column(String(255))
    flight_number: Mapped[str] = mapped_column(String(30))
    origin: Mapped[str] = mapped_column(String(255))
    destination: Mapped[str] = mapped_column(String(255))
    departure_date: Mapped[str] = mapped_column(String(20))
    return_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    airline: Mapped[str] = mapped_column(String(255))
    price: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10))
    cabin_class: Mapped[str] = mapped_column(String(30))

    # Travel
    num_passengers: Mapped[int] = mapped_column(Integer)
    passenger_names_json: Mapped[str] = mapped_column(Text, default="[]")
    special_requests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Consent
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    data_consent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Meta
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="bookings")

    @property
    def passenger_names(self) -> List[str]:
        return json.loads(self.passenger_names_json)

    @passenger_names.setter
    def passenger_names(self, value: List[str]) -> None:
        self.passenger_names_json = json.dumps(value)


class SavedFlight(Base):
    __tablename__ = "saved_flights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    flight_data_json: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="saved_flights")

    @property
    def flight_data(self) -> dict:
        return json.loads(self.flight_data_json)


class FlightAlert(Base):
    __tablename__ = "flight_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    origin: Mapped[str] = mapped_column(String(10))
    destination: Mapped[str] = mapped_column(String(10))
    origin_label: Mapped[str] = mapped_column(String(255), default="")
    destination_label: Mapped[str] = mapped_column(String(255), default="")
    target_price: Mapped[float] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship("User", back_populates="alerts")
