from core.api_model import ApiModel
from typing import Annotated
from pydantic import BaseModel, StringConstraints

class TagOut(ApiModel):
    id: int
    name: str

class TagInput(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]