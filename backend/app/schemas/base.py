"""Pydantic helpers that turn model validation into our JSON error shape."""
from __future__ import annotations

from typing import TypeVar

from pydantic import BaseModel
from pydantic import ValidationError as PydanticValidationError

from app.errors import ValidationError

T = TypeVar("T", bound=BaseModel)


def validate_payload(schema: type[T], payload: dict | None) -> T:
    try:
        return schema.model_validate(payload or {})
    except PydanticValidationError as exc:
        fields: dict[str, str] = {}
        for error in exc.errors():
            location = ".".join(str(part) for part in error["loc"]) or "non_field"
            fields.setdefault(location, error["msg"].replace("Value error, ", ""))
        raise ValidationError(fields=fields) from exc
