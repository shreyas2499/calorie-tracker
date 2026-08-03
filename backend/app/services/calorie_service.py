"""Calorie entry persistence. Calculations are delegated to ``formulas``."""
from __future__ import annotations

from datetime import date

from app.errors import NotFoundError
from app.extensions import db
from app.models import CalorieEntry, User
from app.services.formulas import (
    balance_label,
    balance_status,
    calculate_calorie_balance,
    calculate_net_calories,
    estimate_weight_change_kg,
)

__all__ = [
    "balance_label",
    "balance_status",
    "calculate_calorie_balance",
    "calculate_net_calories",
    "estimate_weight_change_kg",
    "apply_calculations",
    "get_by_date",
    "get_by_id",
    "upsert",
    "delete",
    "list_entries",
    "refresh_maintenance_snapshot",
]


def apply_calculations(entry: CalorieEntry, maintenance_calories: int) -> CalorieEntry:
    """Recompute every derived field from the two raw inputs."""
    entry.maintenance_calories = int(maintenance_calories)
    entry.net_calories = calculate_net_calories(entry.calories_consumed, entry.calories_burned)
    entry.calorie_balance = calculate_calorie_balance(entry.net_calories, entry.maintenance_calories)
    entry.estimated_weight_change_kg = estimate_weight_change_kg(entry.calorie_balance)
    return entry


def refresh_maintenance_snapshot(user: User, entry_date: date) -> CalorieEntry | None:
    """Re-stamp one date's entry with the user's current active target.

    Used when the target *for that date* changes - e.g. the weight recorded on
    that date was edited. Every other date keeps its original snapshot, so
    history still does not move.
    """
    entry = get_by_date(user, entry_date)
    if entry is None:
        return None
    apply_calculations(entry, user.active_maintenance_calories)
    db.session.commit()
    return entry


def get_by_date(user: User, entry_date: date) -> CalorieEntry | None:
    return CalorieEntry.query.filter_by(user_id=user.id, entry_date=entry_date).first()


def get_by_id(user: User, entry_id: int) -> CalorieEntry:
    entry = CalorieEntry.query.filter_by(user_id=user.id, id=entry_id).first()
    if entry is None:
        raise NotFoundError("Calorie entry not found.")
    return entry


def upsert(
    user: User,
    entry_date: date,
    calories_consumed: int,
    calories_burned: int,
    notes: str | None = None,
    maintenance_calories: int | None = None,
) -> tuple[CalorieEntry, bool]:
    """Create or update the single entry for ``entry_date``.

    Returns ``(entry, created)``. An existing row keeps its stored maintenance
    snapshot unless one is explicitly supplied.
    """
    entry = get_by_date(user, entry_date)
    created = entry is None
    if entry is None:
        entry = CalorieEntry(user_id=user.id, entry_date=entry_date)
        db.session.add(entry)

    entry.calories_consumed = int(calories_consumed)
    entry.calories_burned = int(calories_burned)
    entry.notes = notes

    if maintenance_calories is not None:
        snapshot = maintenance_calories
    elif created or not entry.maintenance_calories:
        snapshot = user.active_maintenance_calories
    else:
        snapshot = entry.maintenance_calories

    apply_calculations(entry, snapshot)
    db.session.commit()
    return entry, created


def delete(user: User, entry_id: int) -> None:
    entry = get_by_id(user, entry_id)
    db.session.delete(entry)
    db.session.commit()


def list_entries(
    user: User,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort: str = "desc",
):
    query = CalorieEntry.query.filter_by(user_id=user.id)
    if start_date:
        query = query.filter(CalorieEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(CalorieEntry.entry_date <= end_date)
    if search:
        query = query.filter(CalorieEntry.notes.ilike(f"%{search}%"))
    order = CalorieEntry.entry_date.asc() if sort == "asc" else CalorieEntry.entry_date.desc()
    return query.order_by(order)
