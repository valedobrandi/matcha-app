import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.database import db_manager
from core.ws_hub import INVALID_TOKEN_CLOSE_CODE, SocketIdentity, hub, decode_socket_identity
from modules.auth.sessions_repository import SessionsRepository

realtime_router = APIRouter(tags=["realtime"])

PING = '{"type":"ping","payload":null}'
PONG = '{"type":"pong","payload":null}'
READY = '{"type":"ready","payload":null}'
AUTH_TIMEOUT_SECONDS = 5.0
TOO_MANY_SOCKETS_CLOSE_CODE = 1013
AUTH_TIMEOUT_CLOSE_CODE = 4408


def identity_from_auth_frame(text: str) -> SocketIdentity | None:
    try:
        frame = json.loads(text)
    except ValueError:
        return None
    if not isinstance(frame, dict) or frame.get("type") != "auth":
        return None
    payload = frame.get("payload")
    token = payload.get("token") if isinstance(payload, dict) else None
    return decode_socket_identity(token) if isinstance(token, str) else None


async def session_is_active(identity: SocketIdentity) -> bool:
    async with db_manager.pool.acquire() as connection:
        return await SessionsRepository(connection).is_active(identity.session_id, identity.user_id)


@realtime_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        first_frame = await asyncio.wait_for(websocket.receive_text(), AUTH_TIMEOUT_SECONDS)
    except TimeoutError:
        await websocket.close(code=AUTH_TIMEOUT_CLOSE_CODE)
        return
    except WebSocketDisconnect:
        return
    identity = identity_from_auth_frame(first_frame)
    if identity is None:
        await websocket.close(code=INVALID_TOKEN_CLOSE_CODE)
        return
    if not hub.connect(identity.user_id, websocket, identity.session_id):
        await websocket.close(code=TOO_MANY_SOCKETS_CLOSE_CODE)
        return
    try:
        if not await session_is_active(identity):
            await websocket.close(code=INVALID_TOKEN_CLOSE_CODE)
            return
        await websocket.send_text(READY)
        while True:
            frame = await asyncio.wait_for(websocket.receive_text(), identity.expires_at - time.time())
            if frame == PING:
                await websocket.send_text(PONG)
    except TimeoutError:
        await websocket.close(code=INVALID_TOKEN_CLOSE_CODE)
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(identity.user_id, websocket)
