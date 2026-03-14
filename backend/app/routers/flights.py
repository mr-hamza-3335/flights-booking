import logging

from fastapi import APIRouter, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.flight import Airport, FlightItinerary, FlightSearchParams
from app.services import flight_service

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


@router.get("/airports/search", response_model=list[Airport], tags=["Flights"])
@limiter.limit("30/minute")
async def search_airports(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100, description="City, airport name, or IATA code"),
) -> list[Airport]:
    """Search airports by name, city, or IATA code."""
    try:
        return await flight_service.search_airports(q.strip())
    except Exception as e:
        logger.error(f"Airport search error: {e}")
        raise HTTPException(status_code=500, detail="Airport search failed. Please try again.")


@router.post("/search-flights", response_model=list[FlightItinerary], tags=["Flights"])
@limiter.limit("30/minute")
async def search_flights(
    request: Request,
    params: FlightSearchParams,
) -> list[FlightItinerary]:
    """Search available flights and return a ranked list of itineraries."""
    if not params.origin_sky_id or not params.destination_sky_id:
        raise HTTPException(status_code=400, detail="Origin and destination are required.")
    if params.origin_sky_id == params.destination_sky_id:
        raise HTTPException(status_code=400, detail="Origin and destination cannot be the same.")
    if params.adults < 1:
        raise HTTPException(status_code=400, detail="At least one adult passenger is required.")
    try:
        return await flight_service.search_flights(params)
    except Exception as e:
        logger.error(f"Flight search error: {e}")
        raise HTTPException(status_code=500, detail="Flight search failed. Please try again.")


@router.get("/flight-details", response_model=FlightItinerary, tags=["Flights"])
@limiter.limit("60/minute")
async def get_flight_details(
    request: Request,
    flight_id: str = Query(..., description="Flight itinerary ID returned by search"),
) -> FlightItinerary:
    """Retrieve details for a previously searched flight by its ID."""
    flight = await flight_service.get_flight_details(flight_id)
    if not flight:
        raise HTTPException(
            status_code=404,
            detail="Flight not found. Please search again — results expire after a new search.",
        )
    return flight
