"""
flight_api_service.py
─────────────────────
Public API surface for all flight-related operations.
Delegates to the underlying flight_service implementation so that
callers always import from this canonical module name.
"""

from app.services.flight_service import (  # noqa: F401 – re-export
    search_airports,
    search_flights,
    get_flight_details,
    get_cached_flight,
    ALL_AIRPORTS,
    _generate_mock_airports,   # exposed for testing
    _generate_mock_flights,    # exposed for testing
)

__all__ = [
    "search_airports",
    "search_flights",
    "get_flight_details",
    "get_cached_flight",
    "ALL_AIRPORTS",
]
