from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from core.ws_hub import hub, decode_user_id_from_token

realtime_router = APIRouter(tags=["realtime"])

PING = '{"type":"ping","payload":null}'
PONG = '{"type":"pong","payload":null}'


@realtime_router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
) -> None:
    user_id = decode_user_id_from_token(token or "")
    if user_id is None:
        await websocket.accept()
        await websocket.close(code=1008)
        return
    await hub.connect(user_id, websocket)
    try:
        while True:
            if await websocket.receive_text() == PING:
                await websocket.send_text(PONG)
    except WebSocketDisconnect:
        hub.disconnect(user_id, websocket)
    except Exception:
        hub.disconnect(user_id, websocket)
        raise
