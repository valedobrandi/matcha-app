from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict


class ApiModel(BaseModel):
    """Base for response models: defaulted fields are required in the OpenAPI output schema."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)


def _in_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


UtcDatetime = Annotated[datetime, AfterValidator(_in_utc)]
