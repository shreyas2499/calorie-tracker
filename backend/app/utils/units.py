"""Single source of truth for unit conversion.

Internally the application always stores height in centimetres and weight in
kilograms. Conversion happens only at the API boundary.
"""
from __future__ import annotations

KG_PER_LB = 0.45359237
CM_PER_INCH = 2.54
INCHES_PER_FOOT = 12
KCAL_PER_KG_OF_BODY_MASS = 7700

METRIC = "metric"
IMPERIAL = "imperial"
UNIT_SYSTEMS = (METRIC, IMPERIAL)


def lb_to_kg(pounds: float) -> float:
    return pounds * KG_PER_LB


def kg_to_lb(kilograms: float) -> float:
    return kilograms / KG_PER_LB


def inches_to_cm(inches: float) -> float:
    return inches * CM_PER_INCH


def cm_to_inches(centimetres: float) -> float:
    return centimetres / CM_PER_INCH


def feet_inches_to_cm(feet: float, inches: float = 0.0) -> float:
    return inches_to_cm(feet * INCHES_PER_FOOT + inches)


def cm_to_feet_inches(centimetres: float) -> tuple[int, float]:
    total_inches = cm_to_inches(centimetres)
    feet = int(total_inches // INCHES_PER_FOOT)
    inches = round(total_inches - feet * INCHES_PER_FOOT, 1)
    if inches >= INCHES_PER_FOOT:  # rounding edge case, e.g. 11.96 -> 12.0
        feet += 1
        inches = 0.0
    return feet, inches


def weight_to_kg(value: float, unit_system: str) -> float:
    """Convert an inbound weight expressed in the user's unit system to kg."""
    return lb_to_kg(value) if unit_system == IMPERIAL else float(value)


def weight_from_kg(value_kg: float | None, unit_system: str, ndigits: int = 2) -> float | None:
    """Convert a stored kg weight into the user's unit system for display."""
    if value_kg is None:
        return None
    converted = kg_to_lb(value_kg) if unit_system == IMPERIAL else value_kg
    return round(converted, ndigits)


def height_to_cm(value: float, unit_system: str, inches: float = 0.0) -> float:
    """``value`` is centimetres for metric, feet for imperial."""
    return feet_inches_to_cm(value, inches) if unit_system == IMPERIAL else float(value)


def weight_unit_label(unit_system: str) -> str:
    return "lb" if unit_system == IMPERIAL else "kg"


def height_unit_label(unit_system: str) -> str:
    return "ft/in" if unit_system == IMPERIAL else "cm"
