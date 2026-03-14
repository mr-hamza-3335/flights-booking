from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Flight API ────────────────────────────────────────────────────────────
    flight_api_key: str = ""
    flight_api_host: str = "sky-scrapper.p.rapidapi.com"

    # ── SMTP ──────────────────────────────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""       # Legacy: SMTP_USERNAME
    smtp_user: str = ""           # New: SMTP_USER (takes priority if set)
    smtp_password: str = ""
    notification_email: str = ""
    from_email: str = "noreply@flightportal.com"   # Legacy: FROM_EMAIL
    email_from: str = ""                            # New: EMAIL_FROM (takes priority if set)

    # ── Auth / JWT ────────────────────────────────────────────────────────────
    jwt_secret_key: str = "change-me-to-a-long-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # ── Database ──────────────────────────────────────────────────────────────
    # Development default: SQLite.  Production: set DATABASE_URL to
    # postgresql+asyncpg://user:password@host/dbname
    database_url: str = "sqlite+aiosqlite:///./skyrequest.db"

    # ── App ───────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"
    # Set ADMIN_EMAIL to auto-promote that address to admin on first signup
    admin_email: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def effective_smtp_user(self) -> str:
        """SMTP_USER takes priority; falls back to SMTP_USERNAME."""
        return self.smtp_user or self.smtp_username

    @property
    def effective_from_email(self) -> str:
        """EMAIL_FROM takes priority; falls back to FROM_EMAIL."""
        return self.email_from or self.from_email


settings = Settings()
