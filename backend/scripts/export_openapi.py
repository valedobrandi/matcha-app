import json
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Importing the app loads Settings, which requires a secret. Nothing is signed here, so a
# random one is enough.
os.environ.setdefault("JWT_SECRET", secrets.token_urlsafe(48))

from main import app  # noqa: E402

sys.stdout.write(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
