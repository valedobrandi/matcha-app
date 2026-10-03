from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator, field_validator
from datetime import datetime
from typing import List, Literal, Optional
from modules.auth.schemas import validate_password_strength
from modules.tags.schemas import TagOut

class UserProfile(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
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
    fame_rating: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None
    location_consent: bool = False
    last_connection: Optional[datetime] = None
    likes_received_count: int = 0
    visitors_count: int = 0

class UserProfileInput(BaseModel):
    gender: Literal["male", "female", "other"]
    sexual_preference: Literal["man", "woman", "bisexual"]
    age: int = Field(..., ge=18, le=100)
    bio: str = Field(..., min_length=1)

class UserLocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_label: Optional[str] = None
    location_consent: bool

class UserAccountInput(BaseModel):
    username: str = Field(..., min_length=1)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    
class PhotoOut(BaseModel):
    id: int
    url: str
    is_profile_photo: bool

class EditProfileInput(UserProfileInput):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_label: Optional[str] = None
    location_consent: bool

    @model_validator(mode="after")
    def check_location_complete(self) -> "EditProfileInput":
        has_coords = self.latitude is not None and self.longitude is not None
        has_text = bool(self.location_label is not None and self.location_label.strip())
        if not (has_coords and has_text):
            raise ValueError("latitude, longitude and location_label must all be provided together")
        return self

class PasswordChangeInput(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordChangeInput":
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password must match")
        return self


# ADR-0001: public projection — never include email/password/tokens/coords/consent
class PublicProfile(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
    id: int
    username: str
    first_name: str
    last_name: str
    gender: Optional[Literal["male", "female", "other"]] = None
    sexual_preference: Optional[Literal["man", "woman", "bisexual"]] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    fame_rating: int = 0
    location_label: Optional[str] = None
    last_connection: Optional[datetime] = None
    is_online: bool = False
    tags: List[TagOut] = Field(default_factory=list)
    photos: List[PhotoOut] = Field(default_factory=list)
    likes_received_count: int = 0
    visitors_count: int = 0