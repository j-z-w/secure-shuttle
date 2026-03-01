from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    clerk_issuer: str | None = None
    clerk_audience: str | None = None
    convex_internal_api_key: str | None = None
    escrow_secret_key_encryption_key: str | None = None
    solana_rpc_url: str = "https://api.devnet.solana.com"
    solana_network_guard_enabled: bool = True
    allow_mainnet: bool = False
    escrow_funding_min_lamports: int = 1
    funding_signature_scan_limit: int = 10
    funding_signature_rescan_cooldown_seconds: float = 4.0
    solana_balance_cache_ttl_seconds: float = 2.0
    solana_tx_status_cache_ttl_seconds: float = 2.0
    solana_signatures_cache_ttl_seconds: float = 3.0
    escrow_join_ttl_minutes: int = 7 * 24 * 60
    escrow_invite_ttl_minutes: int = 24 * 60
    app_title: str = "Secure Shuttle Escrow API"
    app_version: str = "0.1.0"
    debug: bool = False
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=[_BACKEND_DIR / ".env", _BACKEND_DIR / ".env.local"],
        extra="ignore",
    )


settings = Settings()
