from fastapi import APIRouter, Depends
import asyncpg
from core.database import get_db_connection
from core.auth import get_current_user_id
from modules.tags.service import TagsService
from modules.tags.repository import TagsRepository
from modules.tags.schemas import TagOut
from typing import List


tags_router = APIRouter(prefix="/tags", tags=["tags"])

def get_tags_service(
        db: asyncpg.Connection = Depends(get_db_connection)        
) -> TagsService:
    repository = TagsRepository(db)
    return TagsService(repository)

@tags_router.get("/", response_model=List[TagOut])
async def get_search_tags(
    search: str,
    current_userid: int = Depends(get_current_user_id),
    service: TagsService = Depends(get_tags_service)
) -> List[TagOut]:
    return await service.get_search_tags(search)