from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class OkResponse(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
    ok: bool = True

class LikeStateResponse(BaseModel):
    liked: bool
    connected: bool

class BlockStateResponse(BaseModel):
    blocked: bool

class ReportInput(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)

class RelationshipResponse(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
    liked_by_me: bool
    liked_you: bool
    connected: bool
    blocked_by_me: bool = False
    blocked_you: bool = False
    last_connection: Optional[datetime] = None
    is_online: bool = False

class SocialUserCard(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str

class VisitorOut(SocialUserCard):
    visited_at: datetime

class LikeReceivedOut(SocialUserCard):
    liked_at: datetime

class BlockedUserOut(SocialUserCard):
    blocked_at: datetime
