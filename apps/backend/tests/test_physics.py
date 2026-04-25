import math

import pandas as pd
import pytest

from unifi.labels.physics import (
    LabelParams,
    anchor_multiplier,
    compute_raw_multiplier,
    compute_raw_multiplier_series,
)
from unifi.ucs.schema import UcsDatasheet


@pytest.fixture
def ur5_datasheet() -> UcsDatasheet:
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
    )


def test_warm_fullspeed_16lb_anchor_value(ur5_datasheet):
    """Aus docs/research/wear-rate-training.md § 1.5 Tabelle: ~1.31 raw."""
    raw = compute_raw_multiplier(
        motor_current_max_A=5.97,
        joint_temp_max_C=36.0,
        observed_cycle_time_s=2.0,
        datasheet=ur5_datasheet,
        p=LabelParams(),
    )
    expected = (5.97 / 6.0) ** 2.5 * math.exp(0.05 * 6.0) * (2.0 / 2.0)
    assert raw == pytest.approx(expected, rel=1e-9)
    assert raw == pytest.approx(1.31, rel=0.05)


def test_warm_fullspeed_45lb_value(ur5_datasheet):
    """Aus § 1.5: ~2.47 raw (bei tmp_max=37 °C)."""
    raw = compute_raw_multiplier(
        motor_current_max_A=7.47,
        joint_temp_max_C=37.0,
        observed_cycle_time_s=2.0,
        datasheet=ur5_datasheet,
        p=LabelParams(),
    )
    assert raw == pytest.approx(2.47, rel=0.05)


def test_warm_halfspeed_16lb_value(ur5_datasheet):
    """Aus § 1.5: ~0.41 raw."""
    raw = compute_raw_multiplier(
        motor_current_max_A=5.34,
        joint_temp_max_C=32.0,
        observed_cycle_time_s=4.0,
        datasheet=ur5_datasheet,
        p=LabelParams(),
    )
    assert raw == pytest.approx(0.41, rel=0.05)


def test_compute_raw_multiplier_series_matches_scalar(ur5_datasheet):
    p = LabelParams()
    cur = pd.Series([5.97, 7.47, 5.34])
    tmp = pd.Series([36.0, 37.0, 32.0])
    obs = pd.Series([2.0, 2.0, 4.0])
    series = compute_raw_multiplier_series(cur, tmp, obs, ur5_datasheet, p)
    for i in range(3):
        scalar = compute_raw_multiplier(cur[i], tmp[i], obs[i], ur5_datasheet, p)
        assert series.iloc[i] == pytest.approx(scalar, rel=1e-9)


def test_anchor_multiplier_normalizes_to_unit_median():
    raw = pd.Series([0.5, 1.0, 1.5, 2.0, 3.0])
    anchor_mask = pd.Series([True, True, True, False, False])
    multiplier, stats = anchor_multiplier(raw, anchor_mask)
    # median over [0.5, 1.0, 1.5] = 1.0 → multiplier == raw
    assert multiplier.iloc[1] == pytest.approx(1.0)
    assert stats["anchor_n"] == 3
    assert stats["anchor_median_raw"] == pytest.approx(1.0)
    assert stats["multiplier_p50"] == pytest.approx(1.5)


def test_anchor_multiplier_rejects_empty_mask():
    raw = pd.Series([1.0, 2.0])
    mask = pd.Series([False, False])
    with pytest.raises(ValueError):
        anchor_multiplier(raw, mask)
