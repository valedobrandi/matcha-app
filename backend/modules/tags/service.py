from modules.tags.repository import TagsRepository
from modules.tags.schemas import TagOut
from typing import List
from better_profanity import profanity
from modules.tags.exceptions import TagContentProfanity

user_bad_words = ["sex", "fuck", "shit", "sex", "piss"]
profanity.load_censor_words(user_bad_words)

class TagsService:
    def __init__(
            self,
            repository: TagsRepository
        ):
        self.repository = repository

    async def get_search_tags(self, search: str) -> List[TagOut]:
        if profanity.contains_profanity(search):
            raise TagContentProfanity()
        return await self.repository.search_tags(search)