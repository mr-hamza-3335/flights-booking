"""
Centralised FastAPI exception handlers.

Register them all by calling attach_handlers(app) in main.py.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _error_body(code: int, message: str, detail: object = None) -> dict:
    body: dict = {"error": {"code": code, "message": message}}
    if detail is not None:
        body["error"]["detail"] = detail
    return body


def attach_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app instance."""

    # ── 422 Validation errors ─────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        errors = [
            {"field": " → ".join(str(l) for l in e["loc"][1:]), "message": e["msg"]}
            for e in exc.errors()
        ]
        logger.warning("Validation error on %s: %s", request.url.path, errors)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(422, "Validation failed", errors),
        )

    # ── HTTP errors (404, 400, 429 …) ─────────────────────────────────────
    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code >= 500:
            logger.error("HTTP %s on %s: %s", exc.status_code, request.url.path, exc.detail)
        else:
            logger.info("HTTP %s on %s: %s", exc.status_code, request.url.path, exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.status_code, exc.detail or "An error occurred"),
        )

    # ── Pydantic model validation (programmatic) ──────────────────────────
    @app.exception_handler(ValidationError)
    async def pydantic_error_handler(request: Request, exc: ValidationError):
        logger.warning("Pydantic error on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(422, "Data validation error", exc.errors()),
        )

    # ── Catch-all ──────────────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(500, "An unexpected error occurred. Please try again."),
        )
