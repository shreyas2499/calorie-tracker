"""Consistent JSON error responses for the whole API."""
from __future__ import annotations

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """Base class for errors that should be rendered as a JSON error body."""

    status_code = 400
    code = "BAD_REQUEST"
    message = "The request could not be processed."

    def __init__(self, message: str | None = None, fields: dict | None = None, code: str | None = None):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if code:
            self.code = code
        self.fields = fields or {}

    def to_dict(self) -> dict:
        error: dict = {"code": self.code, "message": self.message}
        if self.fields:
            error["fields"] = self.fields
        return {"error": error}


class ValidationError(ApiError):
    status_code = 422
    code = "VALIDATION_ERROR"
    message = "The submitted data is invalid."


class NotFoundError(ApiError):
    status_code = 404
    code = "NOT_FOUND"
    message = "The requested resource was not found."


class ConflictError(ApiError):
    status_code = 409
    code = "CONFLICT"
    message = "The resource already exists."


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def _handle_api_error(exc: ApiError):
        return jsonify(exc.to_dict()), exc.status_code

    @app.errorhandler(HTTPException)
    def _handle_http_error(exc: HTTPException):
        payload = {
            "error": {
                "code": (exc.name or "HTTP_ERROR").upper().replace(" ", "_"),
                "message": exc.description or "Request failed.",
            }
        }
        return jsonify(payload), exc.code or 500

    @app.errorhandler(Exception)
    def _handle_unexpected(exc: Exception):
        app.logger.exception("Unhandled application error: %s", exc)
        payload = {
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
            }
        }
        return jsonify(payload), 500
