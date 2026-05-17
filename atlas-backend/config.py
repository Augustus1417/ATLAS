from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:5174,"
    "http://127.0.0.1:5174,"
    "http://localhost:3000,"
    "http://127.0.0.1:3000"
)


class Settings(BaseSettings):
    database_url: str = Field(alias="DATABASE_URL")
    openrouter_api_key: str = Field(alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="openai/gpt-oss-20b:free", alias="OPENROUTER_MODEL")
    openrouter_fallback_models: str = Field(
        default="qwen/qwen-2.5-72b-instruct:free",
        alias="OPENROUTER_FALLBACK_MODELS",
    )
    serper_api_key: str = Field(alias="SERPER_API_KEY")
    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=60, alias="JWT_EXPIRE_MINUTES")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    cors_origins: str = Field(default=DEFAULT_CORS_ORIGINS, alias="CORS_ORIGINS")
    public_app_url: str = Field(default="http://localhost:8000", alias="PUBLIC_APP_URL")
    allow_sqlite_fallback: bool = Field(default=False, alias="ALLOW_SQLITE_FALLBACK")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def openrouter_referer(self) -> str:
        return self.public_app_url.rstrip("/")


settings = Settings()
