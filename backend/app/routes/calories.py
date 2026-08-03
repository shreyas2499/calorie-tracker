"""Calorie entry endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.errors import ValidationError
from app.routes.helpers import (
    client_today,
    csv_response,
    current_user,
    json_body,
    paginate,
    pagination_args,
    range_from_query,
)
from app.schemas import validate_payload
from app.schemas.calorie_schema import CalorieEntryInput, serialize_calorie_entry
from app.services import calorie_service
from app.utils.dates import parse_date

calories_bp = Blueprint("calories", __name__, url_prefix="/api/v1/calorie-entries")


def _parse_url_date(value: str):
    try:
        return parse_date(value)
    except ValueError as exc:
        raise ValidationError(fields={"entry_date": str(exc)}) from exc


@calories_bp.get("")
def list_calorie_entries():
    user = current_user()
    start, end = range_from_query(default_days=30)
    if request.args.get("all") == "true":
        start, end = None, end
    query = calorie_service.list_entries(
        user,
        start_date=start,
        end_date=end,
        search=request.args.get("search"),
        sort=request.args.get("sort", "desc"),
    )
    page, per_page = pagination_args()
    return jsonify(paginate(query, page, per_page, serialize_calorie_entry))


@calories_bp.get("/export")
def export_calorie_entries():
    user = current_user()
    start, end = range_from_query(default_days=365)
    rows = calorie_service.list_entries(user, start, end, sort="asc").all()
    return csv_response(
        "calorie-entries.csv",
        [
            "date",
            "calories_consumed",
            "calories_burned",
            "net_calories",
            "maintenance_calories",
            "calorie_balance",
            "status",
            "notes",
        ],
        [
            [
                row.entry_date.isoformat(),
                row.calories_consumed,
                row.calories_burned,
                row.net_calories,
                row.maintenance_calories,
                row.calorie_balance,
                calorie_service.balance_label(row.calorie_balance),
                row.notes or "",
            ]
            for row in rows
        ],
    )


@calories_bp.post("")
def create_calorie_entry():
    user = current_user()
    data = validate_payload(CalorieEntryInput, json_body())
    entry_date = data.entry_date or client_today()
    entry, created = calorie_service.upsert(
        user,
        entry_date=entry_date,
        calories_consumed=data.calories_consumed,
        calories_burned=data.calories_burned,
        notes=data.notes,
    )
    return jsonify({"data": serialize_calorie_entry(entry), "created": created}), (
        201 if created else 200
    )


@calories_bp.get("/by-date/<entry_date>")
def get_calorie_entry_by_date(entry_date: str):
    user = current_user()
    entry = calorie_service.get_by_date(user, _parse_url_date(entry_date))
    return jsonify({"data": serialize_calorie_entry(entry) if entry else None})


@calories_bp.put("/by-date/<entry_date>")
def upsert_calorie_entry_by_date(entry_date: str):
    """Dashboard quick-entry target: creates or updates the row for this date."""
    user = current_user()
    data = validate_payload(CalorieEntryInput, json_body())
    entry, created = calorie_service.upsert(
        user,
        entry_date=_parse_url_date(entry_date),
        calories_consumed=data.calories_consumed,
        calories_burned=data.calories_burned,
        notes=data.notes,
    )
    return jsonify({"data": serialize_calorie_entry(entry), "created": created}), (
        201 if created else 200
    )


@calories_bp.get("/<int:entry_id>")
def get_calorie_entry(entry_id: int):
    user = current_user()
    return jsonify({"data": serialize_calorie_entry(calorie_service.get_by_id(user, entry_id))})


@calories_bp.put("/<int:entry_id>")
def update_calorie_entry(entry_id: int):
    user = current_user()
    existing = calorie_service.get_by_id(user, entry_id)
    data = validate_payload(CalorieEntryInput, json_body())
    entry, _ = calorie_service.upsert(
        user,
        entry_date=data.entry_date or existing.entry_date,
        calories_consumed=data.calories_consumed,
        calories_burned=data.calories_burned,
        notes=data.notes,
    )
    return jsonify({"data": serialize_calorie_entry(entry)})


@calories_bp.delete("/<int:entry_id>")
def delete_calorie_entry(entry_id: int):
    user = current_user()
    calorie_service.delete(user, entry_id)
    return jsonify({"data": {"deleted": True, "id": entry_id}})
