from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.exceptions import (
    AuthenticationRequiredError,
    EscrowCancelledError,
    EscrowNotFoundError,
    ForbiddenActionError,
    InsufficientFundsError,
    InvalidAddressError,
    InvalidEscrowStateError,
    InviteTokenError,
    SolanaRPCError,
)
from app.routers import escrows, transactions
from app.services import solana_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    _enforce_network_guard()
    yield


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(escrows.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")


# Exception handlers
@app.exception_handler(EscrowNotFoundError)
async def escrow_not_found_handler(request: Request, exc: EscrowNotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.detail})


@app.exception_handler(SolanaRPCError)
async def solana_rpc_error_handler(request: Request, exc: SolanaRPCError):
    return JSONResponse(status_code=502, content={"detail": exc.detail})


@app.exception_handler(InsufficientFundsError)
async def insufficient_funds_handler(request: Request, exc: InsufficientFundsError):
    return JSONResponse(status_code=400, content={"detail": exc.detail})


@app.exception_handler(InvalidAddressError)
async def invalid_address_handler(request: Request, exc: InvalidAddressError):
    return JSONResponse(status_code=422, content={"detail": exc.detail})


@app.exception_handler(EscrowCancelledError)
async def escrow_cancelled_handler(request: Request, exc: EscrowCancelledError):
    return JSONResponse(status_code=409, content={"detail": exc.detail})


@app.exception_handler(AuthenticationRequiredError)
async def auth_required_handler(request: Request, exc: AuthenticationRequiredError):
    return JSONResponse(status_code=401, content={"detail": exc.detail})


@app.exception_handler(ForbiddenActionError)
async def forbidden_action_handler(request: Request, exc: ForbiddenActionError):
    return JSONResponse(status_code=403, content={"detail": exc.detail})


@app.exception_handler(InvalidEscrowStateError)
async def invalid_state_handler(request: Request, exc: InvalidEscrowStateError):
    return JSONResponse(status_code=409, content={"detail": exc.detail})


@app.exception_handler(InviteTokenError)
async def invite_token_handler(request: Request, exc: InviteTokenError):
    return JSONResponse(status_code=400, content={"detail": exc.detail})


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# Health check
@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "solana_rpc": settings.solana_rpc_url,
        "cluster": solana_service.cluster_from_rpc_url(settings.solana_rpc_url),
    }


def _enforce_network_guard() -> None:
    if not settings.solana_network_guard_enabled:
        return

    cluster = solana_service.cluster_from_rpc_url(settings.solana_rpc_url)
    if cluster == "mainnet" and not settings.allow_mainnet:
        raise RuntimeError(
            "Refusing startup with mainnet RPC while allow_mainnet is false."
        )
