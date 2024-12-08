from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str

    site_url: str
    NEXT_PUBLIC_BASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ISSUER_NAME: str
    ACCESS_TOKEN_EXPIRE_SECONDS: int

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    print("Loading settings")
    print(Settings())
    return Settings()  # type: ignore


settings: Settings = get_settings()


@lru_cache
def get_db_url(engine: str | None = "asyncpg") -> str:
    return f"postgresql+{engine}://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
