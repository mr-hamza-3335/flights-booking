"""
SkyRequest API  v3.0
════════════════════════════════════════════════════════════════

Architecture
────────────
  app/
  ├── config.py              Pydantic settings (reads .env)
  ├── database.py            Async SQLAlchemy engine + session
  ├── models/
  │   ├── flight.py          Airport · Leg · FlightItinerary · FlightSearchParams
  │   ├── request.py         BookingRequestSubmit · BookingRequestResponse
  │   ├── booking.py         Re-exports from request.py
  │   └── db_models.py       SQLAlchemy ORM models (User, BookingRecord, …)
  ├── routers/
  │   ├── flights.py         GET  /api/airports/search
  │   │                      POST /api/search-flights
  │   │                      GET  /api/flight-details
  │   ├── booking.py         POST /api/booking-request
  │   ├── auth.py            POST /api/auth/signup|login  GET /api/auth/me
  │   ├── users.py           /api/users/* (profile, bookings, saved, alerts)
  │   └── admin.py           /api/admin/* (admin panel — requires role=admin)
  ├── services/
  │   ├── flight_service.py  Core logic: search_flights, search_airports, mock gen
  │   ├── email_service.py   HTML email to customer + agency + alerts
  │   └── auth_service.py    JWT creation/verification, password hashing
  └── utils/
      ├── logger.py          Structured logging setup
      ├── error_handlers.py  Centralised HTTP / validation error responses
      └── validators.py      Reusable field validators
"""

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import init_db
from app.routers import flights, booking, otp, track
from app.routers import auth, users, admin
from app.tasks.price_checker import check_price_alerts
from app.utils.logger import get_logger, setup_logging
from app.utils.error_handlers import attach_handlers

scheduler = AsyncIOScheduler(timezone="UTC")

# ── Logging ───────────────────────────────────────────────────────────────────
setup_logging()
logger = get_logger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── Lifespan: initialise DB on startup ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initialising database…")
    await init_db()
    logger.info("Database ready.")

    # ── Price alert background scheduler ─────────────────────────────────────
    scheduler.add_job(check_price_alerts, "interval", hours=6, id="price_alerts",
                      next_run_time=None)   # first run after 6 h, not immediately on boot
    scheduler.start()
    logger.info("Scheduler started (price alerts every 6 h)")

    yield

    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="SkyRequest API",
    description=__doc__,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Flights",  "description": "Airport search and flight search endpoints"},
        {"name": "Bookings", "description": "Submit and manage booking requests"},
        {"name": "Auth",     "description": "User registration, login, and profile"},
        {"name": "Users",    "description": "User dashboard: bookings, saved flights, alerts"},
        {"name": "Admin",    "description": "Admin panel (role=admin required)"},
        {"name": "Health",   "description": "Service health check"},
    ],
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────
attach_handlers(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(flights.router,  prefix="/api")
app.include_router(booking.router,  prefix="/api")
app.include_router(otp.router,      prefix="/api")
app.include_router(track.router,    prefix="/api")
app.include_router(auth.router,     prefix="/api")
app.include_router(users.router,    prefix="/api")
app.include_router(admin.router,    prefix="/api")


# ── Test email ────────────────────────────────────────────────────────────────
@app.get("/api/test-email", tags=["Health"], summary="Test SMTP configuration")
async def test_email():
    """Send a test email to the configured notification address and report success or error."""
    import asyncio
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    import aiosmtplib
    from app.services.email_service import _smtp_configured

    if not _smtp_configured():
        return {
            "success": False,
            "error": (
                "SMTP not configured. "
                "Set SMTP_USER, SMTP_PASSWORD, and NOTIFICATION_EMAIL in backend/.env"
            ),
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "SkyRequest — SMTP test"
    msg["From"]    = f"SkyRequest <{settings.effective_from_email}>"
    msg["To"]      = settings.notification_email
    msg.attach(MIMEText(
        "<h2>&#9989; SMTP test successful!</h2>"
        "<p>Your SkyRequest email configuration is working correctly.</p>",
        "html",
    ))

    try:
        await asyncio.wait_for(
            aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.effective_smtp_user,
                password=settings.smtp_password,
                start_tls=True,
            ),
            timeout=15.0,
        )
        logger.info("Test email sent to %s", settings.notification_email)
        return {
            "success": True,
            "message": f"Test email sent to {settings.notification_email}",
            "smtp_host": settings.smtp_host,
            "smtp_port": settings.smtp_port,
            "smtp_user": settings.effective_smtp_user,
        }
    except asyncio.TimeoutError:
        return {"success": False, "error": "SMTP connection timed out after 15 seconds"}
    except Exception as exc:
        logger.error("Test email failed: %s", exc)
        return {"success": False, "error": str(exc)}


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Service health check")
async def health_check():
    return {
        "status": "ok",
        "version": "3.0.0",
        "services": {
            "flights":    "operational",
            "bookings":   "operational",
            "auth":       "operational",
            "email":      "configured" if settings.effective_smtp_user else "not configured (mock mode)",
            "flight_api": "live" if settings.flight_api_key else "mock mode",
        },
    }


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info("Starting SkyRequest API v3.0.0")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
