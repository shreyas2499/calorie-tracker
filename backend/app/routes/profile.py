"""Profile and maintenance-calorie endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify

from app.errors import ConflictError, NotFoundError
from app.extensions import db
from app.models import MaintenanceHistory, User
from app.routes.helpers import client_today, current_user, json_body
from app.schemas import validate_payload
from app.schemas.profile_schema import (
    ManualMaintenanceInput,
    ProfileInput,
    serialize_profile,
)
from app.services import maintenance_service
from app.utils.dates import format_date

profile_bp = Blueprint("profile", __name__, url_prefix="/api/v1")


def _apply_profile(user: User, data: ProfileInput) -> User:
    user.name = data.name
    user.email = data.email
    user.age = data.age
    user.sex = data.sex
    user.height_cm = data.height_cm
    user.current_weight_kg = data.weight_kg
    user.preferred_unit_system = data.preferred_unit_system
    user.activity_level = data.activity_level
    user.manual_maintenance_calories = data.manual_maintenance_calories
    return user


@profile_bp.get("/profile")
def get_profile():
    user = current_user()
    return jsonify({"data": serialize_profile(user)})


@profile_bp.post("/profile")
def create_profile():
    if User.query.first() is not None:
        raise ConflictError(
            "A profile already exists. Use PUT /api/v1/profile to update it.",
            code="PROFILE_EXISTS",
        )
    data = validate_payload(ProfileInput, json_body())
    user = _apply_profile(User(), data)
    db.session.add(user)
    db.session.commit()
    maintenance_service.recalculate(user, effective_date=client_today())
    return jsonify({"data": serialize_profile(user)}), 201


@profile_bp.put("/profile")
def update_profile():
    user = current_user()
    data = validate_payload(ProfileInput, json_body())
    _apply_profile(user, data)
    db.session.commit()
    # Weight, height, age, sex or activity level may have changed.
    maintenance_service.recalculate(user, effective_date=client_today())
    return jsonify({"data": serialize_profile(user)})


@profile_bp.get("/maintenance")
def get_maintenance():
    user = current_user()
    return jsonify({"data": maintenance_service.maintenance_summary(user)})


@profile_bp.post("/maintenance/recalculate")
def recalculate_maintenance():
    """Recalculate from current profile values, optionally setting/clearing the override."""
    user = current_user()
    body = {}
    try:
        body = json_body()
    except Exception:  # noqa: BLE001 - an empty body is valid here
        body = {}

    if "manual_maintenance_calories" in body:
        data = validate_payload(ManualMaintenanceInput, body)
        user.manual_maintenance_calories = data.manual_maintenance_calories

    maintenance_service.recalculate(user, effective_date=client_today())
    return jsonify({"data": maintenance_service.maintenance_summary(user)})


@profile_bp.get("/maintenance/history")
def maintenance_history():
    user = current_user()
    rows = (
        MaintenanceHistory.query.filter_by(user_id=user.id)
        .order_by(MaintenanceHistory.effective_date.desc(), MaintenanceHistory.id.desc())
        .all()
    )
    if not rows and user is None:
        raise NotFoundError("No maintenance history available.")
    return jsonify(
        {
            "data": [
                {
                    "id": row.id,
                    "effective_date": format_date(row.effective_date),
                    "calculated_maintenance_calories": row.calculated_maintenance_calories,
                    "manual_maintenance_calories": row.manual_maintenance_calories,
                    "active_maintenance_calories": row.active_maintenance_calories,
                    "weight_kg": float(row.weight_kg),
                    "activity_level": row.activity_level,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row in rows
            ]
        }
    )
