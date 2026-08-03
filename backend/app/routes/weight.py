"""Weight entry endpoints."""
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
from app.schemas.weight_schema import WeightEntryInput, serialize_weight_entry
from app.services import weight_service
from app.utils.dates import parse_date

weight_bp = Blueprint("weight", __name__, url_prefix="/api/v1/weight-entries")


def _parse_url_date(value: str):
    try:
        return parse_date(value)
    except ValueError as exc:
        raise ValidationError(fields={"entry_date": str(exc)}) from exc


def _payload_with_units(user) -> dict:
    """Default the inbound unit system to the user's preference."""
    body = json_body()
    body.setdefault("unit_system", user.preferred_unit_system)
    return body


@weight_bp.get("")
def list_weight_entries():
    user = current_user()
    start, end = range_from_query(default_days=30)
    if request.args.get("all") == "true":
        start = None
    query = weight_service.list_entries(
        user,
        start_date=start,
        end_date=end,
        search=request.args.get("search"),
        sort=request.args.get("sort", "desc"),
    )
    page, per_page = pagination_args()
    return jsonify(
        paginate(
            query,
            page,
            per_page,
            lambda entry: serialize_weight_entry(entry, user.preferred_unit_system),
        )
    )


@weight_bp.get("/export")
def export_weight_entries():
    user = current_user()
    start, end = range_from_query(default_days=365)
    rows = weight_service.list_entries(user, start, end, sort="asc").all()
    unit = user.preferred_unit_system
    return csv_response(
        "weight-entries.csv",
        ["date", "morning_weight", "evening_weight", "average_weight", "unit_system", "notes"],
        [
            [
                row.entry_date.isoformat(),
                serialize_weight_entry(row, unit)["morning_weight"] or "",
                serialize_weight_entry(row, unit)["evening_weight"] or "",
                serialize_weight_entry(row, unit)["average_weight"],
                unit,
                row.notes or "",
            ]
            for row in rows
        ],
    )


@weight_bp.post("")
def create_weight_entry():
    user = current_user()
    data = validate_payload(WeightEntryInput, _payload_with_units(user))
    entry, created = weight_service.upsert(
        user,
        entry_date=data.entry_date or client_today(),
        morning_weight_kg=data.morning_weight_kg,
        evening_weight_kg=data.evening_weight_kg,
        notes=data.notes,
    )
    return jsonify(
        {"data": serialize_weight_entry(entry, user.preferred_unit_system), "created": created}
    ), (201 if created else 200)


@weight_bp.get("/by-date/<entry_date>")
def get_weight_entry_by_date(entry_date: str):
    user = current_user()
    entry = weight_service.get_by_date(user, _parse_url_date(entry_date))
    return jsonify(
        {"data": serialize_weight_entry(entry, user.preferred_unit_system) if entry else None}
    )


@weight_bp.put("/by-date/<entry_date>")
def upsert_weight_entry_by_date(entry_date: str):
    user = current_user()
    data = validate_payload(WeightEntryInput, _payload_with_units(user))
    entry, created = weight_service.upsert(
        user,
        entry_date=_parse_url_date(entry_date),
        morning_weight_kg=data.morning_weight_kg,
        evening_weight_kg=data.evening_weight_kg,
        notes=data.notes,
    )
    return jsonify(
        {"data": serialize_weight_entry(entry, user.preferred_unit_system), "created": created}
    ), (201 if created else 200)


@weight_bp.get("/<int:entry_id>")
def get_weight_entry(entry_id: int):
    user = current_user()
    entry = weight_service.get_by_id(user, entry_id)
    return jsonify({"data": serialize_weight_entry(entry, user.preferred_unit_system)})


@weight_bp.put("/<int:entry_id>")
def update_weight_entry(entry_id: int):
    user = current_user()
    existing = weight_service.get_by_id(user, entry_id)
    data = validate_payload(WeightEntryInput, _payload_with_units(user))
    entry, _ = weight_service.upsert(
        user,
        entry_date=data.entry_date or existing.entry_date,
        morning_weight_kg=data.morning_weight_kg,
        evening_weight_kg=data.evening_weight_kg,
        notes=data.notes,
    )
    return jsonify({"data": serialize_weight_entry(entry, user.preferred_unit_system)})


@weight_bp.delete("/<int:entry_id>")
def delete_weight_entry(entry_id: int):
    user = current_user()
    weight_service.delete(user, entry_id)
    return jsonify({"data": {"deleted": True, "id": entry_id}})
