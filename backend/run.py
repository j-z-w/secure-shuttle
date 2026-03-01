import uvicorn
import os

if __name__ == "__main__":
    reload_enabled = os.getenv("UVICORN_RELOAD", "true").strip().lower() == "true"
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=reload_enabled)
