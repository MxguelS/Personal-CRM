from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://crm:crm@localhost:5432/crm"
    cors_origins: list[str] = ["http://localhost:3000"]
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
