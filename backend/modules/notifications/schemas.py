from core.api_model import ApiModel
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

NotificationType = Literal["liked", "visited", "matched", "unliked", "message"]


class NotificationOut(ApiModel):
    id: int
    type: NotificationType
    actor_id: int
    entity_id: Optional[int] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class UnreadCountOut(ApiModel):
    unread_count: int = Field(..., ge=0)


class NotificationOkResponse(ApiModel):
    ok: bool = True
