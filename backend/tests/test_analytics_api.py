"""Dashboard and analytics endpoint tests."""


def _seed(client, days):
    """days: list of (date, consumed, burned, morning, evening)."""
    for entry_date, consumed, burned, morning, evening in days:
        if consumed is not None:
            client.put(
                f"/api/v1/calorie-entries/by-date/{entry_date}",
                json={"calories_consumed": consumed, "calories_burned": burned},
            )
        if morning is not None or evening is not None:
            client.put(
                f"/api/v1/weight-entries/by-date/{entry_date}",
                json={"morning_weight": morning, "evening_weight": evening},
            )


def test_calorie_analytics_returns_a_dense_series(client, user):
    _seed(client, [("2026-07-01", 2000, 0, None, None), ("2026-07-03", 2200, 200, None, None)])
    data = client.get(
        "/api/v1/analytics/calories?start_date=2026-07-01&end_date=2026-07-03"
    ).get_json()["data"]

    assert len(data["points"]) == 3
    assert data["tracked_days"] == 2
    assert data["points"][1]["calories_consumed"] is None
    assert data["points"][1]["status_label"] == "No data recorded"
    assert data["points"][0]["maintenance_calories"] == 2759


def test_weight_analytics_includes_the_rolling_average(client, user):
    _seed(
        client,
        [
            ("2026-07-01", None, None, 80.0, 80.0),
            ("2026-07-02", None, None, 79.0, 79.0),
            ("2026-07-03", None, None, 78.0, 78.0),
        ],
    )
    data = client.get(
        "/api/v1/analytics/weight?start_date=2026-07-01&end_date=2026-07-03"
    ).get_json()["data"]

    assert [point["average_weight"] for point in data["points"]] == [80.0, 79.0, 78.0]
    assert data["points"][2]["rolling_average_7d"] == 79.0
    assert data["unit_label"] == "kg"


def test_summary_reports_change_averages_and_streaks(client, user):
    _seed(
        client,
        [
            ("2026-07-01", 2000, 0, 80.0, 80.0),
            ("2026-07-02", 2100, 100, 79.5, 79.5),
            ("2026-07-03", 2000, 0, 79.0, 79.0),
        ],
    )
    data = client.get(
        "/api/v1/analytics/summary?start_date=2026-07-01&end_date=2026-07-03&today=2026-07-03"
    ).get_json()["data"]

    assert data["starting_average_weight"] == 80.0
    assert data["latest_average_weight"] == 79.0
    assert data["total_weight_change"] == -1.0
    assert data["percent_weight_change"] == -1.25
    assert data["average_calories_consumed"] == 2033.3
    assert data["tracked_days"] == 3
    assert data["missing_days"] == 0
    assert data["current_streak"] == 3
    assert data["longest_streak"] == 3
    assert data["average_balance_label"] == "Deficit"
    assert "decreased by 1.0 kg" in data["summary_text"]


def test_summary_reports_the_dates_of_the_actual_weight_readings(client, user):
    _seed(client, [("2026-07-10", None, None, 80.0, 80.0), ("2026-07-12", None, None, 79.0, 79.0)])
    data = client.get(
        "/api/v1/analytics/summary?start_date=2026-07-01&end_date=2026-07-31"
    ).get_json()["data"]

    # Not the window bounds.
    assert data["starting_weight_date"] == "2026-07-10"
    assert data["latest_weight_date"] == "2026-07-12"
    assert data["start_date"] == "2026-07-01"


def test_summary_counts_missing_days(client, user):
    _seed(client, [("2026-07-01", 2000, 0, None, None)])
    data = client.get(
        "/api/v1/analytics/summary?start_date=2026-07-01&end_date=2026-07-05&today=2026-07-05"
    ).get_json()["data"]
    assert data["total_days"] == 5
    assert data["tracked_days"] == 1
    assert data["missing_days"] == 4
    assert data["current_streak"] == 0


def test_summary_with_no_data_is_safe(client, user):
    data = client.get(
        "/api/v1/analytics/summary?start_date=2026-07-01&end_date=2026-07-05"
    ).get_json()["data"]
    assert data["total_weight_change"] is None
    assert data["average_calorie_balance"] is None
    assert "no weight entries were recorded" in data["summary_text"]


def test_dashboard_returns_todays_entries_and_series(client, user):
    _seed(client, [("2026-07-03", 2000, 300, 79.0, 79.4)])
    data = client.get("/api/v1/dashboard?today=2026-07-03&range_days=7").get_json()["data"]

    assert data["date"] == "2026-07-03"
    assert data["today_calories"]["net_calories"] == 1700
    assert data["today_weight"]["average_weight"] == 79.2
    assert data["latest_weight"]["average_weight"] == 79.2
    assert data["active_maintenance_calories"] == data["today_calories"]["maintenance_calories"]
    assert len(data["calorie_series"]["points"]) == 7
    assert len(data["weight_series"]["points"]) == 7


def test_dashboard_is_empty_but_valid_with_no_data(client, user):
    data = client.get("/api/v1/dashboard?today=2026-07-03").get_json()["data"]
    assert data["today_calories"] is None
    assert data["today_weight"] is None
    assert data["latest_weight"] is None
    assert data["period"]["tracked_days"] == 0
