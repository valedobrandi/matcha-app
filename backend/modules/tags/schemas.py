from pydantic import BaseModel

class TagOut(BaseModel):
    id: int
    name: str

class TagInput(BaseModel):
    name: str