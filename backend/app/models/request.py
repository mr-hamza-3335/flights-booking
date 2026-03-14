from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


class BookingRequestSubmit(BaseModel):
    # ── Personal information ──────────────────────────────────────────────
    first_name: str
    last_name: str
    email: EmailStr
    phone: str

    # ── Selected flight ───────────────────────────────────────────────────
    flight_id: str
    flight_number: str
    origin: str          # "London Heathrow (LHR)"
    destination: str     # "New York JFK (JFK)"
    departure_date: str
    return_date: Optional[str] = None
    airline: str
    price: float
    currency: str
    cabin_class: str

    # ── Travel information ────────────────────────────────────────────────
    num_passengers: int
    passenger_names: List[str]
    special_requests: Optional[str] = None

    # ── Consent ───────────────────────────────────────────────────────────
    terms_accepted: bool
    data_consent: bool

    @field_validator("first_name", "last_name")
    @classmethod
    def names_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name fields cannot be empty")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Phone number is required")
        return v.strip()

    @field_validator("terms_accepted")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the terms and conditions")
        return v

    @field_validator("data_consent")
    @classmethod
    def must_consent_data(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must consent to data processing")
        return v

    @field_validator("passenger_names")
    @classmethod
    def passenger_names_not_empty(cls, v: List[str]) -> List[str]:
        cleaned = [n.strip() for n in v if n.strip()]
        if not cleaned:
            raise ValueError("At least one passenger name is required")
        return cleaned


class BookingRequestResponse(BaseModel):
    """Returned immediately after booking form submission (OTP sent, not yet verified)."""
    request_id: int
    email: str
    otp_sent: bool = False
    message: str


class OtpVerifyRequest(BaseModel):
    request_id: int
    otp_code: str


class OtpVerifyResponse(BaseModel):
    """Returned after successful OTP verification — booking is confirmed."""
    success: bool
    message: str
    reference_id: str
    submitted_at: datetime
    email_sent: bool = False


class ResendOtpRequest(BaseModel):
    request_id: int
