from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Literal, Optional
from fastapi import UploadFile

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
    age: int
    bio: str
    
class PhotoOut(BaseModel):
    id: int
    url: str
    is_profile_photo: bool