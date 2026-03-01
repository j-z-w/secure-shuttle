import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

_ENCRYPTED_PREFIX = "enc::"


def _fernet() -> Fernet:
    configured = (settings.escrow_secret_key_encryption_key or "").strip()
    if not configured:
        raise RuntimeError("Set ESCROW_SECRET_KEY_ENCRYPTION_KEY in backend environment.")

    if configured.startswith("base64:"):
        key_material = configured.split(":", 1)[1].encode("utf-8")
    else:
        key_material = configured.encode("utf-8")

    fernet_key = base64.urlsafe_b64encode(hashlib.sha256(key_material).digest())
    return Fernet(fernet_key)


def encrypt_escrow_secret(plaintext: str) -> str:
    raw = plaintext.strip()
    if not raw:
        raise RuntimeError("Escrow secret key cannot be empty.")
    if raw.startswith(_ENCRYPTED_PREFIX):
        return raw
    token = _fernet().encrypt(raw.encode("utf-8")).decode("utf-8")
    return f"{_ENCRYPTED_PREFIX}{token}"


def decrypt_escrow_secret(value: str) -> str:
    raw = value.strip()
    if not raw:
        raise RuntimeError("Escrow secret key is missing.")
    if not raw.startswith(_ENCRYPTED_PREFIX):
        # Backward-compatible support for legacy plaintext rows.
        return raw

    token = raw[len(_ENCRYPTED_PREFIX) :]
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("Escrow signing key decryption failed.") from exc
