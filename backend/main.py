from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.auth.handlers import register_auth_exception_handlers
from modules.users.handlers import register_users_exception_handlers
from modules.tags.handlers import register_tags_exception_handlers
from modules.social.handlers import register_social_exception_handlers
from modules.discovery.handlers import register_discovery_exception_handlers
from modules.notifications.handlers import register_notifications_exception_handlers
from modules.chat.handlers import register_chat_exception_handlers
from core.database import db_lifespan
from core.error_codes import ErrorResponse, ValidationErrorResponse
from core.log_redaction import RedactCredentialsFilter
from core.rate_limit import register_rate_limit_exception_handler
from modules.auth.controller import auth_router
from modules.users.controller import uploads_router, users_router
from modules.tags.controller import tags_router
from modules.social.controller import social_router
from modules.discovery.controller import discovery_router
from modules.notifications.controller import notifications_router
from modules.chat.controller import chat_router
from modules.realtime.controller import realtime_router
from modules.users.repository import UPLOAD_DIR
import logging
import os

for uvicorn_logger in ("uvicorn.access", "uvicorn.error"):
    logging.getLogger(uvicorn_logger).addFilter(RedactCredentialsFilter())

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
allow_origins = [origin.strip() for origin in origins.split(',') if origin.strip()]

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app = FastAPI(
    title="Matcha API",
    version="1.0",
    lifespan=db_lifespan,
    responses={
        "default": {"model": ErrorResponse, "description": "Error"},
        422: {"model": ValidationErrorResponse, "description": "Validation Error"},
    },
)

register_auth_exception_handlers(app)
register_users_exception_handlers(app)
register_tags_exception_handlers(app)
register_social_exception_handlers(app)
register_discovery_exception_handlers(app)
register_notifications_exception_handlers(app)
register_chat_exception_handlers(app)
register_rate_limit_exception_handler(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(uploads_router)
app.include_router(tags_router)
app.include_router(social_router)
app.include_router(discovery_router)
app.include_router(notifications_router)
app.include_router(chat_router)
app.include_router(realtime_router)

@app.get("/health", tags=["System"])
async def execute_health_check():
    return {"status": "operational"}
