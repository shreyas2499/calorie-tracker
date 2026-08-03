"""Profile request validation and serialization."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domain import (
    AGE_MAX,
    AGE_MIN,
    HEIGHT_CM_MAX,
    HEIGHT_CM_MIN,
    MAINTENANCE_MAX,
    MAINTENANCE_MIN,
    WEIGHT_KG_MAX,
    WEIGHT_KG_MIN,
    ActivityLevel,
    Sex,
    UnitSystem,
)
from app.models import User
from app.utils.units import (
    cm_to_feet_inches,
    height_to_cm,
    weight_from_kg,
    weight_to_kg,
)


class ProfileInput(BaseModel):
    """Accepts values in the caller's unit system and normalizes to metric.

    Metric callers send ``height`` in cm and ``weight`` in kg. Imperial callers
    send ``height_feet``/``height_inches`` and ``weight`` in pounds.
    """

    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=255)
    age: int = Field(ge=AGE_MIN, le=AGE_MAX)
    sex: Literal["male", "female"]
    preferred_unit_system: Literal["metric", "imperial"] = UnitSystem.METRIC
    activity_level: Literal[
        "sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"
    ]

    height: float | None = Field(default=None, gt=0)
    height_feet: float | None = Field(default=None, ge=0)
    height_inches: float | None = Field(default=None, ge=0, lt=12)
    weight: float = Field(gt=0)

    manual_maintenance_calories: int | None = Field(
        default=None, ge=MAINTENANCE_MIN, le=MAINTENANCE_MAX
    )

    @field_validator("email")
    @classmethod
    def _blank_email_is_null(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

    @model_validator(mode="after")
    def _check_converted_ranges(self) -> "ProfileInput":
        if self.preferred_unit_system == UnitSystem.IMPERIAL:
            if self.height_feet is None and self.height is None:
                raise ValueError("Enter your height in feet and inches.")
            feet = self.height_feet if self.height_feet is not None else self.height
            height_cm = height_to_cm(feet, UnitSystem.IMPERIAL, self.height_inches or 0.0)
        else:
            if self.height is None:
                raise ValueError("Enter your height in centimetres.")
            height_cm = float(self.height)

        weight_kg = weight_to_kg(self.weight, self.preferred_unit_system)

        if not HEIGHT_CM_MIN <= height_cm <= HEIGHT_CM_MAX:
            raise ValueError(
                f"Height must be between {HEIGHT_CM_MIN} and {HEIGHT_CM_MAX} cm "
                f"(received {round(height_cm, 1)} cm)."
            )
        if not WEIGHT_KG_MIN <= weight_kg <= WEIGHT_KG_MAX:
            raise ValueError(
                f"Weight must be between {WEIGHT_KG_MIN} and {WEIGHT_KG_MAX} kg "
                f"(received {round(weight_kg, 1)} kg)."
            )

        self.__dict__["height_cm"] = round(height_cm, 2)
        self.__dict__["weight_kg"] = round(weight_kg, 2)
        return self

    @property
    def height_cm(self) -> float:
        return self.__dict__["height_cm"]

    @property
    def weight_kg(self) -> float:
        return self.__dict__["weight_kg"]


class ManualMaintenanceInput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    manual_maintenance_calories: int | None = Field(
        default=None, ge=MAINTENANCE_MIN, le=MAINTENANCE_MAX
    )


def serialize_profile(user: User) -> dict:
    unit_system = user.preferred_unit_system
    feet, inches = cm_to_feet_inches(float(user.height_cm))
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "age": user.age,
        "sex": user.sex,
        "preferred_unit_system": unit_system,
        "activity_level": user.activity_level,
        "activity_level_label": user.activity_level_label,
        "height_cm": float(user.height_cm),
        "height_feet": feet,
        "height_inches": inches,
        "current_weight_kg": float(user.current_weight_kg),
        "current_weight": weight_from_kg(float(user.current_weight_kg), unit_system),
        "calculated_maintenance_calories": int(user.calculated_maintenance_calories or 0),
        "manual_maintenance_calories": user.manual_maintenance_calories,
        "active_maintenance_calories": user.active_maintenance_calories,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


SEX_CHOICES = Sex.ALL
ACTIVITY_CHOICES = ActivityLevel.ALL
