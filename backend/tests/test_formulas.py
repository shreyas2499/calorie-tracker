"""Unit tests for the pure calculation layer (no database required)."""
from datetime import date

import pytest

from app.domain import ActivityLevel, Sex
from app.services import formulas


# --------------------------------------------------------------------------- #
# BMR / maintenance
# --------------------------------------------------------------------------- #

def test_bmr_for_men_uses_plus_five():
    # 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5
    assert formulas.calculate_bmr(80, 180, 30, Sex.MALE) == pytest.approx(1780.0)


def test_bmr_for_women_uses_minus_161():
    # 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161
    assert formulas.calculate_bmr(65, 165, 30, Sex.FEMALE) == pytest.approx(1370.25)


@pytest.mark.parametrize(
    "level,multiplier",
    [
        (ActivityLevel.SEDENTARY, 1.2),
        (ActivityLevel.LIGHTLY_ACTIVE, 1.375),
        (ActivityLevel.MODERATELY_ACTIVE, 1.55),
        (ActivityLevel.VERY_ACTIVE, 1.725),
        (ActivityLevel.EXTRA_ACTIVE, 1.9),
    ],
)
def test_maintenance_applies_each_activity_multiplier(level, multiplier):
    expected = round(1780.0 * multiplier)
    assert formulas.calculate_maintenance_calories(80, 180, 30, Sex.MALE, level) == expected


def test_maintenance_is_rounded_to_whole_calories():
    result = formulas.calculate_maintenance_calories(65, 165, 30, Sex.FEMALE, ActivityLevel.LIGHTLY_ACTIVE)
    assert result == round(1370.25 * 1.375)
    assert isinstance(result, int)


def test_unknown_activity_level_falls_back_to_sedentary():
    assert formulas.activity_multiplier("not_a_level") == 1.2


def test_manual_override_wins_when_present():
    assert formulas.resolve_active_maintenance(2400, 2200) == 2200


def test_calculated_value_used_when_no_override():
    assert formulas.resolve_active_maintenance(2400, None) == 2400


def test_zero_manual_override_is_not_treated_as_missing():
    assert formulas.resolve_active_maintenance(2400, 0) == 0


# --------------------------------------------------------------------------- #
# Daily calories
# --------------------------------------------------------------------------- #

def test_net_calories_subtracts_burned_from_consumed():
    assert formulas.calculate_net_calories(2200, 500) == 1700


def test_deficit_is_negative_balance():
    balance = formulas.calculate_calorie_balance(1700, 2400)
    assert balance == -700
    assert formulas.balance_status(balance) == "deficit"
    assert formulas.balance_label(balance) == "Deficit"


def test_surplus_is_positive_balance():
    balance = formulas.calculate_calorie_balance(3000, 2400)
    assert balance == 600
    assert formulas.balance_status(balance) == "surplus"
    assert formulas.balance_label(balance) == "Surplus"


def test_near_zero_balance_reads_as_maintenance():
    assert formulas.balance_status(0) == "at_maintenance"
    assert formulas.balance_status(-50) == "at_maintenance"
    assert formulas.balance_status(50) == "at_maintenance"
    assert formulas.balance_status(51) == "surplus"
    assert formulas.balance_status(-51) == "deficit"


def test_estimated_weight_change_uses_7700_kcal_per_kg():
    assert formulas.estimate_weight_change_kg(-7700) == -1.0
    assert formulas.estimate_weight_change_kg(3850) == 0.5


# --------------------------------------------------------------------------- #
# Weight
# --------------------------------------------------------------------------- #

def test_average_weight_with_both_values():
    assert formulas.calculate_average_weight(80.0, 81.0) == 80.5


def test_average_weight_with_only_morning_value():
    assert formulas.calculate_average_weight(80.0, None) == 80.0


def test_average_weight_with_only_evening_value():
    assert formulas.calculate_average_weight(None, 81.4) == 81.4


def test_average_weight_with_no_values_is_none():
    assert formulas.calculate_average_weight(None, None) is None


def test_rolling_average_uses_a_trailing_seven_day_window():
    values = [float(v) for v in range(1, 11)]  # 1..10
    result = formulas.rolling_average(values, window=7)
    assert result[0] == 1.0
    assert result[6] == pytest.approx(4.0)   # mean(1..7)
    assert result[9] == pytest.approx(7.0)   # mean(4..10)


def test_rolling_average_skips_missing_days():
    values = [80.0, None, None, 81.0]
    result = formulas.rolling_average(values, window=7)
    assert result == [80.0, 80.0, 80.0, 80.5]


def test_rolling_average_is_none_until_first_reading():
    assert formulas.rolling_average([None, None, 70.0], window=7) == [None, None, 70.0]


def test_percent_change():
    assert formulas.percent_change(80.0, 78.0) == -2.5
    assert formulas.percent_change(None, 78.0) is None
    assert formulas.percent_change(0, 78.0) is None


# --------------------------------------------------------------------------- #
# Streaks and summaries
# --------------------------------------------------------------------------- #

def _days(*day_numbers):
    return {date(2026, 6, day) for day in day_numbers}


def test_current_streak_counts_back_from_today():
    result = formulas.calculate_streaks(
        _days(8, 9, 10), date(2026, 6, 1), date(2026, 6, 10), date(2026, 6, 10)
    )
    assert result["current_streak"] == 3


def test_current_streak_tolerates_an_untracked_today():
    result = formulas.calculate_streaks(
        _days(8, 9), date(2026, 6, 1), date(2026, 6, 10), date(2026, 6, 10)
    )
    assert result["current_streak"] == 2


def test_current_streak_is_zero_after_a_two_day_gap():
    result = formulas.calculate_streaks(
        _days(1, 2, 3), date(2026, 6, 1), date(2026, 6, 10), date(2026, 6, 10)
    )
    assert result["current_streak"] == 0


def test_longest_streak_finds_the_best_run_in_the_window():
    result = formulas.calculate_streaks(
        _days(1, 2, 3, 4, 7, 9, 10), date(2026, 6, 1), date(2026, 6, 10), date(2026, 6, 10)
    )
    assert result["longest_streak"] == 4


def test_date_series_is_inclusive_of_both_ends():
    series = formulas.date_series(date(2026, 6, 1), date(2026, 6, 3))
    assert series == [date(2026, 6, 1), date(2026, 6, 2), date(2026, 6, 3)]


def test_average_of_empty_list_is_none():
    assert formulas.average([]) is None
    assert formulas.average([1, 2, 3, 4]) == 2.5


def test_summary_text_reports_a_decrease_and_a_deficit():
    text = formulas.build_summary_text(30, -1.8, "kg", -420.0)
    assert text == (
        "Over the last 30 days, your average weight decreased by 1.8 kg and "
        "your average daily calorie balance was a 420-calorie deficit."
    )


def test_summary_text_reports_an_increase_and_a_surplus():
    text = formulas.build_summary_text(7, 0.4, "lb", 310.0)
    assert "increased by 0.4 lb" in text
    assert "310-calorie surplus" in text


def test_summary_text_handles_missing_data():
    text = formulas.build_summary_text(14, None, "kg", None)
    assert "no weight entries were recorded" in text
    assert "no calorie entries were recorded" in text


def test_summary_text_calls_out_a_single_weight_reading():
    text = formulas.build_summary_text(30, 0.0, "kg", -420.0, weight_readings=1)
    assert "a single weight entry was recorded" in text
    assert "unchanged" not in text


def test_summary_text_never_claims_causation():
    text = formulas.build_summary_text(30, -1.8, "kg", -420.0)
    for word in ("because", "caused", "due to", "resulted in"):
        assert word not in text.lower()
