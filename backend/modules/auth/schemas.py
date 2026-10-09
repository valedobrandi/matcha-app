from core.api_model import ApiModel
from typing import Annotated, Optional
from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints, field_validator
from zxcvbn import zxcvbn
import re

class UserRecord(BaseModel):
    id: int
    email: EmailStr
    username: str 
    first_name: str 
    last_name: str 
    password_hash: Optional[str] = None
    fortytwo_id: Optional[int] = None
    is_verified: bool = False

BCRYPT_MAX_BYTES = 72


def fits_bcrypt(v: str) -> str:
    if len(v.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes long")
    return v


PasswordInput = Annotated[str, AfterValidator(fits_bcrypt)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
EmailInput = Annotated[EmailStr, Field(max_length=100)]


def validate_password_strength(v: str) -> str:
    fits_bcrypt(v)

    if len(v) < 8:
        raise ValueError('Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'[a-z]', v):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'[0-9]', v):
        raise ValueError('Password must contain at least one number')

    result = zxcvbn(v)
    for match in result["sequence"]:
        if match.get("pattern") == "dictionary":
            raise ValueError("Password must not contain common English words")
    
    return v

class UserRegisterInput(BaseModel):
    email: EmailInput
    username: PersonName
    first_name: PersonName
    last_name: PersonName
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

class ResetPasswordInput(BaseModel):
    token: str
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

class ForgotPasswordInput(BaseModel):
    email: EmailInput

class ForgotPasswordResponse(ApiModel):
    message: str

class ResetPasswordResponse(ApiModel):
    message: str
    access_token: str
    token_type: str = 'bearer'

class LoginInput(BaseModel):
    username: str
    password: PasswordInput

class TokenResponse(ApiModel):
    access_token: str
    token_type: str = 'bearer'

class RegisterResponse(ApiModel):
    message: str

class ResendVerificationInput(BaseModel):
    email: EmailInput

class ResendVerificationResponse(ApiModel):
    message: str

class LogoutResponse(ApiModel):
    message: str

class CurrentUserResponse(ApiModel):
    id: int
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    email_verified: bool
    profile_completed: bool
    has_password: bool
