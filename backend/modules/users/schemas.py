from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Literal

class UserProfile(BaseModel):
    id: int
    email: EmailStr
    username: str 
    first_name: str 
    last_name: str 
    is_verified: bool
    created_at: datetime

class UserProfileInput(BaseModel):
    gender: Literal["male", "female", "other"]
    sexual_preference: Literal["man", "woman", "bisexual"]
    age: int
    bio: str

class UserProfileComplete(UserProfile, UserProfileInput):
    pass