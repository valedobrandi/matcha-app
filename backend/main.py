from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.auth.handlers import register_auth_exception_handlers
from modules.users.handlers import register_users_exception_handlers
from modules.tags.handlers import register_tags_exception_handlers
from core.database import db_lifespan
from modules.auth.controller import auth_router
from modules.users.controller import users_router
from modules.tags.controller import tags_router

app = FastAPI(title="Matcha API", version="1.0", lifespan=db_lifespan)
register_auth_exception_handlers(app)
register_users_exception_handlers(app)
register_tags_exception_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.64.4:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tags_router)

@app.get("/health", tags=["System"])
async def execute_health_check():
    return {"status": "operational"}