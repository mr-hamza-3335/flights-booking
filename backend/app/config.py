from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Flight API ─────────────────────────────────────────
    flight_api_key: str = ""
    flight_api_host: str = "sky-scrapper.p.rapidapi.com"

    # ── SMTP ───────────────────────────────────────────────
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_user: str = ""
    smtp_password: str = ""
    notification_email: str = ""
    from_email: str = "noreply@flightportal.com"
    email_from: str = ""

    # ── RESEND EMAIL API ───────────────────────────────────
    resend_api_key: str = ""

    # ── Auth / JWT ─────────────────────────────────────────
    jwt_secret_key: str = "change-me-to-a-long-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    # ── Database ───────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./skyrequest.db"

    # ── App ─────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"
    admin_email: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def effective_smtp_user(self) -> str:
        return self.smtp_user or self.smtp_username

    @property
    def effective_from_email(self) -> str:
        return self.email_from or self.from_email


settings = Settings()
