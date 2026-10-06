"""In-process WebSocket connection hub (ADR-0003).

Auth for ``/ws``: JWT via query param ``?token=<jwt>`` using the same secret and
algorithm as HTTP Bearer auth in ``core.auth``. Anonymous sockets are rejected.
Every open socket of a user is kept, one per tab, and each push goes to all of them.

Security note: query-string JWTs can appear in access logs and Referer headers.
Acceptable for local eval; prefer a first-message auth handshake before production.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect
import jwt

from core.config import settings

logger = logging.getLogger(__name__)


def decode_user_id_from_token(token: str) -> Optional[int]:
    """Return user id from a JWT, or None if missing/invalid/expired."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return int(sub)
    except (ValueError, TypeError):
        return None


class ConnectionHub:
    def __init__(self) -> None:
        self._connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if sockets is None:
            return
        sockets.discard(websocket)
        if not sockets:
            del self._connections[user_id]

    async def push(self, user_id: int, envelope: dict[str, Any]) -> None:
        for websocket in tuple(self._connections.get(user_id, ())):
            try:
                await websocket.send_json(envelope)
            except WebSocketDisconnect:
                logger.debug("Dropped closed socket of user %s", user_id)
                self.disconnect(user_id, websocket)
            except Exception:
                logger.exception("Failed WS push to user %s", user_id)
                self.disconnect(user_id, websocket)


hub = ConnectionHub()
