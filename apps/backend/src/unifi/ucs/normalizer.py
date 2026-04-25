"""Roh-Window-Aggregat × Datasheet → dimensionsloser `UcsFeatures`-Vektor.

Verschleiß-Konstanten (`T_REF`, `T_MAX`, `NOMINAL_JOINT_VELOCITY`, `G`)
sind UCS-Standardwerte. Siehe `docs/research/wear-rate-training.md` § 2.
"""

from __future__ import annotations

import numpy as np

from unifi.data.ur5_loader import UR5_TELEMETRY_MAP, RunMeta
from unifi.ucs.schema import PayloadClass, ThermalState, UcsDatasheet, UcsFeatures

T_REF: float = 30.0  # °C, UCS Referenz-Joint-Temperatur warmgefahren
T_MAX: float = 80.0  # °C, nominale Operating-Limit-Temperatur
NOMINAL_JOINT_VELOCITY: float = 3.0  # rad/s, UCS-Default für Cobot-Klasse
G: float = 9.81  # m/s²

# Speed-Tag → Faktor auf rated_cycle_time_s für observed_cycle_time_s.
# Pick-Detection postponed; Filename-Tag reicht.
SPEED_CYCLE_FACTOR: dict[str, float] = {"fullspeed": 1.0, "halfspeed": 2.0}


def _peak(agg: dict[str, float], col: str) -> float:
    """Symmetrischer Peak: max(|vMax|, |vMin|)."""
    return max(abs(agg[f"{col}_vMax"]), abs(agg[f"{col}_vMin"]))


def _stat(agg: dict[str, float], col: str, stat: str) -> float:
    return agg[f"{col}_{stat}"]


def window_to_ucs_features(
    agg: dict[str, float], datasheet: UcsDatasheet, meta: RunMeta
) -> UcsFeatures:
    cur_cols = UR5_TELEMETRY_MAP["joint_currents"]
    vel_cols = UR5_TELEMETRY_MAP["joint_velocities"]
    tmp_cols = UR5_TELEMETRY_MAP["joint_temperatures"]
    trq_cols = UR5_TELEMETRY_MAP["joint_torques"]
    tcp_xyz = UR5_TELEMETRY_MAP["tcp_force"][:3]
    err_cols = [f"TRACKING_ERROR_J{i}" for i in range(1, 7)]

    # Motor load — peak-Joint dominiert.
    motor_current_max_A = max(_peak(agg, c) for c in cur_cols)
    motor_load_ratio_max = motor_current_max_A / datasheet.rated_current_a
    motor_load_ratio_mean = float(
        np.mean([abs(_stat(agg, c, "value")) for c in cur_cols])
    ) / datasheet.rated_current_a
    motor_load_ratio_std = float(
        np.mean([_stat(agg, c, "vStd") for c in cur_cols])
    ) / datasheet.rated_current_a

    # Cycle intensity — aus Speed-Tag (Pick-Detection postponed).
    observed_cycle_time_s = SPEED_CYCLE_FACTOR[meta.speed] * datasheet.rated_cycle_time_s
    cycle_intensity = datasheet.rated_cycle_time_s / observed_cycle_time_s

    # Velocity intensity.
    velocity_intensity_max = max(_peak(agg, c) for c in vel_cols) / NOMINAL_JOINT_VELOCITY

    # Torque load.
    torque_load_ratio_max = max(_peak(agg, c) for c in trq_cols) / datasheet.rated_torque_nm

    # Joint temperatures.
    tmp_max = max(_stat(agg, c, "vMax") for c in tmp_cols)
    tmp_mean = float(np.mean([_stat(agg, c, "value") for c in tmp_cols]))
    temp_delta_normalized_max = (tmp_max - T_REF) / (T_MAX - T_REF)
    temp_delta_normalized_mean = (tmp_mean - T_REF) / (T_MAX - T_REF)

    # TCP force xyz Euklidische Norm der Peak-Beträge.
    fx, fy, fz = (_peak(agg, c) for c in tcp_xyz)
    tcp_force_mag = float(np.sqrt(fx**2 + fy**2 + fz**2))
    tcp_force_norm = tcp_force_mag / (datasheet.rated_payload_kg * G)

    # Tracking-Error-RMS pro Joint via E[X²] = value² + vStd² → RMS über Joints.
    rms_per_joint = [
        np.sqrt(_stat(agg, c, "value") ** 2 + _stat(agg, c, "vStd") ** 2) for c in err_cols
    ]
    tracking_error_rms = float(np.sqrt(np.mean(np.array(rms_per_joint) ** 2)))

    thermal_state: ThermalState = "cold" if meta.coldstart else "warm"
    payload_class: PayloadClass = "light" if meta.payload_lb == 16 else "heavy"

    return UcsFeatures(
        motor_load_ratio_max=motor_load_ratio_max,
        motor_load_ratio_mean=motor_load_ratio_mean,
        motor_load_ratio_std=motor_load_ratio_std,
        cycle_intensity=cycle_intensity,
        velocity_intensity_max=velocity_intensity_max,
        torque_load_ratio_max=torque_load_ratio_max,
        temp_delta_normalized_max=temp_delta_normalized_max,
        temp_delta_normalized_mean=temp_delta_normalized_mean,
        tcp_force_norm=tcp_force_norm,
        tracking_error_rms=tracking_error_rms,
        thermal_state=thermal_state,
        payload_class=payload_class,
    )
