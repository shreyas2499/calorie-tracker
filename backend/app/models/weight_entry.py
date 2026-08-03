from __future__ import annotations

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db


class WeightEntry(db.Model):
    __tablename__ = "weight_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_weight_entry_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_date = mapped_column(Date, nullable=False, index=True)

    morning_weight_kg: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    evening_weight_kg: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    average_weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at = mapped_column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="weight_entries")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WeightEntry {self.entry_date} avg={self.average_weight_kg}>"
