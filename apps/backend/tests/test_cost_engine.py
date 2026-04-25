"""Cost-per-Pick-Engine-Tests — Worked Example, Komponenten-Skalierung, Defaults."""

from __future__ import annotations

import pytest

from unifi.cost.engine import compute_cost_per_pick, resolve_power_w
from unifi.cost.schema import (
    CLASS_POWER_DEFAULT_W,
    SECONDS_PER_YEAR,
    FinanceConfig,
    OperatingProfile,
)
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
        nominal_duty_cycle=0.8,
        maintenance_cost_pct_per_year=0.05,
        power_consumption_w=150.0,
    )


@pytest.fixture
def industrial() -> UcsDatasheet:
    return UcsDatasheet(
        model="Generic Industrial 6-DOF",
        manufacturer="ACME Robotics",
        robot_class="gantry",
        cost_new_eur=200000,
        nominal_picks_lifetime=100000000,
        rated_current_a=12.0,
        rated_torque_nm=800.0,
        rated_cycle_time_s=1.5,
        rated_payload_kg=80.0,
        nominal_duty_cycle=0.85,
        maintenance_cost_pct_per_year=0.07,
        power_consumption_w=2500.0,
    )


def test_worked_example_anchor(ur5):
    """Konzept-v2 Z. 244 — multiplier=1.0, load=1.0, cycle=2 s ≈ 0.002 €/Pick."""
    breakdown = compute_cost_per_pick(
        datasheet=ur5,
        wear_rate_multiplier=1.0,
        motor_load_ratio_max=1.0,
        cycle_intensity=1.0,
    )
    assert breakdown.wear_eur == pytest.approx(35000 / 30000000, rel=1e-9)  # 0.00117
    assert breakdown.capital_eur == pytest.approx(35000 * 0.05 / 30000000, rel=1e-9)  # ~0.0000583
    assert breakdown.total_eur == pytest.approx(0.002, rel=0.10)


def test_worked_example_heavy(ur5):
    """Konzept-v2: multiplier=1.5, load=1.0 → ≈ 0.0026 €/Pick."""
    breakdown = compute_cost_per_pick(
        datasheet=ur5, wear_rate_multiplier=1.5, motor_load_ratio_max=1.0
    )
    assert breakdown.total_eur == pytest.approx(0.0026, rel=0.10)


def test_wear_scales_linearly_with_multiplier(ur5):
    a = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0)
    b = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=2.0)
    assert b.wear_eur == pytest.approx(2 * a.wear_eur, rel=1e-9)
    # Capital + Maintenance bleiben gleich
    assert b.capital_eur == pytest.approx(a.capital_eur, rel=1e-9)
    assert b.maintenance_eur == pytest.approx(a.maintenance_eur, rel=1e-9)


def test_energy_scales_with_motor_load(ur5):
    a = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0, motor_load_ratio_max=1.0)
    b = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0, motor_load_ratio_max=2.0)
    assert b.energy_eur == pytest.approx(2 * a.energy_eur, rel=1e-9)
    assert b.wear_eur == pytest.approx(a.wear_eur, rel=1e-9)


def test_halfspeed_doubles_observed_cycle_and_energy(ur5):
    full = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0, cycle_intensity=1.0)
    half = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0, cycle_intensity=0.5)
    # observed_cycle = rated/cycle_intensity → halfspeed (0.5) = 2× rated → 2× Energy
    assert half.energy_eur == pytest.approx(2 * full.energy_eur, rel=1e-9)


def test_energy_components_independent_of_wear_multiplier(ur5):
    a = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=0.5)
    b = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=2.0)
    assert a.energy_eur == pytest.approx(b.energy_eur, rel=1e-9)


def test_industrial_robot_higher_total(ur5, industrial):
    a = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0)
    b = compute_cost_per_pick(datasheet=industrial, wear_rate_multiplier=1.0)
    assert b.total_eur > a.total_eur


def test_resolve_power_w_uses_explicit_value(ur5):
    assert resolve_power_w(ur5) == 150.0


def test_resolve_power_w_falls_back_to_class_default(ur5):
    ds = ur5.model_copy(update={"power_consumption_w": None})
    assert resolve_power_w(ds) == CLASS_POWER_DEFAULT_W["cobot"]


def test_operating_profile_explicit_picks_per_year(ur5):
    profile = OperatingProfile(picks_per_year=5_000_000)
    assert profile.resolve_picks_per_year(ur5) == 5_000_000


def test_operating_profile_utilization_factor_yields_about_2m(ur5):
    """UR5: duty=0.8, cycle=2 s, util=0.16 → ~2 M picks/p.a. (Worked Example)."""
    profile = OperatingProfile(utilization_factor=0.16)
    n = profile.resolve_picks_per_year(ur5)
    theoretical = SECONDS_PER_YEAR * 0.8 / 2.0
    assert n == int(theoretical * 0.16)
    assert 1_900_000 < n < 2_100_000


def test_finance_config_defaults_match_concept():
    cfg = FinanceConfig()
    assert cfg.electricity_price_eur_per_kwh == 0.30
    assert cfg.interest_rate_per_year == 0.05


def test_total_is_sum_of_components(ur5):
    b = compute_cost_per_pick(
        datasheet=ur5, wear_rate_multiplier=1.5, motor_load_ratio_max=1.25, cycle_intensity=1.0
    )
    assert b.total_eur == pytest.approx(
        b.energy_eur + b.wear_eur + b.capital_eur + b.maintenance_eur, rel=1e-9
    )


def test_energy_share_under_5pct_for_cobot_anchor(ur5):
    """Bei UR5-Anker dominiert Wear; Energie sollte < 5 % vom Total sein."""
    b = compute_cost_per_pick(datasheet=ur5, wear_rate_multiplier=1.0, motor_load_ratio_max=1.0)
    assert b.energy_eur / b.total_eur < 0.05
