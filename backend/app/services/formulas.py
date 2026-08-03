"""Pure calculation functions.

Every number the API reports originates here. No Flask, no SQLAlchemy, no
database access, so these are cheap to unit test and safe to reuse anywhere.
"""
from __future__ import annotations

from datetime import date, timedelta

from app.domain import (
    ACTIVITY_MULTIPLIERS,
    DEFAULT_ACTIVITY_MULTIPLIER,
    NEAR_MAINTENANCE_THRESHOLD,
    ROLLING_WINDOW,
    Sex,
)
from app.utils.units import KCAL_PER_KG_OF_BODY_MASS

# --------------------------------------------------------------------------- #
# Maintenance calories
# --------------------------------------------------------------------------- #


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """Mifflin-St Jeor basal metabolic rate, kcal/day.

    men:   10*kg + 6.25*cm - 5*age + 5
    women: 10*kg + 6.25*cm - 5*age - 161
    """
    base = 10 * float(weight_kg) + 6.25 * float(height_cm) - 5 * int(age)
    return base + 5 if sex == Sex.MALE else base - 161


def activity_multiplier(activity_level: str) -> float:
    return ACTIVITY_MULTIPLIERS.get(activity_level, DEFAULT_ACTIVITY_MULTIPLIER)


def calculate_maintenance_calories(
    weight_kg: float, height_cm: float, age: int, sex: str, activity_level: str
) -> int:
    """BMR x activity multiplier, rounded to the nearest whole calorie."""
    bmr = calculate_bmr(weight_kg, height_cm, age, sex)
    return int(round(bmr * activity_multiplier(activity_level)))


def resolve_active_maintenance(calculated: int | None, manual: int | None) -> int:
    """A manual override always wins when one is set."""
    if manual is not None:
        return int(manual)
    return int(calculated or 0)


# --------------------------------------------------------------------------- #
# Daily calories
# --------------------------------------------------------------------------- #


def calculate_net_calories(consumed: int, burned: int) -> int:
    return int(consumed) - int(burned)


def calculate_calorie_balance(net_calories: int, maintenance_calories: int) -> int:
    """Negative is a deficit, positive is a surplus."""
    return int(net_calories) - int(maintenance_calories)


def estimate_weight_change_kg(calorie_balance: float) -> float:
    """Rough arithmetic estimate only (~7,700 kcal per kg of body mass).

    This is not a prediction of actual body-weight change.
    """
    return round(calorie_balance / KCAL_PER_KG_OF_BODY_MASS, 4)


def balance_status(calorie_balance: float) -> str:
    if abs(calorie_balance) <= NEAR_MAINTENANCE_THRESHOLD:
        return "at_maintenance"
    return "deficit" if calorie_balance < 0 else "surplus"


BALANCE_LABELS = {
    "deficit": "Deficit",
    "surplus": "Surplus",
    "at_maintenance": "At maintenance",
    "no_data": "No data recorded",
}


def balance_label(calorie_balance: float) -> str:
    return BALANCE_LABELS[balance_status(calorie_balance)]


# --------------------------------------------------------------------------- #
# Weight
# --------------------------------------------------------------------------- #


def calculate_average_weight(
    morning_kg: float | None, evening_kg: float | None
) -> float | None:
    """Mean of whichever readings exist; ``None`` when neither does."""
    values = [float(v) for v in (morning_kg, evening_kg) if v is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def rolling_average(
    values: list[float | None], window: int = ROLLING_WINDOW
) -> list[float | None]:
    """Trailing rolling average over a dense daily series, skipping missing days.

    Position *i* averages the readings present in ``values[i-window+1 : i+1]``.
    Yields ``None`` while the window holds no readings at all.
    """
    result: list[float | None] = []
    for index in range(len(values)):
        window_slice = [
            value for value in values[max(0, index - window + 1) : index + 1] if value is not None
        ]
        result.append(round(sum(window_slice) / len(window_slice), 2) if window_slice else None)
    return result


def percent_change(start: float | None, end: float | None) -> float | None:
    if start in (None, 0) or end is None:
        return None
    return round((end - start) / start * 100, 2)


# --------------------------------------------------------------------------- #
# Aggregates
# --------------------------------------------------------------------------- #


def average(values: list[float], ndigits: int = 1) -> float | None:
    return round(sum(values) / len(values), ndigits) if values else None


def date_series(start: date, end: date) -> list[date]:
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]


def calculate_streaks(
    tracked_days: set[date], window_start: date, window_end: date, today: date
) -> dict[str, int]:
    """Longest consecutive run inside the window, plus the run ending now.

    The current streak counts backwards from today, tolerating a gap on today
    itself so the streak is not reported as broken before the day is over.
    """
    longest = 0
    run = 0
    for day in date_series(window_start, window_end):
        if day in tracked_days:
            run += 1
            longest = max(longest, run)
        else:
            run = 0

    anchor = today if today in tracked_days else today - timedelta(days=1)
    current = 0
    cursor = anchor
    while cursor in tracked_days:
        current += 1
        cursor -= timedelta(days=1)

    return {"current_streak": current, "longest_streak": longest}


def build_summary_text(
    total_days: int,
    weight_change: float | None,
    unit_label: str,
    average_balance: float | None,
    weight_readings: int = 2,
) -> str:
    """Plain-language recap that deliberately avoids implying causation."""
    if weight_readings == 1:
        first = f"Over the last {total_days} days, a single weight entry was recorded"
    elif weight_change is None:
        first = f"Over the last {total_days} days, no weight entries were recorded"
    elif weight_change < 0:
        first = (
            f"Over the last {total_days} days, your average weight decreased by "
            f"{abs(weight_change)} {unit_label}"
        )
    elif weight_change > 0:
        first = (
            f"Over the last {total_days} days, your average weight increased by "
            f"{weight_change} {unit_label}"
        )
    else:
        first = f"Over the last {total_days} days, your average weight was unchanged"

    if average_balance is None:
        second = "no calorie entries were recorded"
    elif average_balance < 0:
        second = (
            f"your average daily calorie balance was a "
            f"{abs(int(round(average_balance)))}-calorie deficit"
        )
    elif average_balance > 0:
        second = (
            f"your average daily calorie balance was a "
            f"{int(round(average_balance))}-calorie surplus"
        )
    else:
        second = "your average daily calorie balance was at maintenance"

    return f"{first} and {second}."
