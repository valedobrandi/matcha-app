import asyncpg
from modules.tags.schemas import TagOut
from typing import List
from typing import Type, TypeVar, Any
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class TagsRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection

    async def _fetch(self, model: Type[T], query: str, *args: Any):
        rows = await self.connection.fetch(query, *args)
        return [model.model_validate(dict(row)) for row in rows]

    async def search_tags(self, search: str) -> List[TagOut]:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = "SELECT id, name FROM tags WHERE name ILIKE $1 ESCAPE '\\' LIMIT 10"
        return await self._fetch(TagOut, query, f"%{escaped}%")

