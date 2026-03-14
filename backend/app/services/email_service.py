import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

import aiosmtplib

from app.config import settings

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(
        settings.effective_smtp_user
        and settings.smtp_password
        and settings.notification_email
    )


def _cabin_label(cabin: str) -> str:
    return {
        "economy":         "Economy",
        "premium_economy": "Premium Economy",
        "business":        "Business Class",
        "first":           "First Class",
    }.get(cabin, cabin.title())


# ── OTP email ─────────────────────────────────────────────────────────────────

def _otp_email_html(first_name: str, otp_code: str, expiry_minutes: int) -> str:
    digits = list(otp_code)
    digit_cells = "".join(
        f"<td style='width:52px;height:64px;background:#f8fafc;border:2px solid #e2e8f0;"
        f"border-radius:12px;text-align:center;vertical-align:middle;"
        f"font-size:32px;font-weight:800;color:#1e3a8a;font-family:monospace;"
        f"letter-spacing:0;'>{d}</td><td style='width:8px;'></td>"
        for d in digits
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Verify Your Booking</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.10);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1e3a8a,#0ea5e9);padding:36px 40px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">&#9992; SkyRequest</h1>
        <p style="margin:8px 0 0;color:#bae6fd;font-size:15px;">Booking Verification</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:44px 40px 36px;">
        <h2 style="margin:0 0 10px;color:#1e3a8a;font-size:22px;font-weight:700;">Verify your email</h2>
        <p style="margin:0 0 32px;color:#4b5563;font-size:15px;line-height:1.65;">
          Hi {first_name}, use the code below to confirm your flight booking request.
          This code expires in <strong>{expiry_minutes} minutes</strong>.
        </p>

        <!-- OTP digits -->
        <div style="text-align:center;margin-bottom:32px;">
          <p style="margin:0 0 16px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your verification code</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>{digit_cells}</tr>
          </table>
        </div>

        <!-- Warning -->
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
            &#9888; Do not share this code with anyone. SkyRequest will never ask for it by phone.
          </p>
        </div>

        <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;line-height:1.5;">
          Didn&apos;t request this? You can safely ignore this email.
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; {datetime.now().year} SkyRequest. All rights reserved.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>"""


# ── HTML email builders ───────────────────────────────────────────────────────

def _build_passenger_rows(passenger_names: List[str]) -> str:
    rows = "".join(
        f"<tr><td style='padding:6px 16px;color:#6b7280;font-size:13px;'>{i + 1}.</td>"
        f"<td style='padding:6px 16px;font-size:13px;font-weight:600;'>{name}</td></tr>"
        for i, name in enumerate(passenger_names)
    )
    return rows


def _user_confirmation_html(
    first_name: str,
    last_name: str,
    reference_id: str,
    flight_number: str,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str],
    airline: str,
    price: float,
    currency: str,
    cabin_class: str,
    num_passengers: int,
    passenger_names: List[str],
) -> str:
    return_row = (
        f"<tr><td style='padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;'>Return Date</td>"
        f"<td style='padding:8px 16px;font-size:14px;font-weight:600;'>{return_date}</td></tr>"
        if return_date else ""
    )
    pax_rows = _build_passenger_rows(passenger_names)

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Flight Request Confirmed</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1e3a8a,#0ea5e9);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">&#9992; SkyRequest</h1>
        <p style="margin:8px 0 0;color:#bae6fd;font-size:14px;">Flight Request Confirmation</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:40px;">
        <h2 style="margin:0 0 8px;color:#1e3a8a;font-size:22px;">Request Confirmed!</h2>
        <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
          Hi {first_name}, your flight request has been received. Our team will review it and contact you within 24 hours.
        </p>

        <!-- Reference ID -->
        <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:16px 24px;margin-bottom:28px;text-align:center;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Reference Number</p>
          <p style="margin:0;color:#1e3a8a;font-size:26px;font-weight:700;letter-spacing:3px;font-family:monospace;">{reference_id}</p>
        </div>

        <!-- Flight Details -->
        <h3 style="margin:0 0 12px;color:#374151;font-size:15px;font-weight:700;">&#9992; Flight Details</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Airline</td>
              <td style="padding:8px 16px;font-size:14px;font-weight:600;">{airline}</td></tr>
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Flight Number</td>
              <td style="padding:8px 16px;font-size:14px;font-weight:600;font-family:monospace;">{flight_number}</td></tr>
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Route</td>
              <td style="padding:8px 16px;font-size:14px;font-weight:600;">{origin} &rarr; {destination}</td></tr>
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Departure</td>
              <td style="padding:8px 16px;font-size:14px;font-weight:600;">{departure_date}</td></tr>
          {return_row}
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Cabin Class</td>
              <td style="padding:8px 16px;font-size:14px;">{_cabin_label(cabin_class)}</td></tr>
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Passengers</td>
              <td style="padding:8px 16px;font-size:14px;">{num_passengers}</td></tr>
          <tr><td style="padding:8px 16px;background:#f9fafb;color:#6b7280;font-size:14px;">Estimated Price</td>
              <td style="padding:8px 16px;font-size:16px;font-weight:700;color:#0ea5e9;">{currency} {price:,.2f}</td></tr>
        </table>

        <!-- Passenger Names -->
        <h3 style="margin:0 0 12px;color:#374151;font-size:15px;font-weight:700;">&#128100; Passengers</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
          {pax_rows}
        </table>

        <!-- Next Steps -->
        <h3 style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:700;">What Happens Next?</h3>
        <table width="100%">
          <tr><td style="padding:8px 0;">
            <table><tr>
              <td style="width:36px;height:36px;background:#dcfce7;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">&#10003;</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;">Confirmation email sent to your inbox</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <table><tr>
              <td style="width:36px;height:36px;background:#dbeafe;border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;color:#1e3a8a;">2</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;">Our team reviews your request within 24 hours</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:8px 0;">
            <table><tr>
              <td style="width:36px;height:36px;background:#fef3c7;border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;color:#92400e;">3</td>
              <td style="padding-left:12px;color:#374151;font-size:14px;">We contact you with booking details and payment options</td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; {datetime.now().year} SkyRequest. All rights reserved.</p>
        <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">This is an automated message. Please do not reply directly.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>"""


