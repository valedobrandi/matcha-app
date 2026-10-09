"""In-process WebSocket connection hub (ADR-0003).

Auth for ``/ws``: the first frame carries the JWT (ADR-0021), checked with the same secret
and algorithm as HTTP Bearer auth in ``core.auth``. Anonymous sockets are rejected.
Every open socket of a user is kept, one per tab, and each push goes to all of them.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Collection, Dict, NamedTuple, Optional

from fastapi import WebSocket, WebSocketDisconnect
import jwt

from core.config import settings

logger = logging.getLogger(__name__)

SESSION_ENDED_CLOSE_CODE = 1008
MAX_SOCKETS_PER_USER = 10


class SocketIdentity(NamedTuple):
    user_id: int
    session_id: uuid.UUID
    expires_at: float


def decode_socket_identity(token: str) -> Optional[SocketIdentity]:
    """Return the user and expiry of a JWT, or None if missing/invalid/expired."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "exp", "sid"]},
        )
        return SocketIdentity(
            user_id=int(payload["sub"]),
            session_id=uuid.UUID(payload["sid"]),
            expires_at=float(payload["exp"]),
        )
    except (jwt.PyJWTError, ValueError, TypeError, AttributeError):
        return None


class ConnectionHub:
    def __init__(self) -> None:
        self._connections: Dict[int, Dict[WebSocket, uuid.UUID]] = {}

    def connect(self, user_id: int, websocket: WebSocket, session_id: uuid.UUID) -> bool:
        sockets = self._connections.setdefault(user_id, {})
        if len(sockets) >= MAX_SOCKETS_PER_USER:
            return False
        sockets[websocket] = session_id
        return True

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if sockets is None:
            return
        sockets.pop(websocket, None)
        if not sockets:
            del self._connections[user_id]

    async def end_sessions(self, user_id: int, session_ids: Collection[uuid.UUID]) -> None:
        for websocket, session_id in tuple(self._connections.get(user_id, {}).items()):
            if session_id not in session_ids:
                continue
            self.disconnect(user_id, websocket)
            try:
                await websocket.close(code=SESSION_ENDED_CLOSE_CODE)
            except Exception:
                logger.debug("Socket of user %s was already closed", user_id)

    async def push(self, user_id: int, envelope: dict[str, Any]) -> None:
        # Serialized once, outside the per-socket try: an envelope that is not JSON is logged and
        # dropped instead of unregistering every tab. Same arguments as Starlette's send_json.
        try:
            text = json.dumps(envelope, separators=(",", ":"), ensure_ascii=False)
        except (TypeError, ValueError):
            logger.exception("Dropped an envelope that is not JSON for user %s", user_id)
            return
        for websocket in tuple(self._connections.get(user_id, ())):
            # A tab that closed while an earlier send in this loop awaited has left the hub.
            if websocket not in self._connections.get(user_id, ()):
                continue
            try:
                await websocket.send_text(text)
            except WebSocketDisconnect:
                logger.debug("Dropped closed socket of user %s", user_id)
                self.disconnect(user_id, websocket)
            except Exception:
                logger.exception("Failed WS push to user %s", user_id)
                self.disconnect(user_id, websocket)


hub = ConnectionHub()
