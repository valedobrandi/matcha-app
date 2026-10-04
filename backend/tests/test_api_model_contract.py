import typing

from fastapi.routing import APIRoute
from pydantic import BaseModel

from core.api_model import ApiModel
from main import app


def _models_in(annotation: object) -> set[type[BaseModel]]:
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return {annotation}
    models: set[type[BaseModel]] = set()
    for arg in typing.get_args(annotation):
        models |= _models_in(arg)
    return models


def _response_models() -> set[type[BaseModel]]:
    models: set[type[BaseModel]] = set()
    for route in app.routes:
        if isinstance(route, APIRoute) and route.response_model is not None:
            models |= _models_in(route.response_model)
    return models


def test_should_find_nested_models_when_annotation_is_optional_list():
    class Inner(BaseModel):
        pass

    assert _models_in(typing.Optional[list[Inner]]) == {Inner}


def test_should_inherit_api_model_when_used_as_route_response_model():
    models = _response_models()
    assert models
    assert [m.__name__ for m in models if not issubclass(m, ApiModel)] == []
