"""Validated environment contract."""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")
    supabase_url: str | None = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_secret_key: str | None = Field(default=None, validation_alias="SUPABASE_SECRET_KEY")
    supabase_jwt_audience: str = Field(default="authenticated", validation_alias="SUPABASE_JWT_AUDIENCE")
    cors_origins: list[str] = Field(default_factory=list, validation_alias="CORS_ORIGINS")


settings = Settings()