def _agency_notification_html(
    reference_id: str,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    flight_number: str,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str],
    airline: str,
    price: float,
    currency: str,
    cabin_class: str,
    num_passengers: int,
    passenger_names: List[str],
    special_requests: Optional[str],
    terms_accepted: bool,
    data_consent: bool,
    submitted_at: datetime,
) -> str:
    return_row = (
        f"<tr><td style='padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;'>Return Date</td>"
        f"<td style='padding:7px 16px;font-size:13px;'>{return_date}</td></tr>"
        if return_date else ""
    )
    sr_row = (
        f"<tr><td style='padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;'>Special Requests</td>"
        f"<td style='padding:7px 16px;font-size:13px;color:#dc2626;'>{special_requests}</td></tr>"
        if special_requests else ""
    )
    pax_rows = _build_passenger_rows(passenger_names)

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Booking Request</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

      <!-- Header -->
      <tr><td style="background:#1e3a8a;padding:24px 32px;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">&#9992; New Booking Request</h1>
        <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Submitted: {submitted_at.strftime('%Y-%m-%d %H:%M UTC')}</p>
      </td></tr>

      <tr><td style="padding:32px;">

        <!-- Reference -->
        <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin-bottom:24px;">
          <p style="margin:0 0 2px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Reference</p>
          <p style="margin:0;color:#1e40af;font-weight:700;font-size:20px;font-family:monospace;">{reference_id}</p>
        </div>

        <!-- Customer Information -->
        <h3 style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Customer Information</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;width:140px;">Name</td>
              <td style="padding:7px 16px;font-size:13px;font-weight:600;">{first_name} {last_name}</td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Email</td>
              <td style="padding:7px 16px;font-size:13px;"><a href="mailto:{email}" style="color:#2563eb;">{email}</a></td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Phone</td>
              <td style="padding:7px 16px;font-size:13px;"><a href="tel:{phone}" style="color:#2563eb;">{phone}</a></td></tr>
        </table>

        <!-- Flight Details -->
        <h3 style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Flight Details</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;width:140px;">Airline</td>
              <td style="padding:7px 16px;font-size:13px;font-weight:600;">{airline}</td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Flight No.</td>
              <td style="padding:7px 16px;font-size:13px;font-weight:700;font-family:monospace;">{flight_number}</td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Route</td>
              <td style="padding:7px 16px;font-size:13px;font-weight:600;">{origin} &rarr; {destination}</td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Departure</td>
              <td style="padding:7px 16px;font-size:13px;">{departure_date}</td></tr>
          {return_row}
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Cabin</td>
              <td style="padding:7px 16px;font-size:13px;">{_cabin_label(cabin_class)}</td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Price (est.)</td>
              <td style="padding:7px 16px;font-size:14px;font-weight:700;color:#0ea5e9;">{currency} {price:,.2f}</td></tr>
          {sr_row}
        </table>

        <!-- Passenger Details -->
        <h3 style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Passengers ({num_passengers})</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
          {pax_rows}
        </table>

        <!-- Consent -->
        <h3 style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Consent</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px;">
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Terms &amp; Conditions</td>
              <td style="padding:7px 16px;font-size:13px;color:{'#059669' if terms_accepted else '#dc2626'};font-weight:600;">{'Accepted' if terms_accepted else 'Not Accepted'}</td></tr>
          <tr><td style="padding:7px 16px;background:#f9fafb;color:#6b7280;font-size:13px;">Data Processing</td>
              <td style="padding:7px 16px;font-size:13px;color:{'#059669' if data_consent else '#dc2626'};font-weight:600;">{'Consented' if data_consent else 'Not Consented'}</td></tr>
        </table>

      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">SkyRequest Agency Notification &mdash; {submitted_at.year}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>"""


