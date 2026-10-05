import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Importing the app loads Settings, which requires a secret. Nothing is signed here.
os.environ.setdefault("JWT_SECRET", "openapi-export-only-0123456789abcdef")

from main import app  # noqa: E402

sys.stdout.write(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
