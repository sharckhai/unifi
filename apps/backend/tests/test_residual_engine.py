"""Restwert-Engine-Tests — Decay, Floor, Klassen-Defaults, Linearität."""

from __future__ import annotations

import pytest

from unifi.residual.engine import compute_residual_value, resolve_lifetime_years
from unifi.residual.schema import CLASS_LIFETIME_YEARS, ResidualConfig, RobotState
from unifi.ucs.schema import UcsDatasheet


@pytest.fixture
def ur5() -> UcsDatasheet:
    return UcsDatasheet(
        model="Universal Robots UR5",
        manufacturer="Universal Robots",
        robot_class="cobot",
        cost_new_eur=35000,
        nominal_picks_lifetime=30000000,
        rated_current_a=6.0,
        rated_torque_nm=150.0,
        rated_cycle_time_s=2.0,
        rated_payload_kg=5.0,
        nominal_lifetime_years=10.0,
    )


@pytest.fixture
def ur5_no_lifetime(ur5: UcsDatasheet) -> UcsDatasheet:
    return ur5.model_copy(update={"nominal_lifetime_years": None})


def test_fresh_robot_returns_cost_new(ur5):
    state = RobotState(age_years=0.0, cumulative_wear_pick_equivalents=0)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.residual_value_eur == pytest.approx(35000)
    assert r.use_consumed_fraction == 0.0
    assert r.age_consumed_fraction == 0.0
    assert r.combined_decay == 0.0
    assert r.floor_active is False


def test_use_fully_consumed_yields_floor(ur5):
    state = RobotState(age_years=2.0, cumulative_wear_pick_equivalents=30_000_000)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.use_consumed_fraction == 1.0
    assert r.combined_decay == 1.0
    assert r.floor_active is True
    assert r.residual_value_eur == pytest.approx(35000 * 0.05)  # 1750 €


def test_age_fully_consumed_yields_floor(ur5):
    state = RobotState(age_years=10.0, cumulative_wear_pick_equivalents=0)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.age_consumed_fraction == 1.0
    assert r.floor_active is True
    assert r.residual_value_eur == pytest.approx(35000 * 0.05)


def test_max_logic_age_dominates(ur5):
    # use=10%, age=60% → combined=60%
    state = RobotState(age_years=6.0, cumulative_wear_pick_equivalents=3_000_000)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.use_consumed_fraction == pytest.approx(0.10)
    assert r.age_consumed_fraction == pytest.approx(0.60)
    assert r.combined_decay == pytest.approx(0.60)
    assert r.residual_value_eur == pytest.approx(35000 * 0.40, rel=1e-6)


def test_max_logic_use_dominates(ur5):
    # use=80%, age=20% → combined=80%
    state = RobotState(age_years=2.0, cumulative_wear_pick_equivalents=24_000_000)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.use_consumed_fraction == pytest.approx(0.80)
    assert r.age_consumed_fraction == pytest.approx(0.20)
    assert r.combined_decay == pytest.approx(0.80)
    assert r.residual_value_eur == pytest.approx(35000 * 0.20, rel=1e-6)


def test_linearity_at_50pct(ur5):
    state = RobotState(age_years=5.0, cumulative_wear_pick_equivalents=0)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.residual_value_eur == pytest.approx(35000 * 0.5, rel=1e-6)


def test_floor_active_just_below_threshold(ur5):
    # Decay=99% → primary = 350 €, Floor = 1750 €
    state = RobotState(age_years=9.9, cumulative_wear_pick_equivalents=0)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.floor_active is True
    assert r.residual_value_eur == pytest.approx(35000 * 0.05)


def test_class_default_lifetime_used_when_datasheet_none(ur5_no_lifetime):
    assert resolve_lifetime_years(ur5_no_lifetime) == CLASS_LIFETIME_YEARS["cobot"]
    state = RobotState(age_years=10.0, cumulative_wear_pick_equivalents=0)
    r = compute_residual_value(datasheet=ur5_no_lifetime, state=state)
    assert r.nominal_lifetime_years_used == 10.0
    assert r.age_consumed_fraction == 1.0


def test_explicit_lifetime_overrides_default(ur5):
    ur5_short = ur5.model_copy(update={"nominal_lifetime_years": 5.0})
    assert resolve_lifetime_years(ur5_short) == 5.0


def test_annualized_depreciation(ur5):
    state = RobotState(age_years=2.0, cumulative_wear_pick_equivalents=6_000_000)
    r = compute_residual_value(datasheet=ur5, state=state)
    expected_residual = 35000 * 0.80
    expected_dep = (35000 - expected_residual) / 2.0
    assert r.residual_value_eur == pytest.approx(expected_residual, rel=1e-6)
    assert r.annualized_depreciation_eur_per_year == pytest.approx(expected_dep, rel=1e-6)


def test_use_fraction_clipped_to_one(ur5):
    """Wear über Lifetime hinaus wird auf 100 % gefloort."""
    state = RobotState(age_years=0.0, cumulative_wear_pick_equivalents=60_000_000)
    r = compute_residual_value(datasheet=ur5, state=state)
    assert r.use_consumed_fraction == 1.0
    assert r.combined_decay == 1.0


def test_degressive_curve_softer_than_linear(ur5):
    state = RobotState(age_years=3.0, cumulative_wear_pick_equivalents=0)  # decay=30%
    linear = compute_residual_value(datasheet=ur5, state=state)
    degressive = compute_residual_value(
        datasheet=ur5, state=state, config=ResidualConfig(use_degressive_curve=True)
    )
    # Degressiv hat bei 30% Decay einen anderen Wert als linear (70% von cost_new).
    # exp(-0.7 * 0.3) ≈ 0.811 → 28371 €. Linear: 24500 €.
    assert degressive.residual_value_eur > linear.residual_value_eur


def test_custom_floor(ur5):
    state = RobotState(age_years=10.0, cumulative_wear_pick_equivalents=0)
    r = compute_residual_value(
        datasheet=ur5, state=state, config=ResidualConfig(residual_floor_pct=0.10)
    )
    assert r.residual_value_eur == pytest.approx(35000 * 0.10)
    assert r.residual_floor_eur == pytest.approx(35000 * 0.10)
