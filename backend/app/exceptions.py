class EscrowNotFoundError(Exception):
    def __init__(self, escrow_id: int | str):
        self.escrow_id = escrow_id
        self.detail = f"Escrow {escrow_id} not found"


class SolanaRPCError(Exception):
    def __init__(self, message: str):
        self.detail = f"Solana RPC error: {message}"


class InsufficientFundsError(Exception):
    def __init__(self, public_key: str, balance_lamports: int, required_lamports: int):
        self.detail = (
            f"Insufficient funds in {public_key}: "
            f"has {balance_lamports} lamports, needs {required_lamports}"
        )


class InvalidAddressError(Exception):
    def __init__(self, address: str):
        self.detail = f"Invalid Solana address: {address}"


class EscrowCancelledError(Exception):
    def __init__(self, escrow_id: int):
        self.detail = f"Escrow {escrow_id} is already cancelled"


class AuthenticationRequiredError(Exception):
    def __init__(self):
        self.detail = "Authentication required"


class ForbiddenActionError(Exception):
    def __init__(self, message: str):
        self.detail = message


class InvalidEscrowStateError(Exception):
    def __init__(self, message: str):
        self.detail = message


class InviteTokenError(Exception):
    def __init__(self, message: str):
        self.detail = message
