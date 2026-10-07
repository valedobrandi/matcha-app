from core.api_model import ApiModel, UtcDatetime
from pydantic import BaseModel, Field


class SendMessageInput(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class ReadConversationInput(BaseModel):
    up_to_message_id: int = Field(..., ge=1)


class MessageOut(ApiModel):
    id: int
    from_user_id: int
    to_user_id: int
    body: str
    created_at: UtcDatetime


class ChatOkResponse(ApiModel):
    ok: bool = True
