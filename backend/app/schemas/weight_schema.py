"""Weight entry validation and serialization."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain import NOTES_MAX, WEIGHT_KG_MAX, WEIGHT_KG_MIN
from app.models import WeightEntry
from app.utils.dates import format_date, parse_date
from app.utils.units import weight_from_kg, weight_to_kg


class WeightEntryInput(BaseModel):
    """Weights arrive in ``unit_system`` units and are stored as kilograms."""

    model_config = ConfigDict(extra="ignore")

    entry_date: date | None = None
    morning_weight: float | None = Field(default=None, gt=0)
    evening_weight: float | None = Field(default=None, gt=0)
    unit_system: Literal["metric", "imperial"] = "metric"
    notes: str | None = Field(default=None, max_length=NOTES_MAX)

    @field_validator("entry_date", mode="before")
    @classmethod
    def _parse_entry_date(cls, value):
        try:
            return parse_date(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("morning_weight", "evening_weight", mode="before")
    @classmethod
    def _blank_is_null(cls, value):
        if value in ("", None):
            return None
        return value

    @field_validator("notes")
    @classmethod
    def _blank_notes_is_null(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

    @model_validator(mode="after")
    def _convert_and_check(self) -> "WeightEntryInput":
        if self.morning_weight is None and self.evening_weight is None:
            raise ValueError("Enter a morning weight, an evening weight, or both.")

        converted: dict[str, float | None] = {}
        for field in ("morning_weight", "evening_weight"):
            value = getattr(self, field)
            if value is None:
                converted[f"{field}_kg"] = None
                continue
            kg = round(weight_to_kg(value, self.unit_system), 2)
            if not WEIGHT_KG_MIN <= kg <= WEIGHT_KG_MAX:
                raise ValueError(
                    f"Weight must be between {WEIGHT_KG_MIN} and {WEIGHT_KG_MAX} kg "
                    f"(received {kg} kg)."
                )
            converted[f"{field}_kg"] = kg

        self.__dict__.update(converted)
        return self

    @property
    def morning_weight_kg(self) -> float | None:
        return self.__dict__.get("morning_weight_kg")

    @property
    def evening_weight_kg(self) -> float | None:
        return self.__dict__.get("evening_weight_kg")


def serialize_weight_entry(entry: WeightEntry, unit_system: str = "metric") -> dict:
    def convert(value):
        return weight_from_kg(float(value), unit_system) if value is not None else None

    return {
        "id": entry.id,
        "user_id": entry.user_id,
        "entry_date": format_date(entry.entry_date),
        "morning_weight_kg": float(entry.morning_weight_kg)
        if entry.morning_weight_kg is not None
        else None,
        "evening_weight_kg": float(entry.evening_weight_kg)
        if entry.evening_weight_kg is not None
        else None,
        "average_weight_kg": float(entry.average_weight_kg),
        "morning_weight": convert(entry.morning_weight_kg),
        "evening_weight": convert(entry.evening_weight_kg),
        "average_weight": convert(entry.average_weight_kg),
        "unit_system": unit_system,
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }
