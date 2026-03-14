"""
routers/auth.py
───────────────
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.db_models import User
from app.services.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def names_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthUser(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def names_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def signup(
    request: Request,
    body: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = (
        "admin"
        if settings.admin_email and body.email.lower() == settings.admin_email.lower()
        else "user"
    )

    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info("New user registered: %s (role=%s)", user.email, role)
    token = create_access_token(user.id, user.email, user.role)

    return TokenResponse(
        access_token=token,
        user=AuthUser(
            id=user.id, email=user.email,
            first_name=user.first_name, last_name=user.last_name,
            phone=user.phone, role=user.role,
        ),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    logger.info("User logged in: %s", user.email)
    token = create_access_token(user.id, user.email, user.role)

    return TokenResponse(
        access_token=token,
        user=AuthUser(
            id=user.id, email=user.email,
            first_name=user.first_name, last_name=user.last_name,
            phone=user.phone, role=user.role,
        ),
    )


@router.get("/me", response_model=AuthUser)
async def get_me(current_user: User = Depends(get_current_user)) -> AuthUser:
    return AuthUser(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        role=current_user.role,
    )


@router.put("/profile", response_model=AuthUser)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthUser:
    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name
    if body.phone is not None:
        current_user.phone = body.phone

    await db.commit()
    await db.refresh(current_user)

    return AuthUser(
        id=current_user.id, email=current_user.email,
        first_name=current_user.first_name, last_name=current_user.last_name,
        phone=current_user.phone, role=current_user.role,
    )
