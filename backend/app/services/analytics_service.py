"""Chart-ready series, progress summaries and tracking streaks.

All figures are computed here so the frontend never has to recalculate them.
"""
from __future__ import annotations

from datetime import date, timedelta

from app.domain import ROLLING_WINDOW
from app.models import CalorieEntry, User, WeightEntry
from app.services.formulas import (
    average,
    balance_label,
    balance_status,
    build_summary_text,
    calculate_streaks,
    percent_change,
    rolling_average,
)
from app.utils.dates import date_series, format_date
from app.utils.units import weight_from_kg, weight_unit_label


def _calorie_rows(user: User, start: date | None, end: date) -> list[CalorieEntry]:
    query = CalorieEntry.query.filter_by(user_id=user.id).filter(CalorieEntry.entry_date <= end)
    if start:
        query = query.filter(CalorieEntry.entry_date >= start)
    return query.order_by(CalorieEntry.entry_date.asc()).all()


def _weight_rows(user: User, start: date | None, end: date) -> list[WeightEntry]:
    query = WeightEntry.query.filter_by(user_id=user.id).filter(WeightEntry.entry_date <= end)
    if start:
        query = query.filter(WeightEntry.entry_date >= start)
    return query.order_by(WeightEntry.entry_date.asc()).all()


def _resolve_window(rows, start: date | None, end: date) -> tuple[date, date]:
    if start:
        return start, end
    if rows:
        return rows[0].entry_date, end
    return end, end


def calorie_series(user: User, start: date | None, end: date) -> dict:
    """Dense daily calorie series; days without an entry carry ``None`` values."""
    rows = _calorie_rows(user, start, end)
    by_date = {row.entry_date: row for row in rows}
    window_start, window_end = _resolve_window(rows, start, end)

    points = []
    for day in date_series(window_start, window_end):
        row = by_date.get(day)
        if row is None:
            points.append(
                {
                    "date": format_date(day),
                    "calories_consumed": None,
                    "calories_burned": None,
                    "net_calories": None,
                    "maintenance_calories": None,
                    "calorie_balance": None,
                    "status": "no_data",
                    "status_label": "No data recorded",
                }
            )
            continue
        points.append(
            {
                "date": format_date(day),
                "calories_consumed": row.calories_consumed,
                "calories_burned": row.calories_burned,
                "net_calories": row.net_calories,
                "maintenance_calories": row.maintenance_calories,
                "calorie_balance": row.calorie_balance,
                "status": balance_status(row.calorie_balance),
                "status_label": balance_label(row.calorie_balance),
            }
        )

    return {
        "start_date": format_date(window_start),
        "end_date": format_date(window_end),
        "points": points,
        "tracked_days": len(rows),
        "total_days": len(points),
    }


def weight_series(user: User, start: date | None, end: date, unit_system: str | None = None) -> dict:
    """Dense daily weight series including a trailing 7-day rolling average."""
    unit_system = unit_system or user.preferred_unit_system
    rows = _weight_rows(user, start, end)
    by_date = {row.entry_date: row for row in rows}
    window_start, window_end = _resolve_window(rows, start, end)

    days = date_series(window_start, window_end)
    averages_kg = [
        float(by_date[day].average_weight_kg) if day in by_date else None for day in days
    ]
    rolling_kg = rolling_average(averages_kg, ROLLING_WINDOW)

    points = []
    for index, day in enumerate(days):
        row = by_date.get(day)
        points.append(
            {
                "date": format_date(day),
                "morning_weight": weight_from_kg(
                    float(row.morning_weight_kg) if row and row.morning_weight_kg is not None else None,
                    unit_system,
                ),
                "evening_weight": weight_from_kg(
                    float(row.evening_weight_kg) if row and row.evening_weight_kg is not None else None,
                    unit_system,
                ),
                "average_weight": weight_from_kg(averages_kg[index], unit_system),
                "rolling_average_7d": weight_from_kg(rolling_kg[index], unit_system),
                "average_weight_kg": averages_kg[index],
            }
        )

    return {
        "start_date": format_date(window_start),
        "end_date": format_date(window_end),
        "unit_system": unit_system,
        "unit_label": weight_unit_label(unit_system),
        "points": points,
        "tracked_days": len(rows),
        "total_days": len(points),
    }


