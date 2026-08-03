"""Dashboard and analytics endpoints. All figures are computed server-side."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.routes.helpers import client_today, current_user, range_from_query
from app.services import analytics_service

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/v1")


@analytics_bp.get("/dashboard")
def dashboard():
    user = current_user()
    try:
        range_days = int(request.args.get("range_days", 30))
    except ValueError:
        range_days = 30
    range_days = max(2, min(range_days, 365))
    return jsonify({"data": analytics_service.dashboard(user, client_today(), range_days)})


@analytics_bp.get("/analytics/calories")
def calorie_analytics():
    user = current_user()
    start, end = range_from_query(default_days=30)
    return jsonify({"data": analytics_service.calorie_series(user, start, end)})


@analytics_bp.get("/analytics/weight")
def weight_analytics():
    user = current_user()
    start, end = range_from_query(default_days=30)
    return jsonify({"data": analytics_service.weight_series(user, start, end)})


@analytics_bp.get("/analytics/summary")
def analytics_summary():
    user = current_user()
    start, end = range_from_query(default_days=30)
    return jsonify({"data": analytics_service.summary(user, start, end, today=client_today())})
