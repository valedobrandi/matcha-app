from modules.users.repository import UsersRepository


class UsersService:
    def __init__(
            self,
            repository: UsersRepository
    ):
        self.repository = repository
    