def summary(user: User, start: date | None, end: date, today: date | None = None) -> dict:
    """Progress metrics for the selected window."""
    today = today or end
    unit_system = user.preferred_unit_system
    unit_label = weight_unit_label(unit_system)

    calorie_rows = _calorie_rows(user, start, end)
    weight_rows = _weight_rows(user, start, end)

    window_start = start or min(
        [r.entry_date for r in calorie_rows + weight_rows] or [end]
    )
    total_days = (end - window_start).days + 1

    starting_kg = float(weight_rows[0].average_weight_kg) if weight_rows else None
    latest_kg = float(weight_rows[-1].average_weight_kg) if weight_rows else None
    change_kg = (
        round(latest_kg - starting_kg, 2)
        if starting_kg is not None and latest_kg is not None
        else None
    )
    pct_change = percent_change(starting_kg, latest_kg)

    consumed = [r.calories_consumed for r in calorie_rows]
    burned = [r.calories_burned for r in calorie_rows]
    net = [r.net_calories for r in calorie_rows]
    balance = [r.calorie_balance for r in calorie_rows]
    avg_balance = average(balance)

    tracked_dates = {r.entry_date for r in calorie_rows} | {r.entry_date for r in weight_rows}
    streaks = calculate_streaks(tracked_dates, window_start, end, today)

    result = {
        "start_date": format_date(window_start),
        "end_date": format_date(end),
        "unit_system": unit_system,
        "unit_label": unit_label,
        "starting_average_weight": weight_from_kg(starting_kg, unit_system),
        "latest_average_weight": weight_from_kg(latest_kg, unit_system),
        "total_weight_change": weight_from_kg(change_kg, unit_system) if change_kg is not None else None,
        "total_weight_change_kg": change_kg,
        "percent_weight_change": pct_change,
        "average_calories_consumed": average(consumed),
        "average_calories_burned": average(burned),
        "average_net_calories": average(net),
        "average_calorie_balance": avg_balance,
        "average_balance_status": balance_status(int(avg_balance))
        if avg_balance is not None
        else "no_data",
        "average_balance_label": balance_label(int(avg_balance))
        if avg_balance is not None
        else "No data recorded",
        "calorie_tracked_days": len(calorie_rows),
        "weight_tracked_days": len(weight_rows),
        "tracked_days": len(tracked_dates),
        "missing_days": max(total_days - len(tracked_dates), 0),
        "total_days": total_days,
        **streaks,
    }
    result["summary_text"] = build_summary_text(
        total_days=total_days,
        weight_change=result["total_weight_change"],
        unit_label=unit_label,
        average_balance=avg_balance,
    )
    return result


def dashboard(user: User, today: date, range_days: int = 30) -> dict:
    """Everything the dashboard needs in a single request."""
    from app.schemas.calorie_schema import serialize_calorie_entry
    from app.schemas.weight_schema import serialize_weight_entry
    from app.services import calorie_service, weight_service

    unit_system = user.preferred_unit_system
    window_start = today - timedelta(days=range_days - 1)

    calorie_today = calorie_service.get_by_date(user, today)
    weight_today = weight_service.get_by_date(user, today)

    latest_weight = (
        WeightEntry.query.filter_by(user_id=user.id)
        .order_by(WeightEntry.entry_date.desc())
        .first()
    )

    period = summary(user, window_start, today, today=today)

    return {
        "date": format_date(today),
        "unit_system": unit_system,
        "unit_label": weight_unit_label(unit_system),
        "active_maintenance_calories": user.active_maintenance_calories,
        "today_calories": serialize_calorie_entry(calorie_today) if calorie_today else None,
        "today_weight": serialize_weight_entry(weight_today, unit_system) if weight_today else None,
        "latest_weight": (
            {
                "date": format_date(latest_weight.entry_date),
                "average_weight": weight_from_kg(
                    float(latest_weight.average_weight_kg), unit_system
                ),
            }
            if latest_weight
            else None
        ),
        "period": period,
        "range_days": range_days,
        "calorie_series": calorie_series(user, window_start, today),
        "weight_series": weight_series(user, window_start, today, unit_system),
    }
