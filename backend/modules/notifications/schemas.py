from core.api_model import ApiModel
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

NotificationType = Literal["liked", "visited", "matched", "unliked", "message"]


class NotificationActor(ApiModel):
    """The user who caused the notification, so the client shows a name without another request."""

    id: int
    username: str
    first_name: str
    last_name: str


class NotificationOut(ApiModel):
    id: int
    type: NotificationType
    actor: NotificationActor
    entity_id: Optional[int] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class UnreadCountOut(ApiModel):
    unread_count: int = Field(..., ge=0)


class NotificationOkResponse(ApiModel):
    ok: bool = True
