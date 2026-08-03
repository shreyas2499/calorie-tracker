"""Weight entry persistence. Calculations are delegated to ``formulas``."""
from __future__ import annotations

from datetime import date

from app.errors import NotFoundError, ValidationError
from app.extensions import db
from app.models import User, WeightEntry
from app.services.formulas import calculate_average_weight, rolling_average

__all__ = [
    "calculate_average_weight",
    "rolling_average",
    "get_by_date",
    "get_by_id",
    "upsert",
    "delete",
    "list_entries",
]


def get_by_date(user: User, entry_date: date) -> WeightEntry | None:
    return WeightEntry.query.filter_by(user_id=user.id, entry_date=entry_date).first()


def get_by_id(user: User, entry_id: int) -> WeightEntry:
    entry = WeightEntry.query.filter_by(user_id=user.id, id=entry_id).first()
    if entry is None:
        raise NotFoundError("Weight entry not found.")
    return entry


def upsert(
    user: User,
    entry_date: date,
    morning_weight_kg: float | None,
    evening_weight_kg: float | None,
    notes: str | None = None,
    sync_current_weight: bool = True,
) -> tuple[WeightEntry, bool]:
    average = calculate_average_weight(morning_weight_kg, evening_weight_kg)
    if average is None:
        raise ValidationError(
            fields={"morning_weight_kg": "Enter a morning weight, an evening weight, or both."}
        )

    entry = get_by_date(user, entry_date)
    created = entry is None
    if entry is None:
        entry = WeightEntry(user_id=user.id, entry_date=entry_date)
        db.session.add(entry)

    entry.morning_weight_kg = morning_weight_kg
    entry.evening_weight_kg = evening_weight_kg
    entry.average_weight_kg = average
    entry.notes = notes
    db.session.commit()

    if sync_current_weight:
        _sync_current_weight(user)
    return entry, created


def _sync_current_weight(user: User) -> None:
    """Keep ``User.current_weight_kg`` aligned with the newest weight entry."""
    from app.services import calorie_service, maintenance_service

    latest = (
        WeightEntry.query.filter_by(user_id=user.id)
        .order_by(WeightEntry.entry_date.desc())
        .first()
    )
    if latest is None:
        return
    if float(user.current_weight_kg) == float(latest.average_weight_kg):
        return
    user.current_weight_kg = latest.average_weight_kg
    maintenance_service.recalculate(user, effective_date=latest.entry_date)
    # The target for that date just changed, so the calorie entry recorded on
    # the same date must not keep the superseded snapshot.
    calorie_service.refresh_maintenance_snapshot(user, latest.entry_date)


def delete(user: User, entry_id: int) -> None:
    entry = get_by_id(user, entry_id)
    db.session.delete(entry)
    db.session.commit()
    _sync_current_weight(user)


def list_entries(
    user: User,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    sort: str = "desc",
):
    query = WeightEntry.query.filter_by(user_id=user.id)
    if start_date:
        query = query.filter(WeightEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(WeightEntry.entry_date <= end_date)
    if search:
        query = query.filter(WeightEntry.notes.ilike(f"%{search}%"))
    order = WeightEntry.entry_date.asc() if sort == "asc" else WeightEntry.entry_date.desc()
    return query.order_by(order)
