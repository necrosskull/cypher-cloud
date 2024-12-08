import time
from typing import Optional

import pyotp
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response
from jose import jwt
from jose.exceptions import JWTError
from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from cypher_cloud.config import settings
from cypher_cloud.database import get_db
from cypher_cloud.models import User
from cypher_cloud.schemas import (
    LoginRequest,
    RegisterRequest,
    Setup2FAResponse,
    UserResponse,
    Verify2FARequest,
)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_SECONDS = settings.ACCESS_TOKEN_EXPIRE_SECONDS
ISSUER_NAME = settings.ISSUER_NAME

router = APIRouter()


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_id(session: AsyncSession, user_id: int) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


@router.post("/register")
async def register_user(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, req.email)
    if user:
        raise HTTPException(400, "User with this email already exists.")

    hashed = bcrypt.hash(req.password)
    new_user = User(email=req.email, hashed_password=hashed)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"status": "ok", "user_id": new_user.id}


@router.post("/login")
async def login_user(
    req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_email(db, req.email)
    if not user or not bcrypt.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Проверка 2FA, если включена
    if user.totp_secret:
        if req.code is None:
            raise HTTPException(status_code=401, detail="2FA code required")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    now = int(time.time())
    payload = {"sub": str(user.id), "exp": now + ACCESS_TOKEN_EXPIRE_SECONDS}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # Устанавливаем JWT в HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # для HTTPS установить в True
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_SECONDS,
    )

    return {"access_token": token, "token_type": "bearer"}


async def get_current_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    # Сначала токен из кук
    token = access_token

    # Если нет в кук, пробуем заголовок
    if token is None and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[len("Bearer ") :]
        else:
            raise HTTPException(401, "Invalid token format")

    if token is None:
        raise HTTPException(401, "No token provided")

    # Декодируем токен
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid token")

    user_id = int(payload["sub"])
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "User not active or not found")
    return user


@router.post("/setup-2fa", response_model=Setup2FAResponse)
async def setup_2fa(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(name=user.email, issuer_name=ISSUER_NAME)

    user.totp_secret = secret
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return Setup2FAResponse(otpauth_url=otpauth_url)


@router.post("/verify-2fa")
async def verify_2fa(
    req: Verify2FARequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA не настроен")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=403, detail="Неправильный 2FA код")

    return {"status": "ok"}


@router.get("/get-me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    # Возвращаем данные текущего пользователя
    return UserResponse(id=user.id, email=user.email, is_active=user.is_active)
