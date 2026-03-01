import base58
import time
from threading import Lock
from typing import Optional

from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.signature import Signature
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction

from app.config import settings
from app.exceptions import InvalidAddressError, SolanaRPCError

client = Client(settings.solana_rpc_url)

TRANSFER_FEE_LAMPORTS = 5000  # standard base fee per signature
DEFAULT_COMMITMENT = "confirmed"
DEFAULT_POLL_SECONDS = 1.0
DEFAULT_TIMEOUT_SECONDS = 25.0
DEFAULT_SEND_RETRIES = 1

_COMMITMENT_RANK = {
    "not_found": 0,
    "processed": 1,
    "confirmed": 2,
    "finalized": 3,
}

_balance_cache: dict[str, tuple[int, float]] = {}
_tx_status_cache: dict[str, tuple[dict, float]] = {}
_signatures_cache: dict[tuple[str, int], tuple[list[dict], float]] = {}
_balance_cache_lock = Lock()
_tx_status_cache_lock = Lock()
_signatures_cache_lock = Lock()


def generate_keypair() -> tuple[str, str]:
    """Generate a new Solana keypair. Returns (public_key_b58, secret_key_b58)."""
    kp = Keypair()
    public_key_b58 = str(kp.pubkey())
    secret_key_b58 = base58.b58encode(bytes(kp)).decode()
    return public_key_b58, secret_key_b58


def _restore_keypair(secret_key_b58: str) -> Keypair:
    """Reconstruct a Keypair from a base58-encoded secret."""
    secret_bytes = base58.b58decode(secret_key_b58)
    return Keypair.from_bytes(secret_bytes)


def _parse_pubkey(address: str) -> Pubkey:
    """Parse a base58 address into a Pubkey, raising InvalidAddressError on failure."""
    try:
        return Pubkey.from_string(address)
    except Exception:
        raise InvalidAddressError(address)


def validate_address(address: str) -> bool:
    _parse_pubkey(address)
    return True


def get_balance(public_key_b58: str) -> int:
    """Get balance in lamports for a Solana address."""
    ttl = max(0.0, float(settings.solana_balance_cache_ttl_seconds))
    if ttl > 0:
        now = time.monotonic()
        with _balance_cache_lock:
            cached = _balance_cache.get(public_key_b58)
            if cached and cached[1] > now:
                return cached[0]

    pubkey = _parse_pubkey(public_key_b58)
    try:
        response = client.get_balance(pubkey)
        value = response.value
        if ttl > 0:
            with _balance_cache_lock:
                _balance_cache[public_key_b58] = (value, time.monotonic() + ttl)
        return value
    except Exception as e:
        raise SolanaRPCError(str(e))


def cluster_from_rpc_url(rpc_url: str) -> str:
    lower = rpc_url.lower()
    if "devnet" in lower:
        return "devnet"
    if "testnet" in lower:
        return "testnet"
    if "mainnet" in lower:
        return "mainnet"
    return "unknown"


def _normalize_commitment(value: Optional[str]) -> str:
    if not value:
        return "processed"

    normalized = str(value).lower()
    if "finalized" in normalized:
        return "finalized"
    if "confirmed" in normalized:
        return "confirmed"
    if "processed" in normalized:
        return "processed"
    return "processed"


def commitment_satisfied(current: Optional[str], target: Optional[str]) -> bool:
    current_rank = _COMMITMENT_RANK.get(_normalize_commitment(current), 0)
    target_rank = _COMMITMENT_RANK.get(_normalize_commitment(target), 0)
    return current_rank >= target_rank


def get_transaction_status(signature_b58: str) -> dict:
    """Check status of a transaction signature on-chain."""
    ttl = max(0.0, float(settings.solana_tx_status_cache_ttl_seconds))
    if ttl > 0:
        now = time.monotonic()
        with _tx_status_cache_lock:
            cached = _tx_status_cache.get(signature_b58)
            if cached and cached[1] > now:
                return dict(cached[0])

    try:
        sig = Signature.from_string(signature_b58)
    except Exception:
        raise InvalidAddressError(signature_b58)

    try:
        response = client.get_signature_statuses([sig])
    except Exception as e:
        raise SolanaRPCError(str(e))

    status_info = response.value[0]
    if status_info is None:
        result = {
            "status": "not_found",
            "slot": None,
            "confirmations": None,
            "err": None,
        }
        if ttl > 0:
            with _tx_status_cache_lock:
                _tx_status_cache[signature_b58] = (dict(result), time.monotonic() + ttl)
        return result

    result = {
        "status": _normalize_commitment(status_info.confirmation_status),
        "slot": status_info.slot,
        "confirmations": status_info.confirmations,
        "err": str(status_info.err) if status_info.err else None,
    }
    if ttl > 0:
        with _tx_status_cache_lock:
            _tx_status_cache[signature_b58] = (dict(result), time.monotonic() + ttl)
    return result


