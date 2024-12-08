from typing import List, Optional

from pydantic import BaseModel, EmailStr


# Auth
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    code: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Setup2FAResponse(BaseModel):
    otpauth_url: str


class Verify2FARequest(BaseModel):
    code: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    class Config:
        orm_mode = True


# Files
class FileItem(BaseModel):
    id: int
    filename: str

    class Config:
        orm_mode = True
