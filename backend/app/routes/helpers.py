"""Shared request helpers for route handlers."""
from __future__ import annotations

from datetime import date

from flask import Response, request

from app.errors import NotFoundError, ValidationError
from app.models import User
from app.utils.dates import parse_date, resolve_range, utcnow

MAX_PAGE_SIZE = 200


def current_user() -> User:
    """Single-user mode: resolve the one seeded user.

    When authentication is added this becomes a token lookup; every table
    already carries ``user_id`` so nothing else has to change.
    """
    user = User.query.order_by(User.id.asc()).first()
    if user is None:
        raise NotFoundError(
            "No user profile exists yet. Run `flask seed-default-user` or create one "
            "via POST /api/v1/profile.",
            code="PROFILE_NOT_FOUND",
        )
    return user


def json_body() -> dict:
    body = request.get_json(silent=True)
    if body is None:
        raise ValidationError(message="A JSON request body is required.")
    if not isinstance(body, dict):
        raise ValidationError(message="The request body must be a JSON object.")
    return body


def client_today() -> date:
    """The user's local date, supplied by the client; never derived server-side."""
    raw = request.args.get("today") or request.args.get("local_date")
    if raw:
        try:
            parsed = parse_date(raw)
        except ValueError as exc:
            raise ValidationError(fields={"today": str(exc)}) from exc
        if parsed:
            return parsed
    return utcnow().date()


def range_from_query(default_days: int = 30) -> tuple[date | None, date]:
    try:
        return resolve_range(
            range_key=request.args.get("range"),
            start_date=request.args.get("start_date"),
            end_date=request.args.get("end_date"),
            reference_date=client_today(),
            default_days=default_days,
        )
    except ValueError as exc:
        raise ValidationError(fields={"start_date": str(exc)}) from exc


def pagination_args() -> tuple[int, int]:
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = int(request.args.get("per_page", 25))
    except (TypeError, ValueError) as exc:
        raise ValidationError(fields={"page": "Page and per_page must be integers."}) from exc
    return page, max(1, min(per_page, MAX_PAGE_SIZE))


def paginate(query, page: int, per_page: int, serializer) -> dict:
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [serializer(item) for item in pagination.items],
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        },
    }


def csv_response(filename: str, header: list[str], rows: list[list]) -> Response:
    import csv
    import io

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
