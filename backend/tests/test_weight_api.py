"""Weight entry endpoint tests."""
from app.models import WeightEntry


def test_average_of_two_readings(client, user):
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 80.0, "evening_weight": 81.0},
    )
    assert response.status_code == 201
    assert response.get_json()["data"]["average_weight_kg"] == 80.5


def test_morning_only_average(client, user):
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 79.4},
    )
    assert response.get_json()["data"]["average_weight_kg"] == 79.4


def test_evening_only_average(client, user):
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "evening_weight": 80.6},
    )
    assert response.get_json()["data"]["average_weight_kg"] == 80.6


def test_entry_with_no_weights_is_rejected(client, user):
    response = client.post("/api/v1/weight-entries", json={"entry_date": "2026-07-01"})
    assert response.status_code == 422
    assert WeightEntry.query.count() == 0


def test_only_one_entry_per_date(client, user):
    client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 80.0},
    )
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 79.5},
    )
    assert response.status_code == 200
    assert WeightEntry.query.count() == 1
    assert float(WeightEntry.query.first().morning_weight_kg) == 79.5


def test_by_date_put_upserts_and_fields_stay_independent(client, user):
    client.put(
        "/api/v1/weight-entries/by-date/2026-07-02", json={"morning_weight": 80.0}
    )
    response = client.put(
        "/api/v1/weight-entries/by-date/2026-07-02",
        json={"morning_weight": 80.0, "evening_weight": 81.2},
    )
    data = response.get_json()["data"]
    assert data["morning_weight_kg"] == 80.0
    assert data["evening_weight_kg"] == 81.2
    assert data["average_weight_kg"] == 80.6


def test_imperial_input_is_stored_as_kilograms(client, user):
    client.put("/api/v1/profile", json={
        "name": "Imperial", "age": 30, "sex": "male", "height_feet": 5, "height_inches": 11,
        "weight": 176.37, "preferred_unit_system": "imperial", "activity_level": "sedentary",
    })
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 176.37},
    )
    data = response.get_json()["data"]
    assert round(data["average_weight_kg"]) == 80
    assert round(data["average_weight"]) == 176  # returned in pounds


def test_saving_a_weight_updates_the_profile_and_maintenance(client, user):
    before = client.get("/api/v1/maintenance").get_json()["data"]["active_maintenance_calories"]
    client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 78.0, "evening_weight": 78.0},
    )
    after = client.get("/api/v1/maintenance").get_json()["data"]
    assert after["current_weight_kg"] == 78.0
    assert after["active_maintenance_calories"] != before


def test_delete_a_weight_entry(client, user):
    entry_id = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 80.0},
    ).get_json()["data"]["id"]
    assert client.delete(f"/api/v1/weight-entries/{entry_id}").status_code == 200
    assert WeightEntry.query.count() == 0


def test_implausible_weight_is_rejected(client, user):
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": 900},
    )
    assert response.status_code == 422


def test_negative_weight_is_rejected(client, user):
    response = client.post(
        "/api/v1/weight-entries",
        json={"entry_date": "2026-07-01", "morning_weight": -5},
    )
    assert response.status_code == 422
