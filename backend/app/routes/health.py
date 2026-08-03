from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api/v1")


@health_bp.get("/health")
def health():
    """Railway health-check target. Intentionally does not touch the database."""
    return jsonify({"status": "ok"})
