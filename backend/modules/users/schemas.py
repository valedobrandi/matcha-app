from core.api_model import ApiModel, UtcDatetime
from pydantic import BaseModel, EmailStr, Field, StringConstraints, model_validator, field_validator
from typing import Annotated, List, Literal, Optional
from modules.auth.schemas import EmailInput, PasswordInput, PersonName, validate_password_strength
from modules.tags.schemas import TagOut

LocationLabel = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


class UserProfile(ApiModel):
    id: int
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    is_verified: bool
    created_at: UtcDatetime
    gender: Optional[Literal["male", "female", "other"]] = None
    sexual_preference: Optional[Literal["man", "woman", "bisexual"]] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    is_profile_completed: bool = False
    fame_rating: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[LocationLabel] = None
    location_consent: bool = False
    last_connection: Optional[UtcDatetime] = None
    likes_received_count: int = 0
    visitors_count: int = 0

class UserProfileInput(BaseModel):
    gender: Literal["male", "female", "other"]
    sexual_preference: Optional[Literal["man", "woman", "bisexual"]] = None
    age: int = Field(..., ge=18, le=100)
    bio: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]

class UserLocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_label: Optional[LocationLabel] = None
    location_consent: bool

class UserAccountInput(BaseModel):
    username: PersonName
    first_name: PersonName
    last_name: PersonName
    email: EmailInput

class PhotoOut(ApiModel):
    id: int
    url: str
    is_profile_photo: bool

class EditProfileInput(UserProfileInput):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    location_label: Optional[LocationLabel] = None
    location_consent: bool

    @model_validator(mode="after")
    def check_location_complete(self) -> "EditProfileInput":
        has_coords = self.latitude is not None and self.longitude is not None
        has_text = bool(self.location_label is not None and self.location_label.strip())
        if not (has_coords and has_text):
            raise ValueError("latitude, longitude and location_label must all be provided together")
        return self

class PasswordChangeInput(BaseModel):
    current_password: PasswordInput
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
class PublicProfile(ApiModel):
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
    last_connection: Optional[UtcDatetime] = None
    is_online: bool = False
    tags: List[TagOut] = Field(default_factory=list)
    photos: List[PhotoOut] = Field(default_factory=list)
    likes_received_count: int = 0
    visitors_count: int = 0
