import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app  # noqa: E402

sys.stdout.write(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
