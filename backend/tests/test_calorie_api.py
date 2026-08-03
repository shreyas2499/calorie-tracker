"""Calorie entry endpoint tests."""
from app.models import CalorieEntry


def test_create_entry_computes_derived_fields(client, user):
    response = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-01", "calories_consumed": 2200, "calories_burned": 500},
    )
    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["net_calories"] == 1700
    assert data["maintenance_calories"] == 2759
    assert data["calorie_balance"] == 1700 - 2759
    assert data["status"] == "deficit"
    assert data["status_label"] == "Deficit"
    assert data["estimated_weight_change_kg"] == round((1700 - 2759) / 7700, 4)


def test_surplus_is_labelled_correctly(client, user):
    response = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-01", "calories_consumed": 3500, "calories_burned": 200},
    )
    assert response.get_json()["data"]["status_label"] == "Surplus"


def test_second_post_for_the_same_date_updates_instead_of_duplicating(client, user):
    client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-01", "calories_consumed": 2000, "calories_burned": 0},
    )
    response = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-01", "calories_consumed": 2500, "calories_burned": 300},
    )
    assert response.status_code == 200
    assert response.get_json()["created"] is False
    assert CalorieEntry.query.filter_by(user_id=user.id).count() == 1
    assert CalorieEntry.query.first().calories_consumed == 2500


def test_by_date_put_creates_then_updates(client, user):
    created = client.put(
        "/api/v1/calorie-entries/by-date/2026-07-02",
        json={"calories_consumed": 1800, "calories_burned": 100},
    )
    assert created.status_code == 201
    updated = client.put(
        "/api/v1/calorie-entries/by-date/2026-07-02",
        json={"calories_consumed": 1900, "calories_burned": 150, "notes": "long walk"},
    )
    assert updated.status_code == 200
    data = updated.get_json()["data"]
    assert data["calories_consumed"] == 1900
    assert data["notes"] == "long walk"
    assert CalorieEntry.query.count() == 1


def test_by_date_get_returns_null_when_no_entry_exists(client, user):
    response = client.get("/api/v1/calorie-entries/by-date/2026-07-09")
    assert response.status_code == 200
    assert response.get_json()["data"] is None


def test_historical_maintenance_snapshot_is_preserved(client, user):
    client.put(
        "/api/v1/calorie-entries/by-date/2026-07-01",
        json={"calories_consumed": 2000, "calories_burned": 0},
    )
    # Change the active target after the fact.
    client.post("/api/v1/maintenance/recalculate", json={"manual_maintenance_calories": 2000})

    old = client.get("/api/v1/calorie-entries/by-date/2026-07-01").get_json()["data"]
    assert old["maintenance_calories"] == 2759  # unchanged

    new = client.put(
        "/api/v1/calorie-entries/by-date/2026-07-05",
        json={"calories_consumed": 2000, "calories_burned": 0},
    ).get_json()["data"]
    assert new["maintenance_calories"] == 2000  # uses the new target


def test_update_and_delete_an_entry(client, user):
    entry_id = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-03", "calories_consumed": 2000, "calories_burned": 0},
    ).get_json()["data"]["id"]

    updated = client.put(
        f"/api/v1/calorie-entries/{entry_id}",
        json={"entry_date": "2026-07-03", "calories_consumed": 2100, "calories_burned": 50},
    )
    assert updated.get_json()["data"]["calories_consumed"] == 2100

    deleted = client.delete(f"/api/v1/calorie-entries/{entry_id}")
    assert deleted.status_code == 200
    assert CalorieEntry.query.count() == 0


def test_deleting_a_missing_entry_returns_404(client, user):
    assert client.delete("/api/v1/calorie-entries/999").status_code == 404


def test_negative_calories_are_rejected(client, user):
    response = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-01", "calories_consumed": -10, "calories_burned": 0},
    )
    assert response.status_code == 422
    assert "calories_consumed" in response.get_json()["error"]["fields"]


def test_calories_above_the_limit_are_rejected(client, user):
    response = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "2026-07-01", "calories_consumed": 25000, "calories_burned": 0},
    )
    assert response.status_code == 422


def test_notes_longer_than_1000_characters_are_rejected(client, user):
    response = client.post(
        "/api/v1/calorie-entries",
        json={
            "entry_date": "2026-07-01",
            "calories_consumed": 2000,
            "calories_burned": 0,
            "notes": "x" * 1001,
        },
    )
    assert response.status_code == 422


def test_invalid_date_format_is_rejected(client, user):
    response = client.post(
        "/api/v1/calorie-entries",
        json={"entry_date": "01-07-2026", "calories_consumed": 2000, "calories_burned": 0},
    )
    assert response.status_code == 422


def test_list_supports_range_search_and_pagination(client, user):
    for day in range(1, 6):
        client.put(
            f"/api/v1/calorie-entries/by-date/2026-07-0{day}",
            json={"calories_consumed": 2000 + day, "calories_burned": 0,
                  "notes": "rest day" if day == 3 else None},
        )

    listed = client.get(
        "/api/v1/calorie-entries?start_date=2026-07-01&end_date=2026-07-05&per_page=2"
    ).get_json()
    assert listed["pagination"]["total"] == 5
    assert len(listed["items"]) == 2

    searched = client.get(
        "/api/v1/calorie-entries?start_date=2026-07-01&end_date=2026-07-05&search=rest"
    ).get_json()
    assert len(searched["items"]) == 1

    ascending = client.get(
        "/api/v1/calorie-entries?start_date=2026-07-01&end_date=2026-07-05&sort=asc"
    ).get_json()
    assert ascending["items"][0]["entry_date"] == "2026-07-01"


def test_csv_export(client, user):
    client.put(
        "/api/v1/calorie-entries/by-date/2026-07-01",
        json={"calories_consumed": 2000, "calories_burned": 0},
    )
    response = client.get("/api/v1/calorie-entries/export?start_date=2026-07-01&end_date=2026-07-02")
    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    assert "2026-07-01" in response.get_data(as_text=True)
