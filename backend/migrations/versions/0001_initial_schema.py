"""Initial schema: users, calorie_entries, weight_entries, maintenance_history

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-03

"""
import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("sex", sa.String(length=16), nullable=False),
        sa.Column("height_cm", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("current_weight_kg", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("preferred_unit_system", sa.String(length=16), nullable=False),
        sa.Column("activity_level", sa.String(length=32), nullable=False),
        sa.Column("calculated_maintenance_calories", sa.Integer(), nullable=False),
        sa.Column("manual_maintenance_calories", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "calorie_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("calories_consumed", sa.Integer(), nullable=False),
        sa.Column("calories_burned", sa.Integer(), nullable=False),
        sa.Column("net_calories", sa.Integer(), nullable=False),
        sa.Column("maintenance_calories", sa.Integer(), nullable=False),
        sa.Column("calorie_balance", sa.Integer(), nullable=False),
        sa.Column("estimated_weight_change_kg", sa.Numeric(precision=6, scale=4), nullable=False),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "entry_date", name="uq_calorie_entry_user_date"),
    )
    op.create_index(op.f("ix_calorie_entries_entry_date"), "calorie_entries", ["entry_date"])
    op.create_index(op.f("ix_calorie_entries_user_id"), "calorie_entries", ["user_id"])

    op.create_table(
        "weight_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("morning_weight_kg", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("evening_weight_kg", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("average_weight_kg", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "entry_date", name="uq_weight_entry_user_date"),
    )
    op.create_index(op.f("ix_weight_entries_entry_date"), "weight_entries", ["entry_date"])
    op.create_index(op.f("ix_weight_entries_user_id"), "weight_entries", ["user_id"])

    op.create_table(
        "maintenance_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("calculated_maintenance_calories", sa.Integer(), nullable=False),
        sa.Column("manual_maintenance_calories", sa.Integer(), nullable=True),
        sa.Column("active_maintenance_calories", sa.Integer(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("activity_level", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_maintenance_history_effective_date"), "maintenance_history", ["effective_date"])
    op.create_index(op.f("ix_maintenance_history_user_id"), "maintenance_history", ["user_id"])


def downgrade():
    op.drop_table("maintenance_history")
    op.drop_table("weight_entries")
    op.drop_table("calorie_entries")
    op.drop_table("users")
