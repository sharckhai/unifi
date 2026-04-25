import json
from pathlib import Path

from unifi.ucs.schema import UcsDatasheet, UcsFeatures, UcsTelemetrySample

REPO_ROOT = Path(__file__).resolve().parents[3]
UR5_DATASHEET = REPO_ROOT / "data" / "nist-ur5-degradation" / "datasheets" / "ur5_datasheet.json"


def test_ur5_datasheet_round_trip() -> None:
    ds = UcsDatasheet.model_validate_json(UR5_DATASHEET.read_text())
    assert ds.manufacturer == "Universal Robots"
    assert ds.robot_class == "cobot"
    assert ds.rated_current_a == 6.0
    dumped = json.loads(ds.model_dump_json())
    assert dumped == json.loads(UR5_DATASHEET.read_text())


def test_telemetry_sample_six_dof() -> None:
    sample = UcsTelemetrySample(
        t_s=0.0,
        joint_currents=[0.5, 1.6, 1.3, 0.04, 0.1, 0.07],
        joint_positions=[-0.47, -1.39, 0.99, -2.76, -1.83, -0.78],
        joint_velocities=[0.0] * 6,
        joint_temperatures=[27.2, 28.6, 28.6, 33.5, 33.5, 35.3],
    )
    assert len(sample.joint_currents) == 6
    assert sample.tcp_force is None


def test_features_feature_order_is_stable() -> None:
    order = UcsFeatures.feature_order()
    assert order[0] == "motor_load_ratio_max"
    assert "thermal_state" in order
    assert "payload_class" in order
    assert len(order) == len(set(order))


def test_features_validation() -> None:
    f = UcsFeatures(
        motor_load_ratio_max=1.0,
        motor_load_ratio_mean=0.6,
        motor_load_ratio_std=0.2,
        cycle_intensity=1.0,
        velocity_intensity_max=0.8,
        torque_load_ratio_max=0.5,
        temp_delta_normalized_max=0.1,
        temp_delta_normalized_mean=0.05,
        tcp_force_norm=0.4,
        tracking_error_rms=0.001,
        thermal_state="warm",
        payload_class="light",
    )
    assert f.thermal_state == "warm"
