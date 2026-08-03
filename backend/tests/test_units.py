"""Unit-conversion tests."""
import pytest

from app.utils import units


def test_pounds_convert_to_kilograms():
    assert units.lb_to_kg(220.462) == pytest.approx(100.0, abs=0.001)


def test_kilograms_convert_to_pounds():
    assert units.kg_to_lb(100.0) == pytest.approx(220.462, abs=0.001)


def test_weight_round_trip_is_lossless():
    assert units.lb_to_kg(units.kg_to_lb(82.35)) == pytest.approx(82.35)


def test_feet_and_inches_convert_to_centimetres():
    assert units.feet_inches_to_cm(5, 10) == pytest.approx(177.8)


def test_centimetres_convert_to_feet_and_inches():
    assert units.cm_to_feet_inches(177.8) == (5, 10.0)


def test_feet_and_inches_rounding_edge_case_carries_over():
    feet, inches = units.cm_to_feet_inches(182.88)  # exactly 6'0"
    assert (feet, inches) == (6, 0.0)


def test_weight_to_kg_respects_the_unit_system():
    assert units.weight_to_kg(80, units.METRIC) == 80
    assert units.weight_to_kg(176.37, units.IMPERIAL) == pytest.approx(80.0, abs=0.01)


def test_weight_from_kg_respects_the_unit_system():
    assert units.weight_from_kg(80.0, units.METRIC) == 80.0
    assert units.weight_from_kg(80.0, units.IMPERIAL) == pytest.approx(176.37, abs=0.01)


def test_weight_from_kg_passes_through_none():
    assert units.weight_from_kg(None, units.IMPERIAL) is None


def test_height_to_cm_respects_the_unit_system():
    assert units.height_to_cm(180, units.METRIC) == 180.0
    assert units.height_to_cm(5, units.IMPERIAL, 11) == pytest.approx(180.34)


def test_unit_labels():
    assert units.weight_unit_label(units.IMPERIAL) == "lb"
    assert units.weight_unit_label(units.METRIC) == "kg"
