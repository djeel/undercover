"""Application configuration from environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "undercover"
    
    # API settings
    api_prefix: str = "/api"
    debug: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
