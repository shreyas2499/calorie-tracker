"""Profile and maintenance endpoint tests."""
from app.models import MaintenanceHistory, User


def test_health_check_returns_ok(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_profile_returns_a_helpful_error_before_seeding(client):
    response = client.get("/api/v1/profile")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "PROFILE_NOT_FOUND"


def test_create_profile_calculates_maintenance(client):
    response = client.post(
        "/api/v1/profile",
        json={
            "name": "Shreyas",
            "age": 30,
            "sex": "male",
            "height": 180,
            "weight": 80,
            "preferred_unit_system": "metric",
            "activity_level": "moderately_active",
        },
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    # BMR 1780 * 1.55 = 2759
    assert data["calculated_maintenance_calories"] == 2759
    assert data["active_maintenance_calories"] == 2759


def test_creating_a_second_profile_conflicts(client, user):
    response = client.post(
        "/api/v1/profile",
        json={
            "name": "Another",
            "age": 30,
            "sex": "male",
            "height": 180,
            "weight": 80,
            "activity_level": "sedentary",
        },
    )
    assert response.status_code == 409


def test_imperial_profile_is_converted_to_metric(client):
    response = client.post(
        "/api/v1/profile",
        json={
            "name": "Imperial",
            "age": 30,
            "sex": "male",
            "height_feet": 5,
            "height_inches": 11,
            "weight": 176.37,
            "preferred_unit_system": "imperial",
            "activity_level": "sedentary",
        },
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert round(data["height_cm"]) == 180
    assert round(data["current_weight_kg"]) == 80
    assert round(data["current_weight"]) == 176  # displayed back in pounds


def test_updating_activity_level_recalculates_maintenance(client, user):
    payload = {
        "name": user.name,
        "age": user.age,
        "sex": user.sex,
        "height": 180,
        "weight": 80,
        "activity_level": "sedentary",
    }
    response = client.put("/api/v1/profile", json=payload)
    assert response.status_code == 200
    assert response.get_json()["data"]["calculated_maintenance_calories"] == round(1780 * 1.2)


def test_manual_override_becomes_the_active_target(client, user):
    response = client.post(
        "/api/v1/maintenance/recalculate", json={"manual_maintenance_calories": 2400}
    )
    data = response.get_json()["data"]
    assert data["calculated_maintenance_calories"] == 2759
    assert data["manual_maintenance_calories"] == 2400
    assert data["active_maintenance_calories"] == 2400
    assert data["is_manual_override"] is True


def test_clearing_the_override_restores_the_calculated_value(client, user):
    client.post("/api/v1/maintenance/recalculate", json={"manual_maintenance_calories": 2400})
    response = client.post(
        "/api/v1/maintenance/recalculate", json={"manual_maintenance_calories": None}
    )
    data = response.get_json()["data"]
    assert data["active_maintenance_calories"] == 2759
    assert data["is_manual_override"] is False


def test_maintenance_history_records_each_change(client, user):
    client.post("/api/v1/maintenance/recalculate", json={"manual_maintenance_calories": 2400})
    response = client.get("/api/v1/maintenance/history")
    rows = response.get_json()["data"]
    assert len(rows) >= 2
    assert rows[0]["active_maintenance_calories"] == 2400


def test_profile_validation_returns_field_errors(client):
    response = client.post(
        "/api/v1/profile",
        json={"name": "X", "age": 5, "sex": "male", "height": 180, "weight": 80,
              "activity_level": "sedentary"},
    )
    assert response.status_code == 422
    body = response.get_json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "age" in body["error"]["fields"]


def test_out_of_range_height_is_rejected(client):
    response = client.post(
        "/api/v1/profile",
        json={"name": "X", "age": 30, "sex": "male", "height": 300, "weight": 80,
              "activity_level": "sedentary"},
    )
    assert response.status_code == 422
