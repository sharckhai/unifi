import math

import pytest

from unifi.data.ur5_loader import UR5_TELEMETRY_MAP, RunMeta
from unifi.ucs.normalizer import T_MAX, T_REF, window_to_ucs_features
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


def _stub_agg(
    cur_peak: float,
    tmp_max: float,
    tmp_mean: float,
    trq_peak: float,
    vel_peak: float,
    fxyz: tuple[float, float, float],
    err_value: float,
    err_std: float,
) -> dict[str, float]:
    """Constructs a flat agg-dict with realistic per-joint values."""
    agg: dict[str, float] = {}
    # Currents: J2 dominiert mit cur_peak; restliche ~halb so groß.
    for i, c in enumerate(UR5_TELEMETRY_MAP["joint_currents"], start=1):
        peak = cur_peak if i == 2 else cur_peak * 0.4
        agg[f"{c}_vMax"] = peak * 0.5
        agg[f"{c}_vMin"] = -peak  # negative dominiert (UR5-typisch für J2)
        agg[f"{c}_value"] = -peak * 0.3
        agg[f"{c}_vStd"] = peak * 0.5
        agg[f"{c}_vCnt"] = 250
        agg[f"{c}_vFreq"] = 125.0
        agg[f"{c}_vTrend"] = 0.0
    # Velocities.
    for c in UR5_TELEMETRY_MAP["joint_velocities"]:
        agg[f"{c}_vMax"] = vel_peak
        agg[f"{c}_vMin"] = -vel_peak * 0.5
        agg[f"{c}_value"] = 0.0
        agg[f"{c}_vStd"] = vel_peak * 0.4
        agg[f"{c}_vCnt"] = 250
        agg[f"{c}_vFreq"] = 125.0
        agg[f"{c}_vTrend"] = 0.0
    # Temperatures (alle Joints gleich, vereinfacht).
    for c in UR5_TELEMETRY_MAP["joint_temperatures"]:
        agg[f"{c}_vMax"] = tmp_max
        agg[f"{c}_vMin"] = tmp_mean - 0.5
        agg[f"{c}_value"] = tmp_mean
        agg[f"{c}_vStd"] = 0.1
        agg[f"{c}_vCnt"] = 250
        agg[f"{c}_vFreq"] = 125.0
        agg[f"{c}_vTrend"] = 0.0
    # Torques.
    for c in UR5_TELEMETRY_MAP["joint_torques"]:
        agg[f"{c}_vMax"] = trq_peak * 0.3
        agg[f"{c}_vMin"] = -trq_peak
        agg[f"{c}_value"] = -trq_peak * 0.3
        agg[f"{c}_vStd"] = trq_peak * 0.2
        agg[f"{c}_vCnt"] = 250
        agg[f"{c}_vFreq"] = 125.0
        agg[f"{c}_vTrend"] = 0.0
    # TCP forces (xyz then rxryrz).
    tcp_cols = UR5_TELEMETRY_MAP["tcp_force"]
    for i, c in enumerate(tcp_cols):
        f = fxyz[i] if i < 3 else 0.0
        agg[f"{c}_vMax"] = f
        agg[f"{c}_vMin"] = 0.0
        agg[f"{c}_value"] = f * 0.5
        agg[f"{c}_vStd"] = f * 0.2
        agg[f"{c}_vCnt"] = 250
        agg[f"{c}_vFreq"] = 125.0
        agg[f"{c}_vTrend"] = 0.0
    # Tracking errors.
    for i in range(1, 7):
        c = f"TRACKING_ERROR_J{i}"
        agg[f"{c}_vMax"] = err_value + err_std
        agg[f"{c}_vMin"] = err_value - err_std
        agg[f"{c}_value"] = err_value
        agg[f"{c}_vStd"] = err_std
        agg[f"{c}_vCnt"] = 250
        agg[f"{c}_vFreq"] = 125.0
        agg[f"{c}_vTrend"] = 0.0
    return agg


def test_warm_fullspeed_45lb_window(ur5_datasheet):
    """Beispiel aus docs/research/wear-rate-training.md § 2.3."""
    agg = _stub_agg(
        cur_peak=7.5,
        tmp_max=36.6,
        tmp_mean=33.0,
        trq_peak=57.0,
        vel_peak=1.07,
        fxyz=(100.0, 0.0, 0.0),
        err_value=0.0,
        err_std=0.001,
    )
    meta = RunMeta(
        file="ur5testresultfullspeedpayload45lb1_flat.csv",
        payload_lb=45,
        speed="fullspeed",
        coldstart=False,
        run_idx=1,
    )
    f = window_to_ucs_features(agg, ur5_datasheet, meta)
    assert f.motor_load_ratio_max == pytest.approx(7.5 / 6.0)  # 1.250
    assert f.cycle_intensity == 1.0
    assert f.torque_load_ratio_max == pytest.approx(57.0 / 150.0)  # 0.380
    assert f.temp_delta_normalized_max == pytest.approx((36.6 - T_REF) / (T_MAX - T_REF))
    assert f.tcp_force_norm == pytest.approx(100.0 / (5.0 * 9.81))  # ~2.039
    assert f.thermal_state == "warm"
    assert f.payload_class == "heavy"


def test_halfspeed_cycle_intensity_is_half(ur5_datasheet):
    agg = _stub_agg(5.5, 30.0, 28.0, 50.0, 0.5, (50.0, 0.0, 0.0), 0.0, 0.001)
    meta = RunMeta(
        file="ur5testresulthalfspeedpayload16lb1_flat.csv",
        payload_lb=16,
        speed="halfspeed",
        coldstart=False,
        run_idx=1,
    )
    f = window_to_ucs_features(agg, ur5_datasheet, meta)
    assert f.cycle_intensity == 0.5
    assert f.payload_class == "light"
    assert f.thermal_state == "warm"


def test_coldstart_thermal_state(ur5_datasheet):
    agg = _stub_agg(7.0, 26.0, 24.0, 60.0, 1.0, (80.0, 0.0, 0.0), 0.0, 0.001)
    meta = RunMeta(
        file="ur5testresultcoldstartfullspeedpayload45lb1_flat.csv",
        payload_lb=45,
        speed="fullspeed",
        coldstart=True,
        run_idx=1,
    )
    f = window_to_ucs_features(agg, ur5_datasheet, meta)
    assert f.thermal_state == "cold"
    assert f.temp_delta_normalized_max == pytest.approx((26.0 - T_REF) / (T_MAX - T_REF))


def test_tracking_error_rms_uses_value_and_std(ur5_datasheet):
    """RMS over a window where every joint has value=v and std=s should equal sqrt(v²+s²)."""
    agg = _stub_agg(6.0, 30.0, 28.0, 50.0, 1.0, (50.0, 0.0, 0.0), err_value=0.002, err_std=0.003)
    meta = RunMeta(
        file="ur5testresultfullspeedpayload16lb1_flat.csv",
        payload_lb=16,
        speed="fullspeed",
        coldstart=False,
        run_idx=1,
    )
    f = window_to_ucs_features(agg, ur5_datasheet, meta)
    assert f.tracking_error_rms == pytest.approx(math.sqrt(0.002**2 + 0.003**2), rel=1e-6)
