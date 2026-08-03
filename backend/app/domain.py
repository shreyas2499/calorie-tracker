"""Framework-free domain constants and limits.

Kept free of Flask/SQLAlchemy imports so the calculation layer can be imported
and unit-tested without a database or an application context.
"""
from __future__ import annotations


class Sex:
    MALE = "male"
    FEMALE = "female"
    ALL = (MALE, FEMALE)


class UnitSystem:
    METRIC = "metric"
    IMPERIAL = "imperial"
    ALL = (METRIC, IMPERIAL)


class ActivityLevel:
    SEDENTARY = "sedentary"
    LIGHTLY_ACTIVE = "lightly_active"
    MODERATELY_ACTIVE = "moderately_active"
    VERY_ACTIVE = "very_active"
    EXTRA_ACTIVE = "extra_active"
    ALL = (SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE, EXTRA_ACTIVE)


ACTIVITY_MULTIPLIERS: dict[str, float] = {
    ActivityLevel.SEDENTARY: 1.2,
    ActivityLevel.LIGHTLY_ACTIVE: 1.375,
    ActivityLevel.MODERATELY_ACTIVE: 1.55,
    ActivityLevel.VERY_ACTIVE: 1.725,
    ActivityLevel.EXTRA_ACTIVE: 1.9,
}

ACTIVITY_LABELS: dict[str, str] = {
    ActivityLevel.SEDENTARY: "Sedentary",
    ActivityLevel.LIGHTLY_ACTIVE: "Lightly active",
    ActivityLevel.MODERATELY_ACTIVE: "Moderately active",
    ActivityLevel.VERY_ACTIVE: "Very active",
    ActivityLevel.EXTRA_ACTIVE: "Extra active",
}

DEFAULT_ACTIVITY_MULTIPLIER = ACTIVITY_MULTIPLIERS[ActivityLevel.SEDENTARY]

# Validation limits, shared by schemas and mirrored by the frontend.
AGE_MIN, AGE_MAX = 13, 120
HEIGHT_CM_MIN, HEIGHT_CM_MAX = 100, 250
WEIGHT_KG_MIN, WEIGHT_KG_MAX = 25, 400
CALORIES_CONSUMED_MAX = 20000
CALORIES_BURNED_MAX = 10000
MAINTENANCE_MIN, MAINTENANCE_MAX = 800, 10000
NOTES_MAX = 1000

# A day's balance within this many calories of the target reads as "maintenance".
NEAR_MAINTENANCE_THRESHOLD = 50
ROLLING_WINDOW = 7
