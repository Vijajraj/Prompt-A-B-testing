import sys
from pathlib import Path
import importlib.util

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load backend/main.py
_spec = importlib.util.spec_from_file_location("backend_main", BACKEND_DIR / "main.py")
_backend_main = importlib.util.module_from_spec(_spec)
sys.modules["backend_main"] = _backend_main
_spec.loader.exec_module(_backend_main)

app = _backend_main.app

__all__ = ["app"]
