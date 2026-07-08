from dotenv import load_dotenv
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/matcha"
    JWT_SECRET: SecretStr = SecretStr("super_secret_key")
    JWT_ALGORITHM: str = "HS256"
    
    FT_CLIENT_ID: str = "ft_client_id"
    FT_CLIENT_SECRET: str = "ft_client_secret"
    FT_REDIRECT_URI: str = "http://localhost:5173/auth/callback/42"

    MAILTRAP_API_KEY: SecretStr = SecretStr("")
    MAILTRAP_FROM_EMAIL: str = "noreply@matcha.com"
    MAILTRAP_FROM_NAME: str = "Matcha"
    VERIFICATION_URL_BASE: str = "http://localhost:5173/auth/verify"

    PASSWORD_RESET_URL_BASE: str = "http://localhost:5173/auth/reset-password"
    
    #MAIL OUTBOX
    OUTBOX_POLL_INTERVAL_SECONDS: float = 5.0
    OUTBOX_BATCH_SIZE: int = 10
    OUTBOX_MAX_ATTEMPTS: int = 5

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()