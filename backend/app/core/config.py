from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = Field(min_length=32)
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TIMEZONE: str = "UTC"
    
    # Business settings
    DEFAULT_HOLD_PERIOD_HOURS: int = 48
    QC_HOLD_PERIOD_HOURS: int = 24
    
    class Config:
        env_file = ".env"


settings = Settings()
