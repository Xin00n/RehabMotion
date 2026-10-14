from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RehabMotion API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    jwt_secret_key: str = "local-development-secret-change-this-before-deploy-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite:///./rehabmotion.db"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_production_secret(self):
        if self.app_env.lower() == "production":
            if self.jwt_secret_key.startswith("local-development-secret") or "replace-this" in self.jwt_secret_key.lower() or len(self.jwt_secret_key) < 32:
                raise ValueError("JWT_SECRET_KEY harus berupa secret acak minimal 32 karakter di environment production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