def list_recent_signatures_for_address(public_key_b58: str, limit: int = 25) -> list[dict]:
    """List recent transaction signatures seen for an address."""
    ttl = max(0.0, float(settings.solana_signatures_cache_ttl_seconds))
    cache_key = (public_key_b58, int(limit))
    if ttl > 0:
        now = time.monotonic()
        with _signatures_cache_lock:
            cached = _signatures_cache.get(cache_key)
            if cached and cached[1] > now:
                # Return a shallow copy so callers can't mutate the cached list in-place.
                return [dict(item) for item in cached[0]]

    pubkey = _parse_pubkey(public_key_b58)
    try:
        response = client.get_signatures_for_address(pubkey, limit=limit)
    except Exception as e:
        raise SolanaRPCError(str(e))

    items = response.value or []
    signatures: list[dict] = []
    for item in items:
        signatures.append(
            {
                "signature": str(item.signature),
                "status": _normalize_commitment(getattr(item, "confirmation_status", None)),
                "slot": getattr(item, "slot", None),
                "err": str(item.err) if getattr(item, "err", None) else None,
                "memo": getattr(item, "memo", None),
                "block_time": getattr(item, "block_time", None),
            }
        )

    if ttl > 0:
        with _signatures_cache_lock:
            _signatures_cache[cache_key] = ([dict(item) for item in signatures], time.monotonic() + ttl)

    return signatures


def send_transfer_with_confirmation(
    from_secret_key_b58: str,
    to_public_key_b58: str,
    amount_lamports: int,
    *,
    commitment_target: str = DEFAULT_COMMITMENT,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    poll_seconds: float = DEFAULT_POLL_SECONDS,
    max_send_retries: int = DEFAULT_SEND_RETRIES,
) -> dict:
    """Sign, send, and wait for a transfer to reach a target commitment."""
    from_kp = _restore_keypair(from_secret_key_b58)
    to_pubkey = _parse_pubkey(to_public_key_b58)
    normalized_target = _normalize_commitment(commitment_target)

    last_error: Optional[str] = None

    for attempt in range(max_send_retries + 1):
        try:
            transfer_ix = transfer(
                TransferParams(
                    from_pubkey=from_kp.pubkey(),
                    to_pubkey=to_pubkey,
                    lamports=amount_lamports,
                )
            )

            latest = client.get_latest_blockhash().value
            blockhash = latest.blockhash
            last_valid_block_height = latest.last_valid_block_height

            message = Message([transfer_ix], from_kp.pubkey())
            transaction = Transaction([from_kp], message, blockhash)
            response = client.send_transaction(
                transaction,
                opts=TxOpts(
                    skip_preflight=False,
                    preflight_commitment=normalized_target,
                    max_retries=3,
                    last_valid_block_height=last_valid_block_height,
                ),
            )
            signature = str(response.value)
        except (InvalidAddressError, SolanaRPCError):
            raise
        except Exception as e:
            last_error = str(e)
            if attempt >= max_send_retries:
                raise SolanaRPCError(last_error)
            continue

        deadline = time.monotonic() + timeout_seconds
        latest_status: Optional[dict] = None
        while time.monotonic() < deadline:
            latest_status = get_transaction_status(signature)
            if latest_status["err"]:
                raise SolanaRPCError(
                    f"Transaction {signature} failed: {latest_status['err']}"
                )
            if commitment_satisfied(latest_status["status"], normalized_target):
                return {
                    "signature": signature,
                    "status": latest_status["status"],
                    "slot": latest_status["slot"],
                    "confirmations": latest_status["confirmations"],
                    "err": latest_status["err"],
                    "commitment_target": normalized_target,
                    "last_valid_block_height": last_valid_block_height,
                    "rpc_endpoint": settings.solana_rpc_url,
                }

            try:
                current_height = client.get_block_height().value
                if current_height > last_valid_block_height:
                    break
            except Exception:
                # If block-height fetch fails transiently, continue polling by time budget.
                pass

            time.sleep(poll_seconds)

        if latest_status and latest_status.get("err"):
            raise SolanaRPCError(
                f"Transaction {signature} failed: {latest_status['err']}"
            )
        last_error = (
            f"Transaction {signature} did not reach {normalized_target} before "
            "timeout or blockhash expiry"
        )
        if attempt >= max_send_retries:
            raise SolanaRPCError(last_error)

    raise SolanaRPCError(last_error or "Unknown transfer confirmation error")


def send_transfer(
    from_secret_key_b58: str,
    to_public_key_b58: str,
    amount_lamports: int,
) -> str:
    """Compatibility wrapper that returns only the confirmed signature."""
    result = send_transfer_with_confirmation(
        from_secret_key_b58,
        to_public_key_b58,
        amount_lamports,
    )
    return result["signature"]
