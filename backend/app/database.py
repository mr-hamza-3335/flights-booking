import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

# ── Engine ────────────────────────────────────────────────────────────────────
# PostgreSQL (production): DATABASE_URL = postgresql+asyncpg://...
# SQLite   (development):  DATABASE_URL = sqlite+aiosqlite:///./skyrequest.db

_db_url = settings.database_url
_is_sqlite = _db_url.startswith("sqlite")

# SQLite needs check_same_thread=False; Postgres needs pool settings
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_async_engine(
    _db_url,
    echo=False,
    connect_args=_connect_args,
    # For Postgres on Render (free tier), keep pool small to avoid exhausting connections
    **({} if _is_sqlite else {"pool_size": 5, "max_overflow": 10}),
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ── SQLite-only forward migrations ────────────────────────────────────────────

async def _migrate_sqlite(conn) -> None:
    """Add new columns to existing SQLite tables without dropping data."""
    result = await conn.execute(text("PRAGMA table_info(bookings)"))
    booking_cols = {row[1] for row in result.fetchall()}

    migrations = [
        ("otp_code",     "ALTER TABLE bookings ADD COLUMN otp_code VARCHAR(6)"),
        ("otp_expiry",   "ALTER TABLE bookings ADD COLUMN otp_expiry DATETIME"),
        ("is_verified",  "ALTER TABLE bookings ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0"),
        ("cancelled_at", "ALTER TABLE bookings ADD COLUMN cancelled_at DATETIME"),
    ]
    for col, sql in migrations:
        if col not in booking_cols:
            await conn.execute(text(sql))
            logger.info("Migration: added column '%s' to bookings", col)


# ── Init ──────────────────────────────────────────────────────────────────────

async def init_db() -> None:
    async with engine.begin() as conn:
        from app.models import db_models  # noqa: F401 — registers models with Base
        await conn.run_sync(Base.metadata.create_all)
        if _is_sqlite:
            await _migrate_sqlite(conn)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
