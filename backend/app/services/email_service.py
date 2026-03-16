import logging
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)


def otp_email_html(name: str, otp: str, expiry_minutes: int = 5) -> str:
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Hello {name}</h2>
            <p>Your OTP code is:</p>
            <h1 style="letter-spacing:4px;">{otp}</h1>
            <p>This code will expire in {expiry_minutes} minutes.</p>
            <br>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
    </html>
    """


async def send_otp_email(
    to_email: str,
    first_name: str,
    otp_code: str,
    expiry_minutes: int = 5,
) -> bool:

    try:
        resend.api_key = settings.resend_api_key

        resend.Emails.send(
            {
                "from": "Flight Deals <onboarding@resend.dev>",
                "to": [to_email],
                "subject": f"Your OTP Code: {otp_code}",
                "html": otp_email_html(first_name, otp_code, expiry_minutes),
            }
        )

        logger.info("OTP email sent successfully to %s", to_email)
        return True

    except Exception as e:
        logger.error("Failed to send OTP email: %s", str(e))
        return False


async def send_test_email(to_email: str):

    try:
        resend.api_key = settings.resend_api_key

        resend.Emails.send(
            {
                "from": "Flight Deals <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "Test Email",
                "html": "<h2>Email system working ✅</h2>",
            }
        )

        return True

    except Exception as e:
        logger.error("Test email failed: %s", str(e))
        return False
