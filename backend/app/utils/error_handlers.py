"""
Centralised FastAPI exception handlers.

All errors return the standard envelope:
    {"success": false, "message": "<human-readable text>"}

Register them all by calling attach_handlers(app) in main.py.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# ── Status-code → friendly message map ───────────────────────────────────────
_FRIENDLY: dict[int, str] = {
    400: "Invalid request. Please check your input and try again.",
    401: "Incorrect email or password.",
    403: "You are not authorized to perform this action.",
    404: "The requested resource was not found.",
    405: "This action is not allowed.",
    409: "A conflict occurred. The resource may already exist.",
    422: "Some fields are invalid. Please check your input.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Server error. Please try again later.",
    502: "Service unavailable. Please try again later.",
    503: "Service temporarily unavailable. Please try again later.",
}

_ALWAYS_OVERRIDE = {500, 502, 503}   # never expose raw server messages


def _response(message: str, status_code: int = 500) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "message": message},
    )


def _pick_message(status_code: int, raw_detail: object) -> str:
    """
    Choose the best human-readable message.

    • For server errors (5xx) we always use the generic friendly string —
      never expose internal details.
    • For client errors we prefer the router's own detail string when it looks
      user-friendly (non-empty, plain string); otherwise fall back to the
      status-code table.
    """
    if status_code in _ALWAYS_OVERRIDE:
        return _FRIENDLY.get(status_code, "Server error. Please try again later.")

    if isinstance(raw_detail, str) and raw_detail.strip():
        return raw_detail.strip()

    return _FRIENDLY.get(status_code, "Something went wrong. Please try again.")


# ── Handler registration ──────────────────────────────────────────────────────

def attach_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app instance."""

    # ── 422 Validation errors (request body / query params) ───────────────
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        fields = [
            {"field": " → ".join(str(loc) for loc in e["loc"][1:]), "message": e["msg"]}
            for e in exc.errors()
        ]
        logger.warning("Validation error on %s: %s", request.url.path, fields)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Some fields are invalid. Please check your input.",
                "fields": fields,
            },
        )

    # ── HTTP errors (400, 401, 403, 404, 429 …) ───────────────────────────
    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        message = _pick_message(exc.status_code, exc.detail)
        if exc.status_code >= 500:
            logger.error("HTTP %s on %s: %s", exc.status_code, request.url.path, exc.detail)
        else:
            logger.info("HTTP %s on %s: %s", exc.status_code, request.url.path, exc.detail)
        return _response(message, exc.status_code)

    # ── Pydantic model validation (programmatic) ──────────────────────────
    @app.exception_handler(ValidationError)
    async def pydantic_error_handler(request: Request, exc: ValidationError):
        logger.warning("Pydantic error on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": "Some fields are invalid. Please check your input.",
            },
        )

    # ── Catch-all for any unhandled exception ─────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception on %s: %s", request.url.path, exc, exc_info=True
        )
        return _response("Something went wrong. Please try again later.", 500)
