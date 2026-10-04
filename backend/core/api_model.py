from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    """Base for response models: defaulted fields are required in the OpenAPI output schema."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
