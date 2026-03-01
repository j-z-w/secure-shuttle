from functools import lru_cache
from threading import Lock
import time
from typing import Any

import jwt
from fastapi import Header
from jwt import PyJWKClient

from app.config import settings
from app.exceptions import AuthenticationRequiredError

_TOKEN_CACHE_MAX_SIZE = 512
_TOKEN_CACHE_MAX_TTL_SECONDS = 60
_TOKEN_CACHE_EXP_SKEW_SECONDS = 15
_token_claims_cache: dict[str, tuple[dict[str, Any], float]] = {}
_token_claims_cache_lock = Lock()


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise AuthenticationRequiredError()

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthenticationRequiredError()

    token = parts[1].strip()
    if not token:
        raise AuthenticationRequiredError()
    return token


@lru_cache(maxsize=8)
def _jwks_client_for_issuer(issuer: str) -> PyJWKClient:
    return PyJWKClient(f"{issuer.rstrip('/')}/.well-known/jwks.json")


def _configured_issuer() -> str:
    issuer = (settings.clerk_issuer or "").strip().rstrip("/")
    if not issuer or not issuer.startswith("https://"):
        raise AuthenticationRequiredError()
    return issuer


def _get_cached_claims(token: str) -> dict[str, Any] | None:
    now = time.time()
    with _token_claims_cache_lock:
        cached = _token_claims_cache.get(token)
        if not cached:
            return None
        claims, cache_expiry = cached
        token_exp = claims.get("exp")
        token_exp_ts = float(token_exp) if isinstance(token_exp, (int, float)) else 0.0
        if now >= cache_expiry or (token_exp_ts and now >= token_exp_ts):
            _token_claims_cache.pop(token, None)
            return None
        return claims


def _cache_claims(token: str, claims: dict[str, Any]) -> None:
    token_exp = claims.get("exp")
    if not isinstance(token_exp, (int, float)):
        return

    now = time.time()
    ttl = min(
        max(0.0, float(token_exp) - now - _TOKEN_CACHE_EXP_SKEW_SECONDS),
        float(_TOKEN_CACHE_MAX_TTL_SECONDS),
    )
    if ttl <= 0:
        return

    with _token_claims_cache_lock:
        if len(_token_claims_cache) >= _TOKEN_CACHE_MAX_SIZE:
            # Simple FIFO-like eviction from insertion order.
            oldest_key = next(iter(_token_claims_cache), None)
            if oldest_key:
                _token_claims_cache.pop(oldest_key, None)
        _token_claims_cache[token] = (claims, now + ttl)


def _verified_claims(token: str) -> dict[str, Any]:
    cached_claims = _get_cached_claims(token)
    if cached_claims:
        return cached_claims

    try:
        issuer = _configured_issuer()
        signing_key = _jwks_client_for_issuer(issuer).get_signing_key_from_jwt(token)
        audience = (settings.clerk_audience or "").strip() or None

        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "issuer": issuer,
            "options": {
                "verify_aud": bool(audience),
            },
        }
        if audience:
            decode_kwargs["audience"] = audience

        claims = jwt.decode(token, signing_key.key, **decode_kwargs)
    except Exception as exc:
        raise AuthenticationRequiredError() from exc

    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise AuthenticationRequiredError()
    _cache_claims(token, claims)
    return claims


def _extract_role(claims: dict[str, Any]) -> str:
    direct_role = claims.get("role")
    if isinstance(direct_role, str) and direct_role.strip():
        return direct_role.strip().lower()

    metadata = claims.get("metadata")
    if isinstance(metadata, dict):
        role = metadata.get("role")
        if isinstance(role, str) and role.strip():
            return role.strip().lower()

    public_metadata = claims.get("public_metadata")
    if isinstance(public_metadata, dict):
        role = public_metadata.get("role")
        if isinstance(role, str) and role.strip():
            return role.strip().lower()

    org_role = claims.get("org_role")
    if isinstance(org_role, str) and "admin" in org_role.lower():
        return "admin"

    return ""


def get_actor_user_id(authorization: str | None = Header(default=None)) -> str:
    token = _extract_bearer_token(authorization)
    claims = _verified_claims(token)
    return str(claims["sub"]).strip()


def get_actor_is_admin(authorization: str | None = Header(default=None)) -> bool:
    token = _extract_bearer_token(authorization)
    claims = _verified_claims(token)
    return _extract_role(claims) == "admin"
