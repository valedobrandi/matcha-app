from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
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

def validate_password_strength(v: str) -> str:

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
    email: EmailStr
    username: str
    first_name: str
    last_name: str
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
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str

class ResetPasswordResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = 'bearer'

class LoginInput(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'

class RegisterResponse(BaseModel):
    message: str

class ResendVerificationInput(BaseModel):
    email: EmailStr

class ResendVerificationResponse(BaseModel):
    message: str

class CurrentUserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    email_verified: bool
    profile_completed: bool
    has_password: bool
