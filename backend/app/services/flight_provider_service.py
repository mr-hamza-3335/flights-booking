"""
flight_provider_service.py
──────────────────────────
Abstract interface for flight data providers.

Supported / planned providers:
  - SkyscannerProvider  (active — uses sky-scrapper RapidAPI)
  - AmadeusProvider     (placeholder — not yet configured)
  - DuffelProvider      (placeholder — not yet configured)

To add a new provider:
  1. Subclass FlightProvider and implement search_flights() + search_airports().
  2. Register it in get_flight_provider() below.
  3. Set FLIGHT_PROVIDER=<name> in backend/.env.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import List

from app.models.flight import FlightItinerary, FlightSearchParams

logger = logging.getLogger(__name__)


# ── Abstract base ─────────────────────────────────────────────────────────────

class FlightProvider(ABC):
    """Abstract base class that every flight-data provider must implement."""

    @abstractmethod
    async def search_flights(self, params: FlightSearchParams) -> List[FlightItinerary]:
        """Return a list of flight itineraries matching *params*."""
        ...

    @abstractmethod
    async def search_airports(self, query: str) -> List[dict]:
        """Return a list of airport dicts matching the free-text *query*."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        ...

    @property
    def is_configured(self) -> bool:
        """Return True if the provider has the credentials it needs to run."""
        return True


# ── Skyscanner (currently active) ─────────────────────────────────────────────

class SkyscannerProvider(FlightProvider):
    """
    Skyscanner data via sky-scrapper RapidAPI.
    Delegates to the existing flight_service module.
    Requires: FLIGHT_API_KEY in .env
    """

    @property
    def name(self) -> str:
        return "Skyscanner (RapidAPI)"

    @property
    def is_configured(self) -> bool:
        from app.config import settings
        return bool(settings.flight_api_key)

    async def search_flights(self, params: FlightSearchParams) -> List[FlightItinerary]:
        from app.services.flight_service import search_flights as _search
        return await _search(params)

    async def search_airports(self, query: str) -> List[dict]:
        from app.services.flight_service import search_airports as _search
        results = await _search(query)
        return [r.model_dump() for r in results]


# ── Amadeus ───────────────────────────────────────────────────────────────────

class AmadeusProvider(FlightProvider):
    """
    Amadeus Self-Service API (placeholder — not yet implemented).
    Requires: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET in .env

    Getting started:
      https://developers.amadeus.com/self-service
      pip install amadeus
    """

    @property
    def name(self) -> str:
        return "Amadeus"

    @property
    def is_configured(self) -> bool:
        from app.config import settings
        return bool(
            getattr(settings, "amadeus_client_id", "") and
            getattr(settings, "amadeus_client_secret", "")
        )

    async def search_flights(self, params: FlightSearchParams) -> List[FlightItinerary]:
        raise NotImplementedError(
            "AmadeusProvider is not yet implemented. "
            "See https://developers.amadeus.com/self-service for setup instructions."
        )

    async def search_airports(self, query: str) -> List[dict]:
        raise NotImplementedError("AmadeusProvider.search_airports not yet implemented.")


# ── Duffel ────────────────────────────────────────────────────────────────────

class DuffelProvider(FlightProvider):
    """
    Duffel Flights API (placeholder — not yet implemented).
    Requires: DUFFEL_ACCESS_TOKEN in .env

    Getting started:
      https://duffel.com/docs
      pip install duffel-api
    """

    @property
    def name(self) -> str:
        return "Duffel"

    @property
    def is_configured(self) -> bool:
        from app.config import settings
        return bool(getattr(settings, "duffel_access_token", ""))

    async def search_flights(self, params: FlightSearchParams) -> List[FlightItinerary]:
        raise NotImplementedError(
            "DuffelProvider is not yet implemented. "
            "See https://duffel.com/docs for setup instructions."
        )

    async def search_airports(self, query: str) -> List[dict]:
        raise NotImplementedError("DuffelProvider.search_airports not yet implemented.")


# ── Provider registry ─────────────────────────────────────────────────────────

_PROVIDERS: dict[str, type[FlightProvider]] = {
    "skyscanner": SkyscannerProvider,
    "amadeus":    AmadeusProvider,
    "duffel":     DuffelProvider,
}


def get_flight_provider() -> FlightProvider:
    """
    Return the active flight provider based on the FLIGHT_PROVIDER env var.
    Falls back to SkyscannerProvider if unset or unrecognised.
    """
    from app.config import settings
    provider_name: str = getattr(settings, "flight_provider", "skyscanner").lower()
    provider_cls = _PROVIDERS.get(provider_name, SkyscannerProvider)
    provider = provider_cls()

    if not provider.is_configured:
        logger.warning(
            "Flight provider '%s' is not fully configured — falling back to mock mode. "
            "Check your .env file.",
            provider.name,
        )

    logger.debug("Active flight provider: %s", provider.name)
    return provider
