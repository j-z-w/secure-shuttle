# Secure Shuttle

Secure Shuttle is a Solana escrow app for arranging payments between two people. Create an escrow, invite the other party, track funding and service completion, then release or settle funds. The app includes dispute messaging, transaction status, and participant ratings.

## Stack

- **Frontend:** Next.js, React, Clerk authentication
- **Backend:** FastAPI, Solana Python SDK
- **Data and supporting services:** Convex

## Run locally

Requirements: Node.js, Python 3.10+, and accounts/configuration for Clerk, Convex, and a Solana RPC endpoint.

Configure the environment before starting the services:

- `frontend/.env.local`: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`) and the Clerk environment variables required by Clerk's Next.js SDK.
- `backend/.env` or `backend/.env.local`: see `backend/app/config.py` for supported settings. At minimum, configure `CLERK_ISSUER`, `CONVEX_INTERNAL_API_KEY`, and `ESCROW_SECRET_KEY_ENCRYPTION_KEY` for authenticated, persistent use. `SOLANA_RPC_URL` defaults to Solana devnet; mainnet startup is blocked unless `ALLOW_MAINNET=true`.
- Configure the Convex deployment used by the backend and frontend as required by the Convex SDK.

Start the API in one terminal:

```bash
cd backend
python -m venv .venv
# Activate the virtual environment, then:
pip install -r requirements.txt
python run.py
```

Start the web app in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API health endpoint is at `http://localhost:8000/api/v1/health`.

## Development commands

From `frontend/`, run `npm run build` to build or `npm run lint` to lint the web app. The API's interactive OpenAPI docs are available at `http://localhost:8000/docs` while it is running.

## Security note

Use a devnet RPC endpoint for local development. Keep signing and encryption secrets out of source control, and review key management and deployment settings before handling real funds.
