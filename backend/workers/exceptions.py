class WorkerException(Exception):
    """Base exception for all worker errors."""
    pass

class OutboxPayloadError(WorkerException):
    def __init__(self, message: str):
        super().__init__(message)