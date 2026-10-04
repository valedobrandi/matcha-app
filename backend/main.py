from fastapi import FastAPI
from pydantic.json_schema import models_json_schema
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from modules.auth.handlers import register_auth_exception_handlers
from modules.users.handlers import register_users_exception_handlers
from modules.tags.handlers import register_tags_exception_handlers
from modules.social.handlers import register_social_exception_handlers
from modules.discovery.handlers import register_discovery_exception_handlers
from modules.notifications.handlers import register_notifications_exception_handlers
from modules.chat.handlers import register_chat_exception_handlers
from core.database import db_lifespan
from core.error_codes import ErrorResponse
from modules.auth.controller import auth_router
from modules.users.controller import users_router
from modules.tags.controller import tags_router
from modules.social.controller import social_router
from modules.discovery.controller import discovery_router
from modules.notifications.controller import notifications_router
from modules.chat.controller import chat_router
from modules.realtime.controller import realtime_router
from modules.users.repository import UPLOAD_DIR
import os

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
allow_origins = [origin.strip() for origin in origins.split(',') if origin.strip()]

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app = FastAPI(title="Matcha API", version="1.0", lifespan=db_lifespan)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


def openapi_with_error_contract() -> dict:
    schema = FastAPI.openapi(app)
    _, definitions = models_json_schema(
        [(ErrorResponse, "serialization")],
        ref_template="#/components/schemas/{model}",
    )
    schema["components"]["schemas"].update(definitions["$defs"])
    return schema


app.openapi = openapi_with_error_contract
register_auth_exception_handlers(app)
register_users_exception_handlers(app)
register_tags_exception_handlers(app)
register_social_exception_handlers(app)
register_discovery_exception_handlers(app)
register_notifications_exception_handlers(app)
register_chat_exception_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tags_router)
app.include_router(social_router)
app.include_router(discovery_router)
app.include_router(notifications_router)
app.include_router(chat_router)
app.include_router(realtime_router)

@app.get("/health", tags=["System"])
async def execute_health_check():
    return {"status": "operational"}
