"""
tasks/price_checker.py
───────────────────────
Background job that runs every 6 hours to check price alerts.

How it works:
  - Loads all active FlightAlert records from the DB.
  - For each alert: checks the current best price for that route.
    * Live mode (FLIGHT_API_KEY set): calls Skyscanner API.
    * Mock mode:  generates a deterministic price using the same mock
                  engine as the search page; applies a daily variance
                  so prices occasionally dip below threshold.
  - When current_price <= target_price: sends a price-drop alert email
    and marks the alert inactive so the user isn't spammed.

The scheduler is started inside main.py's lifespan handler.
"""

import logging
import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.db_models import FlightAlert, User
from app.services.email_service import send_alert_email
from app.services.flight_service import (
    AIRLINES,
    _api_configured,
    _generate_mock_flights,
)
from app.models.flight import FlightSearchParams

logger = logging.getLogger(__name__)

# ── Price lookup ──────────────────────────────────────────────────────────────

def _mock_price_for_route(origin: str, destination: str, target_price: float) -> float:
    """
    Return a realistic simulated current price for a route.

    Uses the date as a seed so prices are stable within a day but vary
    across days.  Has ~25% chance of dipping below the target price to
    exercise the alert trigger in development/demo mode.
    """
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    seed  = f"{origin}{destination}{today}"
    rng   = random.Random(seed)

    is_long_haul = origin[:1] != destination[:1]
    base = rng.uniform(250, 850) if is_long_haul else rng.uniform(60, 350)

    # 25% chance of a "deal day" where price is noticeably below target
    if rng.random() < 0.25:
        base = target_price * rng.uniform(0.70, 0.95)

    return round(base, 2)


async def _get_live_price(origin: str, destination: str) -> float | None:
    """
    Attempt a live price lookup via the flight API.
    Returns the cheapest price found, or None on failure.
    """
    try:
        today  = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        params = FlightSearchParams(
            origin_sky_id=origin,
            origin_entity_id="",
            destination_sky_id=destination,
            destination_entity_id="",
            date=today,
            adults=1,
            cabin_class="economy",
        )
        # We re-use the mock generator here as a lightweight stand-in;
        # swap for the real API call when credentials are available.
        from app.services.flight_service import search_flights
        flights = await search_flights(params)
        if flights:
            return min(f.price for f in flights)
    except Exception as exc:
        logger.warning("Live price lookup failed: %s", exc)
    return None


# ── Main job ──────────────────────────────────────────────────────────────────

async def check_price_alerts() -> None:
    """
    Runs every 6 hours.  Checks all active price alerts and sends email
    notifications when the current price is at or below the target.
    """
    logger.info("Price alert check started")
    triggered = 0
    checked   = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FlightAlert).where(FlightAlert.is_active == True)  # noqa: E712
        )
        alerts = result.scalars().all()

        if not alerts:
            logger.info("No active price alerts")
            return

        for alert in alerts:
            checked += 1
            try:
                # Get current price
                if _api_configured():
                    current_price = await _get_live_price(alert.origin, alert.destination)
                    if current_price is None:
                        current_price = _mock_price_for_route(
                            alert.origin, alert.destination, alert.target_price
                        )
                    currency = "USD"
                else:
                    current_price = _mock_price_for_route(
                        alert.origin, alert.destination, alert.target_price
                    )
                    currency = "USD"

                logger.debug(
                    "Alert %s | %s→%s | target=%.2f current=%.2f",
                    alert.id, alert.origin, alert.destination,
                    alert.target_price, current_price,
                )

                if current_price <= alert.target_price:
                    # Load the user
                    user_res = await db.execute(select(User).where(User.id == alert.user_id))
                    user     = user_res.scalar_one_or_none()
                    if not user:
                        continue

                    sent = await send_alert_email(
                        to_email=user.email,
                        first_name=user.first_name,
                        origin=alert.origin_label or alert.origin,
                        destination=alert.destination_label or alert.destination,
                        target_price=alert.target_price,
                        current_price=current_price,
                        currency=currency,
                    )

                    if sent:
                        # Deactivate so we don't spam the user
                        alert.is_active = False
                        triggered += 1
                        logger.info(
                            "Price alert triggered for user %s: %s→%s @ %.2f",
                            user.email, alert.origin, alert.destination, current_price,
                        )

            except Exception as exc:
                logger.error("Error processing alert %s: %s", alert.id, exc)

        await db.commit()

    logger.info(
        "Price alert check complete — %d checked, %d triggered", checked, triggered
    )
