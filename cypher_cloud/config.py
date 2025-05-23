from functools import lru_cache

from pydantic import EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # База данных
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str

    # URLs и JWT
    site_url: str
    NEXT_PUBLIC_BASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ISSUER_NAME: str
    ACCESS_TOKEN_EXPIRE_SECONDS: int

    # SMTP для отправки почты
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: EmailStr
    MAIL_SERVER: str
    MAIL_PORT: int
    MAIL_STARTTLS: bool = True  # Изменено с MAIL_TLS
    MAIL_SSL_TLS: bool = False  # Изменено с MAIL_SSL

    # Время жизни токенов (в секундах)
    EMAIL_CONFIRM_EXPIRE_SECONDS: int = 3600  # 1 час
    PASSWORD_RESET_EXPIRE_SECONDS: int = 3600  # 1 час

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    print("Loading settings")
    print(Settings())
    return Settings()  # type: ignore


settings: Settings = get_settings()


@lru_cache
def get_db_url(engine: str | None = "asyncpg") -> str:
    return (
        f"postgresql+{engine}://"
        f"{settings.db_user}:{settings.db_password}@"
        f"{settings.db_host}:{settings.db_port}/"
        f"{settings.db_name}"
    )
