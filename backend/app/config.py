from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://crm:crm@localhost:5432/crm"
    cors_origins: list[str] = ["http://localhost:3000"]
    n8n_waiting_contact_webhook_url: str = "http://n8n:5678/webhook/crm-contacto-espera"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
