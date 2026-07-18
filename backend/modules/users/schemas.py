from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal, Optional

class UserProfile(BaseModel):
    id: int
    email: EmailStr
    username: str 
    first_name: str 
    last_name: str 
    is_verified: bool
    created_at: datetime
    gender: Optional[Literal["male", "female", "other"]] = None
    sexual_preference: Optional[Literal["man", "woman", "bisexual"]] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    is_profile_completed: bool = False

class UserProfileInput(BaseModel):
    gender: Literal["male", "female", "other"]
    sexual_preference: Literal["man", "woman", "bisexual"]
    age: int = Field(..., ge=18, le=100)
    bio: str = Field(..., min_length=1)
    
class PhotoOut(BaseModel):
    id: int
    url: str
    is_profile_photo: bool
