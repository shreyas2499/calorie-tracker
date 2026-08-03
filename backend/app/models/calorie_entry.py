from __future__ import annotations

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class CalorieEntry(db.Model):
    __tablename__ = "calorie_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_calorie_entry_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_date = mapped_column(Date, nullable=False, index=True)

    calories_consumed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    calories_burned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    net_calories: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Snapshot of the active maintenance target on this date, so historical rows
    # do not change when the user later updates their target.
    maintenance_calories: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    calorie_balance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_weight_change_kg: Mapped[float] = mapped_column(
        Numeric(6, 4), nullable=False, default=0
    )
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at = mapped_column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="calorie_entries")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CalorieEntry {self.entry_date} net={self.net_calories}>"
