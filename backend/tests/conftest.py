"""Pytest fixtures. The API suite runs against an on-disk SQLite database.

PostgreSQL is the production database; SQLite is used here only so the suite
runs anywhere without extra services. The behaviour under test (unique
constraints, upserts, ordering) is identical on both.
"""
import os
import tempfile

import pytest

from app import create_app
from app.extensions import db as _db
from app.models import ActivityLevel, Sex, UnitSystem, User
from app.services import maintenance_service


@pytest.fixture()
def app():
    handle, path = tempfile.mkstemp(suffix=".sqlite")
    os.close(handle)
    application = create_app(
        {
            "ENV": "testing",
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{path}",
            "SECRET_KEY": "test-secret",
            "CORS_ORIGINS": "http://localhost:3000",
        }
    )
    with application.app_context():
        _db.create_all()
        yield application
        _db.session.remove()
        _db.drop_all()
    os.unlink(path)


@pytest.fixture()
def db(app):
    return _db


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def user(app):
    """A seeded default user: male, 30, 180 cm, 80 kg, moderately active."""
    record = User(
        name="Test User",
        age=30,
        sex=Sex.MALE,
        height_cm=180,
        current_weight_kg=80,
        preferred_unit_system=UnitSystem.METRIC,
        activity_level=ActivityLevel.MODERATELY_ACTIVE,
    )
    _db.session.add(record)
    _db.session.commit()
    maintenance_service.recalculate(record)
    return record
