"""User model.

Domain constants live in ``app.domain`` and the maths lives in
``app.services.formulas``; this module only owns persistence.

Authentication is not implemented in v1, but ``email``/``password_hash`` and the
``user_id`` foreign keys on every table are in place so it can be added without
a data migration.
"""

from __future__ import annotations

from sqlalchemy import Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain import (
    ACTIVITY_LABELS,
    ACTIVITY_MULTIPLIERS,
    ActivityLevel,
    Sex,
    UnitSystem,
)
from app.extensions import db
from app.services.formulas import activity_multiplier, resolve_active_maintenance


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[str] = mapped_column(String(16), nullable=False)
    height_cm: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    current_weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    preferred_unit_system: Mapped[str] = mapped_column(
        String(16), nullable=False, default=UnitSystem.METRIC
    )
    activity_level: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ActivityLevel.SEDENTARY
    )

    calculated_maintenance_calories: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    manual_maintenance_calories: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at = mapped_column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    calorie_entries = relationship(
        "CalorieEntry", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    weight_entries = relationship(
        "WeightEntry", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    maintenance_history = relationship(
        "MaintenanceHistory", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )

    @property
    def activity_multiplier(self) -> float:
        return activity_multiplier(self.activity_level)

    @property
    def activity_level_label(self) -> str:
        return ACTIVITY_LABELS.get(self.activity_level, self.activity_level)

    @property
    def active_maintenance_calories(self) -> int:
        """A manual override always wins when present."""
        return resolve_active_maintenance(
            self.calculated_maintenance_calories, self.manual_maintenance_calories
        )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User {self.id} {self.name}>"
