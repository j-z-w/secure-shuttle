import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env.local")

convex_url = os.getenv("CONVEX_URL") or os.getenv("NEXT_PUBLIC_CONVEX_URL")
if not convex_url:
    raise RuntimeError("Set CONVEX_URL or NEXT_PUBLIC_CONVEX_URL in backend/.env.local")

response = httpx.post(
    f"{convex_url.rstrip('/')}/api/query",
    json={
        "path": "convex_escrows:list",
        "args": {"status_filter": None, "limit": 5, "offset": 0, "mine_only": False},
    },
    timeout=20.0,
)
response.raise_for_status()
print(response.json())
