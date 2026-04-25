"""Re-Normalisierungs- und Random-Emphasis-Tests."""

from __future__ import annotations

import numpy as np
import pytest

from unifi.simulator.scaling import (
    EMPHASIS_CANDIDATES,
    LB_TO_KG,
    apply_random_emphasis,
    renormalize,
)
from unifi.ucs.schema import UcsDatasheet, UcsFeatures

UR5_DATASHEET = UcsDatasheet(
    model="UR5",
    manufacturer="Universal Robots",
    robot_class="cobot",
    cost_new_eur=35000,
    nominal_picks_lifetime=30_000_000,
    rated_current_a=6.0,
    rated_torque_nm=150.0,
    rated_cycle_time_s=2.0,
    rated_payload_kg=5.0,
    nominal_duty_cycle=0.8,
    maintenance_cost_pct_per_year=0.05,
    power_consumption_w=150.0,
)


def _features(**overrides) -> UcsFeatures:
    base = dict(
        motor_load_ratio_max=0.8,
        motor_load_ratio_mean=0.4,
        motor_load_ratio_std=0.1,
        cycle_intensity=0.5,
        velocity_intensity_max=0.4,
        torque_load_ratio_max=0.3,
        temp_delta_normalized_max=0.1,
        temp_delta_normalized_mean=0.05,
        tcp_force_norm=1.0,
        tracking_error_rms=0.001,
        thermal_state="warm",
        payload_class="heavy",
    )
    base.update(overrides)
    return UcsFeatures(**base)


def test_renormalize_identity_when_ratios_are_one():
    """Source = 45lb halfspeed, frontend = 45lb in kg + halfspeed-cycle: keine Skalierung."""
    feats = _features()
    result = renormalize(
        feats,
        source_payload_lb=45,
        source_speed="halfspeed",
        component_weight_kg=45 * LB_TO_KG,
        pick_duration_s=4.0,
        datasheet=UR5_DATASHEET,
    )
    assert result.motor_load_ratio_max == pytest.approx(feats.motor_load_ratio_max)
    assert result.tcp_force_norm == pytest.approx(feats.tcp_force_norm)
    assert result.velocity_intensity_max == pytest.approx(feats.velocity_intensity_max)
    assert result.cycle_intensity == pytest.approx(0.5)
    assert result.payload_class == "heavy"


def test_doubling_component_weight_doubles_force_and_torque():
    feats = _features()
    base = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=10.0, pick_duration_s=4.0, datasheet=UR5_DATASHEET,
    )
    heavy = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=20.0, pick_duration_s=4.0, datasheet=UR5_DATASHEET,
    )
    assert heavy.tcp_force_norm == pytest.approx(2 * base.tcp_force_norm)
    assert heavy.torque_load_ratio_max == pytest.approx(2 * base.torque_load_ratio_max)
    assert heavy.motor_load_ratio_max == pytest.approx(2 * base.motor_load_ratio_max)


def test_halving_pick_duration_doubles_velocity_and_cycle_intensity():
    feats = _features()
    slow = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=5.0, pick_duration_s=4.0, datasheet=UR5_DATASHEET,
    )
    fast = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=5.0, pick_duration_s=2.0, datasheet=UR5_DATASHEET,
    )
    assert fast.velocity_intensity_max == pytest.approx(2 * slow.velocity_intensity_max)
    assert fast.cycle_intensity == pytest.approx(1.0)
    assert slow.cycle_intensity == pytest.approx(0.5)


def test_payload_class_flips_at_rated_payload():
    feats = _features(payload_class="heavy")
    light = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=2.0, pick_duration_s=4.0, datasheet=UR5_DATASHEET,
    )
    heavy = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=10.0, pick_duration_s=4.0, datasheet=UR5_DATASHEET,
    )
    assert light.payload_class == "light"
    assert heavy.payload_class == "heavy"


def test_unscaled_fields_passthrough():
    feats = _features()
    out = renormalize(
        feats, source_payload_lb=45, source_speed="halfspeed",
        component_weight_kg=12.0, pick_duration_s=2.5, datasheet=UR5_DATASHEET,
    )
    assert out.temp_delta_normalized_max == feats.temp_delta_normalized_max
    assert out.temp_delta_normalized_mean == feats.temp_delta_normalized_mean
    assert out.tracking_error_rms == feats.tracking_error_rms
    assert out.thermal_state == feats.thermal_state


def test_apply_random_emphasis_is_deterministic_given_seed():
    feats = _features()
    a, fa, ka = apply_random_emphasis(feats, np.random.default_rng(42))
    b, fb, kb = apply_random_emphasis(feats, np.random.default_rng(42))
    assert fa == fb
    assert ka == kb
    assert a.model_dump() == b.model_dump()


def test_apply_random_emphasis_modifies_only_one_feature():
    feats = _features()
    biased, name, factor = apply_random_emphasis(feats, np.random.default_rng(0))
    assert name in EMPHASIS_CANDIDATES
    assert 1.2 <= factor <= 2.0
    assert getattr(biased, name) == pytest.approx(getattr(feats, name) * factor)
    for other in EMPHASIS_CANDIDATES:
        if other == name:
            continue
        assert getattr(biased, other) == pytest.approx(getattr(feats, other))
