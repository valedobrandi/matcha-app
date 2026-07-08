import asyncpg


class UsersRepository:
    def __init__(self, connection: asyncpg.Connection):
        self.connection = connection
    