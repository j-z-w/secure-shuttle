from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_network_guard_enabled: bool = True
    allow_mainnet: bool = False
    escrow_join_ttl_minutes: int = 7 * 24 * 60
    escrow_invite_ttl_minutes: int = 24 * 60
    app_title: str = "Secure Shuttle Escrow API"
    app_version: str = "0.1.0"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
