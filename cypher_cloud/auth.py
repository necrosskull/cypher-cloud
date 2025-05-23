import time
from typing import Optional

import pyotp
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from jose import jwt
from jose.exceptions import JWTError
from passlib.hash import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from cypher_cloud.config import settings
from cypher_cloud.database import get_db
from cypher_cloud.models import User
from cypher_cloud.schemas import (
    ChangePasswordRequest,
    ConfirmEmailRequest,
    Disable2FARequest,
    LoginRequest,
    PasswordResetRequest,
    RegisterRequest,
    ResetPasswordRequest,
    Setup2FAResponse,
    TokenResponse,
    UserResponse,
    Verify2FARequest,
)

router = APIRouter()

# Настройка SMTP для FastMail
mail_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)
fm = FastMail(mail_conf)

# JWT-настройки
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_SECONDS = settings.ACCESS_TOKEN_EXPIRE_SECONDS
ISSUER_NAME = settings.ISSUER_NAME


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def get_user_by_id(session: AsyncSession, user_id: int) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalars().first()


async def get_current_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Выбираем токен из куки или заголовка
    token = access_token
    if token is None and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[len("Bearer ") :]
        else:
            raise HTTPException(status_code=401, detail="Invalid token format")

    if token is None:
        raise HTTPException(status_code=401, detail="No token provided")

    # Декодируем JWT
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = int(payload.get("sub"))
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not active or not found")
    return user


@router.post("/register")
async def register_user(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Проверяем уникальность email
    if await get_user_by_email(db, req.email):
        raise HTTPException(
            status_code=400, detail="User with this email already exists."
        )

    # Создаём пользователя
    hashed = bcrypt.hash(req.password)
    new_user = User(email=req.email, hashed_password=hashed)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Генерируем токен подтверждения email
    now = int(time.time())
    token = jwt.encode(
        {
            "sub": new_user.email,
            "exp": now + settings.EMAIL_CONFIRM_EXPIRE_SECONDS,
            "type": "email_confirm",
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    confirm_url = f"{settings.NEXT_PUBLIC_BASE_URL.rstrip('/api/v1')}/auth/confirm-email?token={token}"
    message = MessageSchema(
        subject="Подтвердите ваш email",
        recipients=[req.email],
        body=f"Перейдите по ссылке, чтобы подтвердить регистрацию:\n\n{confirm_url}",
        subtype=MessageType.plain,
    )
    await fm.send_message(message)

    return {
        "status": "ok",
        "message": "Registered. Please check your email to confirm.",
    }


@router.post("/confirm-email")
async def confirm_email(
    req: ConfirmEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(req.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "email_confirm":
            raise JWTError()
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    email = payload.get("sub")
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email_confirmed:
        return {"status": "ok", "message": "Email already confirmed"}

    user.email_confirmed = True
    db.add(user)
    await db.commit()
    return {"status": "ok", "message": "Email confirmed"}


@router.post("/login")
async def login_user(
    req: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, req.email)
    if not user or not bcrypt.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.email_confirmed:
        raise HTTPException(status_code=403, detail="Email not confirmed")

    # Если 2FA включена — проверяем код
    if user.totp_secret:
        if not req.code:
            raise HTTPException(status_code=401, detail="2FA code required")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(req.code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    # Генерируем JWT
    now = int(time.time())
    payload = {
        "sub": str(user.id),
        "exp": now + ACCESS_TOKEN_EXPIRE_SECONDS,
        "iss": ISSUER_NAME,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # Сохраняем в куки
    response.set_cookie(key="access_token", value=token, httponly=True)
    return {"status": "ok"}


@router.post("/setup-2fa", response_model=Setup2FAResponse)
async def setup_2fa(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.add(user)
    await db.commit()
    await db.refresh(user)

    otpauth_url = pyotp.TOTP(secret).provisioning_uri(
        user.email, issuer_name=ISSUER_NAME
    )
    return Setup2FAResponse(otpauth_url=otpauth_url)


@router.post("/verify-2fa")
async def verify_2fa(
    req: Verify2FARequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA не включен")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=403, detail="Неверный 2FA код")

    return {"status": "ok"}


@router.post("/request-password-reset")
async def request_password_reset(
    req: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_email(db, req.email)
    if user:
        now = int(time.time())
        token = jwt.encode(
            {
                "sub": user.email,
                "exp": now + settings.PASSWORD_RESET_EXPIRE_SECONDS,
                "type": "password_reset",
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        reset_url = f"{settings.NEXT_PUBLIC_BASE_URL.rstrip('/api/v1')}/reset-password?token={token}"
        message = MessageSchema(
            subject="Сброс пароля",
            recipients=[user.email],
            body=f"Чтобы сбросить пароль, перейдите по ссылке:\n\n{reset_url}",
            subtype="plain",
        )
        await fm.send_message(message)

    # Независимо от результата скрываем факт существования email
    return {"status": "ok", "message": "If this email is registered, check your inbox"}


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(req.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            raise JWTError()
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    email = payload.get("sub")
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = bcrypt.hash(req.new_password)
    db.add(user)
    await db.commit()
    return {"status": "ok", "message": "Password has been reset"}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not bcrypt.verify(req.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid current password")

    user.hashed_password = bcrypt.hash(req.new_password)
    db.add(user)
    await db.commit()
    return {"status": "ok", "message": "Password changed successfully"}


@router.post("/disable-2fa")
async def disable_2fa(
    req: Disable2FARequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA не включен")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=403, detail="Неверный 2FA код")

    user.totp_secret = None
    db.add(user)
    await db.commit()
    return {"status": "ok", "message": "2FA has been disabled"}


@router.get("/get-me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
):
    return UserResponse.from_orm(user)


@router.post("/logout")
async def logout(
    response: Response,
):
    response.delete_cookie(key="access_token")
    return {"status": "ok"}