# ── Public functions ──────────────────────────────────────────────────────────

async def send_confirmation_email(
    to_email: str,
    first_name: str,
    last_name: str,
    reference_id: str,
    flight_number: str,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str],
    airline: str,
    price: float,
    currency: str,
    cabin_class: str,
    num_passengers: int,
    passenger_names: List[str],
) -> bool:
    if not _smtp_configured():
        logger.info("SMTP not configured — skipping user confirmation email")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Flight Request Confirmed — {reference_id}"
        msg["From"]    = f"SkyRequest <{settings.effective_from_email}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(_user_confirmation_html(
            first_name=first_name, last_name=last_name,
            reference_id=reference_id, flight_number=flight_number,
            origin=origin, destination=destination,
            departure_date=departure_date, return_date=return_date,
            airline=airline, price=price, currency=currency,
            cabin_class=cabin_class, num_passengers=num_passengers,
            passenger_names=passenger_names,
        ), "html"))
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.effective_smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("Confirmation email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send confirmation email to %s: %s", to_email, e)
        return False


async def send_agency_notification(
    reference_id: str,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    flight_number: str,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str],
    airline: str,
    price: float,
    currency: str,
    cabin_class: str,
    num_passengers: int,
    passenger_names: List[str],
    special_requests: Optional[str],
    terms_accepted: bool,
    data_consent: bool,
    submitted_at: datetime,
) -> bool:
    if not _smtp_configured():
        logger.info("SMTP not configured — skipping agency notification")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"New Booking Request — {reference_id}"
        msg["From"]    = f"SkyRequest <{settings.effective_from_email}>"
        msg["To"]      = settings.notification_email
        msg.attach(MIMEText(_agency_notification_html(
            reference_id=reference_id,
            first_name=first_name, last_name=last_name,
            email=email, phone=phone,
            flight_number=flight_number,
            origin=origin, destination=destination,
            departure_date=departure_date, return_date=return_date,
            airline=airline, price=price, currency=currency,
            cabin_class=cabin_class, num_passengers=num_passengers,
            passenger_names=passenger_names,
            special_requests=special_requests,
            terms_accepted=terms_accepted, data_consent=data_consent,
            submitted_at=submitted_at,
        ), "html"))
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.effective_smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("Agency notification sent for %s", reference_id)
        return True
    except Exception as e:
        logger.error("Failed to send agency notification for %s: %s", reference_id, e)
        return False


