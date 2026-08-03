"""Maintenance-calorie orchestration: read the user, compute, persist history."""
from __future__ import annotations

from datetime import date

from app.extensions import db
from app.models import MaintenanceHistory, User
from app.services.formulas import (
    calculate_bmr,
    calculate_maintenance_calories,
)
from app.utils.dates import utcnow

# Profile fields that invalidate a previously calculated maintenance figure.
MAINTENANCE_INPUT_FIELDS = ("current_weight_kg", "height_cm", "age", "sex", "activity_level")


def calculate_for_user(user: User) -> int:
    return calculate_maintenance_calories(
        weight_kg=float(user.current_weight_kg),
        height_cm=float(user.height_cm),
        age=int(user.age),
        sex=user.sex,
        activity_level=user.activity_level,
    )


def bmr_for_user(user: User) -> float:
    return calculate_bmr(
        weight_kg=float(user.current_weight_kg),
        height_cm=float(user.height_cm),
        age=int(user.age),
        sex=user.sex,
    )


def latest_history(user: User) -> MaintenanceHistory | None:
    return (
        MaintenanceHistory.query.filter_by(user_id=user.id)
        .order_by(MaintenanceHistory.effective_date.desc(), MaintenanceHistory.id.desc())
        .first()
    )


def recalculate(user: User, effective_date: date | None = None, commit: bool = True) -> User:
    """Recalculate the target and append a history row whenever it changes.

    Called after any change to weight, height, age, sex, activity level or the
    manual override.
    """
    user.calculated_maintenance_calories = calculate_for_user(user)
    active = user.active_maintenance_calories

    previous = latest_history(user)
    changed = previous is None or (
        previous.active_maintenance_calories != active
        or previous.calculated_maintenance_calories != user.calculated_maintenance_calories
        or previous.manual_maintenance_calories != user.manual_maintenance_calories
    )

    if changed:
        db.session.add(
            MaintenanceHistory(
                user_id=user.id,
                effective_date=effective_date or utcnow().date(),
                calculated_maintenance_calories=user.calculated_maintenance_calories,
                manual_maintenance_calories=user.manual_maintenance_calories,
                active_maintenance_calories=active,
                weight_kg=user.current_weight_kg,
                activity_level=user.activity_level,
            )
        )

    if commit:
        db.session.commit()
    return user


def maintenance_summary(user: User) -> dict:
    history = latest_history(user)
    return {
        "bmr": round(bmr_for_user(user), 1),
        "calculated_maintenance_calories": int(user.calculated_maintenance_calories or 0),
        "manual_maintenance_calories": user.manual_maintenance_calories,
        "active_maintenance_calories": user.active_maintenance_calories,
        "is_manual_override": user.manual_maintenance_calories is not None,
        "activity_level": user.activity_level,
        "activity_level_label": user.activity_level_label,
        "activity_multiplier": user.activity_multiplier,
        "current_weight_kg": float(user.current_weight_kg),
        "last_recalculated_at": history.created_at.isoformat()
        if history and history.created_at
        else None,
        "last_recalculated_date": history.effective_date.isoformat() if history else None,
    }
