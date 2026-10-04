from core.api_model import ApiModel
from pydantic import BaseModel

class TagOut(ApiModel):
    id: int
    name: str

class TagInput(BaseModel):
    name: str