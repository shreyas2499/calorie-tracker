"""Flask CLI commands."""
from __future__ import annotations

import click
from flask import Flask

from app.extensions import db
from app.models import ActivityLevel, Sex, UnitSystem, User
from app.services import maintenance_service

DEFAULT_USER = {
    "name": "Me",
    "age": 30,
    "sex": Sex.MALE,
    "height_cm": 175.0,
    "current_weight_kg": 75.0,
    "preferred_unit_system": UnitSystem.METRIC,
    "activity_level": ActivityLevel.MODERATELY_ACTIVE,
}


def register_cli(app: Flask) -> None:
    @app.cli.command("seed-default-user")
    @click.option("--name", default=DEFAULT_USER["name"], show_default=True)
    def seed_default_user(name: str) -> None:
        """Create the single default user. Safe to run repeatedly."""
        existing = User.query.order_by(User.id.asc()).first()
        if existing is not None:
            click.echo(f"User already exists (id={existing.id}, name={existing.name}). Nothing to do.")
            return

        user = User(**{**DEFAULT_USER, "name": name})
        db.session.add(user)
        db.session.commit()
        maintenance_service.recalculate(user)
        click.echo(
            f"Created default user id={user.id} name={user.name} "
            f"maintenance={user.active_maintenance_calories} kcal. "
            "Update the details on the /profile page."
        )

    @app.cli.command("show-config")
    def show_config() -> None:
        """Print the resolved (redacted) configuration - useful on Railway."""
        uri = app.config["SQLALCHEMY_DATABASE_URI"]
        if "@" in uri:
            uri = uri.split("@", 1)[0].rsplit(":", 1)[0] + ":***@" + uri.split("@", 1)[1]
        click.echo(f"env:           {app.config.get('ENV_NAME')}")
        click.echo(f"database:      {uri}")
        click.echo(f"cors_origins:  {app.config.get('CORS_ORIGINS')}")
