from __future__ import annotations

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class MaintenanceHistory(db.Model):
    """Append-only log written whenever the active maintenance target changes."""

    __tablename__ = "maintenance_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    effective_date = mapped_column(Date, nullable=False, index=True)

    calculated_maintenance_calories: Mapped[int] = mapped_column(Integer, nullable=False)
    manual_maintenance_calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active_maintenance_calories: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    activity_level: Mapped[str] = mapped_column(String(32), nullable=False)

    created_at = mapped_column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="maintenance_history")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MaintenanceHistory {self.effective_date} {self.active_maintenance_calories}>"
