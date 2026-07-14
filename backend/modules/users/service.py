from modules.users.repository import UsersRepository
from modules.users.schemas import (
    UserProfile,
    UserProfileComplete
)
from modules.users.exceptions import UserNotFoundException

class UsersService:
    def __init__(
            self,
            repository: UsersRepository
    ):
        self.repository = repository
    
    async def get_profile(
            self,
            current_user_id: int
            ) -> UserProfile:
        current_user = await self.repository.get_user_by_id(current_user_id)

        if not current_user:
            raise UserNotFoundException()
        
        return current_user
    
    async def patch_profile(
            self,
            current_user_id,
            payload
            ) -> UserProfileComplete:
        user_profile = await self.repository.patch_user_profile(current_user_id, payload)
        if not user_profile:
            raise UserNotFoundException()
        return user_profile