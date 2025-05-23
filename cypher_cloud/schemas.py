# schemas.py

from typing import List, Optional

from pydantic import BaseModel, EmailStr

# --- Auth ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    code: Optional[str] = None


class FileUploadResult(BaseModel):
    status: str
    file_id: int | None = None
    filename: str
    size: int | None = None
    error: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Setup2FAResponse(BaseModel):
    otpauth_url: str


class Verify2FARequest(BaseModel):
    code: str


class ConfirmEmailRequest(BaseModel):
    token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class Disable2FARequest(BaseModel):
    code: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True


# --- Files ---


class FileItem(BaseModel):
    id: int
    filename: str

    class Config:
        from_attributes = True