async def send_status_update_email(
    to_email: str,
    first_name: str,
    reference_id: str,
    new_status: str,
    admin_message: str = "",
) -> bool:
    """Send a booking status update email from admin to customer."""
    if not _smtp_configured():
        logger.info("SMTP not configured — skipping status update email")
        return False

    status_colors = {
        "contacted":  ("#0ea5e9", "We have reviewed your request and will be in touch shortly."),
        "confirmed":  ("#059669", "Great news! Your booking has been confirmed."),
        "cancelled":  ("#dc2626", "Your booking request has been cancelled."),
        "new":        ("#1e3a8a", "Your booking request has been received."),
    }
    color, default_msg = status_colors.get(new_status, ("#6b7280", "Your booking status has been updated."))
    body_text = admin_message.strip() if admin_message.strip() else default_msg
    status_label = new_status.capitalize()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Booking Update</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <tr><td style="background:linear-gradient(135deg,#1e3a8a,#0ea5e9);padding:28px 40px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">&#9992; SkyRequest</h1>
        <p style="margin:8px 0 0;color:#bae6fd;font-size:14px;">Booking Update</p>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <h2 style="margin:0 0 8px;color:#1e3a8a;font-size:20px;">Hi {first_name},</h2>
        <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">{body_text}</p>
        <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:16px 24px;margin-bottom:24px;text-align:center;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Reference Number</p>
          <p style="margin:0 0 8px;color:#1e3a8a;font-size:24px;font-weight:700;font-family:monospace;">{reference_id}</p>
          <span style="display:inline-block;background:{color};color:#fff;font-size:13px;font-weight:700;padding:4px 16px;border-radius:99px;">{status_label}</span>
        </div>
        <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
          Questions? Reply to this email or contact our support team.
        </p>
      </td></tr>
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; {datetime.now().year} SkyRequest. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Booking Update — {reference_id}"
        msg["From"]    = f"SkyRequest <{settings.effective_from_email}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.effective_smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("Status update email sent to %s for %s", to_email, reference_id)
        return True
    except Exception as e:
        logger.error("Failed to send status update email: %s", e)
        return False


async def send_otp_email(
    to_email: str,
    first_name: str,
    otp_code: str,
    expiry_minutes: int = 5,
) -> bool:
    """Send a 6-digit OTP verification email to the customer."""
    if not _smtp_configured():
        logger.info("SMTP not configured — skipping OTP email (code: %s)", otp_code)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your SkyRequest verification code: {otp_code}"
        msg["From"]    = f"SkyRequest <{settings.effective_from_email}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(_otp_email_html(first_name, otp_code, expiry_minutes), "html"))
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.effective_smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("OTP email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", to_email, e)
        return False


async def send_alert_email(
    to_email: str,
    first_name: str,
    origin: str,
    destination: str,
    target_price: float,
    current_price: float,
    currency: str = "USD",
) -> bool:
    """Send a price-drop alert email to the user."""
    if not _smtp_configured():
        logger.info("SMTP not configured — skipping alert email")
        return False
    try:
        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Price Alert</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <tr><td style="background:linear-gradient(135deg,#1e3a8a,#0ea5e9);padding:28px 40px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">&#9992; SkyRequest</h1>
        <p style="margin:8px 0 0;color:#bae6fd;font-size:14px;">Price Alert Triggered</p>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <h2 style="margin:0 0 8px;color:#1e3a8a;font-size:20px;">Good news, {first_name}!</h2>
        <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
          A flight matching your alert has dropped to your target price.
        </p>
        <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
          <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Route</p>
          <p style="margin:0 0 16px;color:#1e3a8a;font-size:22px;font-weight:700;">{origin} &rarr; {destination}</p>
          <table width="100%"><tr>
            <td style="text-align:center;padding:0 12px;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;">Your Target</p>
              <p style="margin:0;color:#374151;font-size:18px;font-weight:600;">{currency} {target_price:,.0f}</p>
            </td>
            <td style="text-align:center;padding:0 12px;border-left:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;">Current Price</p>
              <p style="margin:0;color:#059669;font-size:24px;font-weight:700;">{currency} {current_price:,.0f}</p>
            </td>
          </tr></table>
        </div>
        <p style="margin:0;color:#6b7280;font-size:13px;text-align:center;">
          Log in to SkyRequest to view available flights and book now.
        </p>
      </td></tr>
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
        <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; {datetime.now().year} SkyRequest. You are receiving this because you set up a price alert.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Price Alert: {origin} → {destination} now {currency} {current_price:,.0f}"
        msg["From"]    = f"SkyRequest <{settings.effective_from_email}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.effective_smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("Alert email sent to %s for route %s→%s", to_email, origin, destination)
        return True
    except Exception as e:
        logger.error("Failed to send alert email to %s: %s", to_email, e)
        return False
