"""Calorie entry validation and serialization."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain import CALORIES_BURNED_MAX, CALORIES_CONSUMED_MAX, NOTES_MAX
from app.models import CalorieEntry
from app.services.formulas import balance_label, balance_status
from app.utils.dates import format_date, parse_date


class CalorieEntryInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    entry_date: date | None = None
    calories_consumed: int = Field(ge=0, le=CALORIES_CONSUMED_MAX)
    calories_burned: int = Field(default=0, ge=0, le=CALORIES_BURNED_MAX)
    notes: str | None = Field(default=None, max_length=NOTES_MAX)

    @field_validator("entry_date", mode="before")
    @classmethod
    def _parse_entry_date(cls, value):
        try:
            return parse_date(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("notes")
    @classmethod
    def _blank_notes_is_null(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None


class CalorieEntryDateInput(CalorieEntryInput):
    """Body for the by-date upsert endpoint; the date comes from the URL."""

    entry_date: date | None = None


def serialize_calorie_entry(entry: CalorieEntry) -> dict:
    status = balance_status(entry.calorie_balance)
    return {
        "id": entry.id,
        "user_id": entry.user_id,
        "entry_date": format_date(entry.entry_date),
        "calories_consumed": entry.calories_consumed,
        "calories_burned": entry.calories_burned,
        "net_calories": entry.net_calories,
        "maintenance_calories": entry.maintenance_calories,
        "calorie_balance": entry.calorie_balance,
        "estimated_weight_change_kg": float(entry.estimated_weight_change_kg),
        "status": status,
        "status_label": balance_label(entry.calorie_balance),
        "notes": entry.notes,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }
