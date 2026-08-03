"""Date helpers.

Daily record dates are plain ``YYYY-MM-DD`` values supplied by the client in the
user's *local* timezone. The server never derives a daily date from its own
clock for stored records.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

DATE_FORMAT = "%Y-%m-%d"

RANGE_PRESETS = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
    "90d": 90,
    "180d": 180,
    "365d": 365,
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_date(value: str | date | None) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value).strip(), DATE_FORMAT).date()
    except ValueError as exc:
        raise ValueError(f"'{value}' is not a valid date. Use YYYY-MM-DD.") from exc


def format_date(value: date | None) -> str | None:
    return value.strftime(DATE_FORMAT) if value else None


def resolve_range(
    range_key: str | None = None,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
    reference_date: date | None = None,
    default_days: int = 30,
) -> tuple[date | None, date]:
    """Resolve query params into an inclusive ``(start, end)`` window.

    A ``None`` start means "all time". ``reference_date`` should be the user's
    local today, supplied by the client where available.
    """
    today = reference_date or utcnow().date()
    parsed_start = parse_date(start_date)
    parsed_end = parse_date(end_date)

    if parsed_start or parsed_end:
        end = parsed_end or today
        start = parsed_start or (end - timedelta(days=default_days - 1))
        if start > end:
            start, end = end, start
        return start, end

    key = (range_key or "").strip().lower()
    if key in {"all", "all_time", "alltime"}:
        return None, today
    days = RANGE_PRESETS.get(key, default_days)
    return today - timedelta(days=days - 1), today


def date_series(start: date, end: date) -> list[date]:
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]
