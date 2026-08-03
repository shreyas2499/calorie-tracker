"""Flask application factory."""
from __future__ import annotations

import logging
import sys

from flask import Flask, jsonify

from app.config import ConfigError, build_config
from app.errors import register_error_handlers
from app.extensions import cors, db, migrate


def create_app(config_overrides: dict | None = None) -> Flask:
    app = Flask(__name__)

    try:
        app.config.from_object(build_config(config_overrides))
    except ConfigError as exc:
        # Fail loudly at boot rather than 500-ing on the first request.
        print(f"[startup error] {exc}", file=sys.stderr)
        raise

    _configure_logging(app)

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    # Imported for their side effect: registering mappers with SQLAlchemy.
    from app import models  # noqa: F401
    from app.cli import register_cli
    from app.routes import register_blueprints

    register_blueprints(app)
    register_error_handlers(app)
    register_cli(app)

    @app.get("/")
    def index():
        return jsonify(
            {
                "name": "Calorie & Weight Tracker API",
                "version": "1.0.0",
                "health": "/api/v1/health",
            }
        )

    app.logger.info(
        "App started env=%s cors_origins=%s", app.config.get("ENV_NAME"), app.config["CORS_ORIGINS"]
    )
    return app


def _configure_logging(app: Flask) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
    )
    app.logger.handlers = [handler]
    app.logger.setLevel(logging.DEBUG if app.config.get("DEBUG") else logging.INFO)
