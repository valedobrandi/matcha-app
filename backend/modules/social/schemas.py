from core.api_model import ApiModel, UtcDatetime
from pydantic import BaseModel, Field
from typing import Optional

class SocialOkResponse(ApiModel):
    ok: bool = True

class LikeStateResponse(ApiModel):
    liked: bool
    connected: bool

class BlockStateResponse(ApiModel):
    blocked: bool

class ReportInput(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)

class RelationshipResponse(ApiModel):
    liked_by_me: bool
    liked_you: bool
    connected: bool
    blocked_by_me: bool = False
    last_connection: Optional[UtcDatetime] = None
    is_online: bool = False

class SocialUserCard(ApiModel):
    id: int
    username: str
    first_name: str
    last_name: str

class VisitorOut(SocialUserCard):
    visited_at: UtcDatetime

class LikeReceivedOut(SocialUserCard):
    liked_at: UtcDatetime

class BlockedUserOut(SocialUserCard):
    blocked_at: UtcDatetime

class ConnectionOut(SocialUserCard):
    connected_at: UtcDatetime
