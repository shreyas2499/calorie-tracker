"""Date parsing and range-resolution tests."""
from datetime import date

import pytest

from app.utils import dates


def test_parse_date_accepts_iso_strings():
    assert dates.parse_date("2026-07-15") == date(2026, 7, 15)


def test_parse_date_passes_through_date_objects():
    assert dates.parse_date(date(2026, 7, 15)) == date(2026, 7, 15)


def test_parse_date_returns_none_for_empty_input():
    assert dates.parse_date(None) is None
    assert dates.parse_date("") is None


def test_parse_date_rejects_other_formats():
    with pytest.raises(ValueError):
        dates.parse_date("15/07/2026")


def test_range_preset_windows_are_inclusive():
    start, end = dates.resolve_range("7d", reference_date=date(2026, 7, 15))
    assert (start, end) == (date(2026, 7, 9), date(2026, 7, 15))
    assert len(dates.date_series(start, end)) == 7


def test_range_all_time_has_no_start():
    start, end = dates.resolve_range("all", reference_date=date(2026, 7, 15))
    assert start is None
    assert end == date(2026, 7, 15)


def test_explicit_dates_take_precedence_over_the_preset():
    start, end = dates.resolve_range(
        "7d", "2026-07-01", "2026-07-31", reference_date=date(2026, 7, 15)
    )
    assert (start, end) == (date(2026, 7, 1), date(2026, 7, 31))


def test_reversed_custom_range_is_swapped():
    start, end = dates.resolve_range(None, "2026-07-31", "2026-07-01")
    assert (start, end) == (date(2026, 7, 1), date(2026, 7, 31))


def test_unknown_preset_falls_back_to_the_default_window():
    start, end = dates.resolve_range("bogus", reference_date=date(2026, 7, 15), default_days=30)
    assert (end - start).days == 29
