from fastapi import APIRouter, status, Depends
import asyncpg
from modules.auth.schemas import (
    CurrentUserResponse,
    ForgotPasswordInput,
    ForgotPasswordResponse,
    ResetPasswordInput,
    ResetPasswordResponse,
    UserRegisterInput,
    TokenResponse,
    LoginInput,
    RegisterResponse,
    ResendVerificationInput,
    ResendVerificationResponse,
)
from modules.auth.service import AuthService
from modules.auth.repository import AuthRepository
from core.database import get_db_connection
from core.auth import get_current_user_id

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(
    db: asyncpg.Connection = Depends(get_db_connection),
) -> AuthService:
    repository = AuthRepository(db)
    return AuthService(repository)


@auth_router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    response_model=ResendVerificationResponse,
)
async def resend_verification(
    payload: ResendVerificationInput,
    service: AuthService = Depends(get_auth_service),
) -> ResendVerificationResponse:
    await service.resend_verification_email(payload.email)
    return {
        "message": "If an unverified account exists for this email, a verification message will be sent."
    }


@auth_router.post(
    "/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse
)
async def register(
    payload: UserRegisterInput, service: AuthService = Depends(get_auth_service)
) -> RegisterResponse:
    await service.register_user(payload)
    return {
        "message": "Registration successful. Please check your email to verify your account."
    }


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginInput, service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    token = await service.login_user(payload)
    return {"access_token": token, "token_type": "bearer"}


@auth_router.post("/callback/42", response_model=TokenResponse)
async def fortytwo_oauth_callback(
    code: str, service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    token = await service.handle_fortytwo_callback(code)
    return {"access_token": token, "token_type": "bearer"}


@auth_router.get("/verify/{token}", response_model=TokenResponse)
async def verify_email(
    token: str,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:

    access_token = await service.verify_user_email_and_issue_token(token)

    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    response_model=ForgotPasswordResponse,
)
async def forgot_password(
    payload: ForgotPasswordInput,
    service: AuthService = Depends(get_auth_service),
) -> ForgotPasswordResponse:
    await service.request_password_reset(payload.email)
    return {"message": "If an account exists for this email, a password reset link will be sent."}


@auth_router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    payload: ResetPasswordInput,
    service: AuthService = Depends(get_auth_service),
) -> ResetPasswordResponse:
    access_token = await service.reset_password(payload.token, payload.password)
    return {
        "message": "Password updated.",
        "access_token": access_token,
        "token_type": "bearer",
    }


@auth_router.get("/me", response_model=CurrentUserResponse)
async def get_me(
    user_id: int = Depends(get_current_user_id),
    service: AuthService = Depends(get_auth_service),
) -> CurrentUserResponse:
    return await service.get_current_user(user_id)
