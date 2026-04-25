"""Synthetische Flotten-Generierung — Determinismus, Profile-Mix, Restwert-Differenzierung."""

from __future__ import annotations

from collections import Counter

import pytest

from unifi.residual.fleet import generate_synthetic_fleet
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


def test_fleet_has_exactly_twelve_entries(ur5):
    fleet = generate_synthetic_fleet(ur5)
    assert len(fleet) == 12


def test_fleet_profile_distribution(ur5):
    fleet = generate_synthetic_fleet(ur5)
    counts = Counter(e.profile_label for e in fleet)
    assert counts["light_low_use"] == 3
    assert counts["light_normal"] == 3
    assert counts["heavy_normal"] == 3
    assert counts["heavy_high_use"] == 2
    assert counts["aged_unused"] == 1


def test_fleet_deterministic_with_seed(ur5):
    a = generate_synthetic_fleet(ur5, seed=42)
    b = generate_synthetic_fleet(ur5, seed=42)
    for x, y in zip(a, b, strict=True):
        assert x.robot_id == y.robot_id
        assert x.state.age_years == y.state.age_years
        assert x.state.cumulative_wear_pick_equivalents == pytest.approx(
            y.state.cumulative_wear_pick_equivalents
        )


def test_fleet_seed_changes_values(ur5):
    a = generate_synthetic_fleet(ur5, seed=42)
    b = generate_synthetic_fleet(ur5, seed=99)
    assert a[0].state.age_years != b[0].state.age_years


def test_heavy_high_use_residuals_lower_than_light_low_use(ur5):
    fleet = generate_synthetic_fleet(ur5)
    light = [e for e in fleet if e.profile_label == "light_low_use"]
    heavy = [e for e in fleet if e.profile_label == "heavy_high_use"]
    avg_light = sum(e.residual.residual_value_eur for e in light) / len(light)
    avg_heavy = sum(e.residual.residual_value_eur for e in heavy) / len(heavy)
    assert avg_heavy < avg_light


def test_robot_ids_unique_and_padded(ur5):
    fleet = generate_synthetic_fleet(ur5)
    ids = [e.robot_id for e in fleet]
    assert len(set(ids)) == 12
    assert all(rid.startswith("R-") and len(rid) == 5 for rid in ids)


def test_aged_unused_floor_active(ur5):
    fleet = generate_synthetic_fleet(ur5)
    aged = [e for e in fleet if e.profile_label == "aged_unused"]
    assert len(aged) == 1
    # age 8-12 J vs. lifetime 10 → wahrscheinlich am Floor oder darunter
    assert aged[0].residual.age_consumed_fraction >= 0.8
