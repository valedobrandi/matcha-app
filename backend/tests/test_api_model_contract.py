import typing
from datetime import datetime, timedelta, timezone

from fastapi.routing import APIRoute
from pydantic import BaseModel, TypeAdapter

from core.api_model import ApiModel, UtcDatetime
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


def _reachable_models(models: set[type[BaseModel]]) -> set[type[BaseModel]]:
    found: set[type[BaseModel]] = set()
    pending = list(models)
    while pending:
        model = pending.pop()
        if model in found:
            continue
        found.add(model)
        for field in model.model_fields.values():
            pending.extend(_models_in(field.annotation))
    return found


def _mentions_datetime(annotation: object) -> bool:
    return annotation is datetime or any(_mentions_datetime(arg) for arg in typing.get_args(annotation))


def test_should_send_every_response_timestamp_in_utc_with_its_offset():
    naive_utc = datetime(2026, 10, 7, 9, 30)
    sent: dict[str, str] = {}
    for model in _reachable_models(_response_models()):
        for name, field in model.model_fields.items():
            if _mentions_datetime(field.annotation):
                adapter = TypeAdapter(typing.Annotated[field.annotation, field])
                sent[f"{model.__name__}.{name}"] = adapter.dump_python(adapter.validate_python(naive_utc), mode="json")
    assert sent
    assert {label: value for label, value in sent.items() if value != "2026-10-07T09:30:00Z"} == {}


def test_should_send_a_timestamp_with_another_offset_as_the_same_instant_in_utc():
    adapter = TypeAdapter(UtcDatetime)
    half_past_eleven_in_paris = datetime(2026, 10, 7, 11, 30, tzinfo=timezone(timedelta(hours=2)))
    assert adapter.dump_python(adapter.validate_python(half_past_eleven_in_paris), mode="json") == "2026-10-07T09:30:00Z"
