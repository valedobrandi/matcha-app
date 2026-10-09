from fastapi import APIRouter, status, Depends, Request
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
    LogoutResponse,
    RegisterResponse,
    ResendVerificationInput,
    ResendVerificationResponse,
)
from modules.auth.exceptions import InvalidCredentialsException
from modules.auth.service import AuthService
from modules.auth.repository import AuthRepository
from core.database import get_db_connection
from core.auth import SessionClaims, get_current_session, get_current_user_id
from core.rate_limit import Limit, RateLimiter, get_rate_limiter

auth_router = APIRouter(prefix="/auth", tags=["auth"])

LOGIN_PER_CLIENT = Limit(attempts=20, per_seconds=60)
LOGIN_FAILURES_PER_ACCOUNT = Limit(attempts=10, per_seconds=15 * 60)
REGISTER_PER_CLIENT = Limit(attempts=10, per_seconds=15 * 60)
RECOVERY_PER_CLIENT = Limit(attempts=10, per_seconds=15 * 60)
RECOVERY_PER_EMAIL = Limit(attempts=3, per_seconds=15 * 60)


def get_auth_service(
    db: asyncpg.Connection = Depends(get_db_connection),
) -> AuthService:
    repository = AuthRepository(db)
    return AuthService(repository)


def limit_per_client(action: str, limit: Limit):
    def limited_client(
        request: Request,
        limiter: RateLimiter = Depends(get_rate_limiter),
    ) -> RateLimiter:
        client = request.client.host if request.client else "unknown"
        limiter.hit(f"{action}:client:{client}", limit)
        return limiter
    return limited_client


@auth_router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    response_model=ResendVerificationResponse,
)
async def resend_verification(
    payload: ResendVerificationInput,
    limiter: RateLimiter = Depends(limit_per_client("recovery", RECOVERY_PER_CLIENT)),
    service: AuthService = Depends(get_auth_service),
) -> ResendVerificationResponse:
    limiter.hit(f"recovery:email:{payload.email.lower()}", RECOVERY_PER_EMAIL)
    await service.resend_verification_email(payload.email)
    return {
        "message": "If an unverified account exists for this email, a verification message will be sent."
    }


@auth_router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=RegisterResponse,
    dependencies=[Depends(limit_per_client("register", REGISTER_PER_CLIENT))],
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
    payload: LoginInput,
    limiter: RateLimiter = Depends(limit_per_client("login", LOGIN_PER_CLIENT)),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    account = f"login:account:{payload.username.lower()}"
    limiter.check(account, LOGIN_FAILURES_PER_ACCOUNT)
    try:
        token = await service.login_user(payload)
    except InvalidCredentialsException:
        limiter.record(account)
        raise
    return {"access_token": token, "token_type": "bearer"}


@auth_router.post("/logout", response_model=LogoutResponse)
async def logout(
    session: SessionClaims = Depends(get_current_session),
    service: AuthService = Depends(get_auth_service),
) -> LogoutResponse:
    await service.logout(session.session_id, session.user_id)
    return {"message": "Signed out."}


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
    limiter: RateLimiter = Depends(limit_per_client("recovery", RECOVERY_PER_CLIENT)),
    service: AuthService = Depends(get_auth_service),
) -> ForgotPasswordResponse:
    limiter.hit(f"recovery:email:{payload.email.lower()}", RECOVERY_PER_EMAIL)
    await service.request_password_reset(payload.email)
    return {"message": "If an account exists for this email, a password reset link will be sent."}


@auth_router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    dependencies=[Depends(limit_per_client("recovery", RECOVERY_PER_CLIENT))],
)
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
