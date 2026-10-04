from fastapi.routing import APIRoute
from pydantic import BaseModel

from core.api_model import ApiModel
from main import app


def _response_models() -> set[type[BaseModel]]:
    models: set[type[BaseModel]] = set()
    for route in app.routes:
        if not isinstance(route, APIRoute) or route.response_model is None:
            continue
        annotation = route.response_model
        args = getattr(annotation, "__args__", (annotation,))
        models.update(a for a in args if isinstance(a, type) and issubclass(a, BaseModel))
    return models


def test_should_inherit_api_model_when_used_as_route_response_model():
    offenders = [m.__name__ for m in _response_models() if not issubclass(m, ApiModel)]
    assert _response_models()
    assert offenders == []
