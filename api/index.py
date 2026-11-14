"""Vercel entry point: runs the Spora FastAPI app (backend/api.py) as a Python serverless function.

vercel.json sends every /api/... request here; FastAPI then routes /api/crops, /api/analyse and /api/health.
"""
import importlib.util
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))                      # so backend modules import each other by name
os.environ.setdefault("FIELDSHIFT_CACHE", "/tmp/spora-cache")   # the only writable folder on Vercel

# Load backend/api.py under its own name: a plain "import api" would clash with this "api" folder.
_spec = importlib.util.spec_from_file_location("spora_backend_api", BACKEND / "api.py")
_module = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = _module                     # FastAPI resolves the request types through this name
_spec.loader.exec_module(_module)

app = _module.app
