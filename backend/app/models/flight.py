from pydantic import BaseModel
from typing import Optional, List


class Airport(BaseModel):
    skyId: str
    entityId: str
    name: str
    city: str
    country: str
    iata: str
    type: str = "AIRPORT"


class FlightSearchParams(BaseModel):
    origin_sky_id: str
    origin_entity_id: str
    destination_sky_id: str
    destination_entity_id: str
    date: str  # YYYY-MM-DD
    return_date: Optional[str] = None
    adults: int = 1
    children: int = 0
    infants: int = 0
    cabin_class: str = "economy"  # economy, premium_economy, business, first


class Leg(BaseModel):
    id: str
    flight_number: str          # e.g. BA 101
    origin: str                 # IATA code
    origin_city: str            # City name
    destination: str            # IATA code
    destination_city: str       # City name
    departure: str              # ISO datetime
    arrival: str                # ISO datetime
    duration_minutes: int
    stops: int
    carriers: List[str]
    carrier_logos: List[str] = []


class FlightItinerary(BaseModel):
    id: str
    price: float
    currency: str
    legs: List[Leg]
    score: Optional[float] = None
    tags: List[str] = []
    deeplink: Optional[str] = None
