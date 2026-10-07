from datetime import datetime, timezone
from typing import Annotated

from fastapi import Path
from pydantic import AfterValidator, BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    """Base for response models: defaulted fields are required in the OpenAPI output schema."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


def _in_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


UtcDatetime = Annotated[datetime, AfterValidator(_in_utc)]


INT4_MAX = 2_147_483_647

RowId = Annotated[int, Field(ge=1, le=INT4_MAX)]
RowIdPath = Annotated[int, Path(ge=1, le=INT4_MAX)]
