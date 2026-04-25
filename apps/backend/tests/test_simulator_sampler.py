"""WindowSampler-Round-Trip auf synthetischen Parquet-Daten."""

from __future__ import annotations

import pandas as pd
import pytest

from unifi.simulator.sampler import WindowSampler
from unifi.ucs.schema import UcsFeatures


def _row(t_start_s: float, payload_lb: int = 45, speed: str = "halfspeed",
         split: str = "holdout", file: str = "ur5testresulthalfspeedpayload45lb3_flat.csv",
         **overrides) -> dict:
    base = {
        "file": file,
        "payload_lb": payload_lb,
        "speed": speed,
        "coldstart": False,
        "run_idx": 3,
        "window_idx": int(t_start_s / 2),
        "t_start_s": t_start_s,
        "t_end_s": t_start_s + 2.0,
        "split": split,
        "motor_current_max_A": 3.5,
        "joint_temp_max_C": 35.0,
        "joint_temp_mean_C": 33.0,
        "observed_cycle_time_s": 4.0,
        "motor_load_ratio_max": 0.8,
        "motor_load_ratio_mean": 0.4,
        "motor_load_ratio_std": 0.1,
        "cycle_intensity": 0.5,
        "velocity_intensity_max": 0.4,
        "torque_load_ratio_max": 0.3,
        "temp_delta_normalized_max": 0.1,
        "temp_delta_normalized_mean": 0.05,
        "tcp_force_norm": 1.0,
        "tracking_error_rms": 0.001,
        "thermal_state": "warm",
        "payload_class": "heavy",
    }
    base.update(overrides)
    return base


def _write_parquet(tmp_path, rows: list[dict]):
    path = tmp_path / "windows.parquet"
    pd.DataFrame(rows).to_parquet(path, index=False)
    return path


def test_from_parquet_filters_holdout_only(tmp_path):
    rows = [
        _row(0.0, split="train"),
        _row(2.0, split="holdout"),
        _row(4.0, split="val"),
        _row(6.0, split="holdout"),
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.total == 2


def test_pop_is_sequential_by_t_start_s(tmp_path):
    rows = [_row(6.0), _row(0.0), _row(2.0), _row(4.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)

    seen = [sampler.pop().window_idx for _ in range(4)]
    assert seen == [0, 1, 2, 3]


def test_cursor_wraps_around(tmp_path):
    rows = [_row(0.0), _row(2.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)

    sampler.pop()
    sampler.pop()  # cursor → 0 (wrap)
    assert sampler.cursor == 0
    third = sampler.pop()
    assert third.window_idx == 0
    assert sampler.cursor == 1


def test_reset_sets_cursor_to_zero(tmp_path):
    rows = [_row(0.0), _row(2.0), _row(4.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    sampler.pop()
    assert sampler.cursor == 1
    sampler.reset()
    assert sampler.cursor == 0


def test_features_round_trip_into_pydantic(tmp_path):
    rows = [_row(0.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    sample = sampler.pop()
    assert isinstance(sample.features, UcsFeatures)
    assert sample.features.payload_class == "heavy"


def test_empty_sampler_raises(tmp_path):
    path = _write_parquet(tmp_path, [_row(0.0, split="train")])
    with pytest.raises(ValueError):
        WindowSampler.from_parquet(path)


def test_from_parquet_filters_zero_velocity_windows(tmp_path):
    """Stillstand-Frames (velocity_intensity_max < 0.05) werden ausgefiltert."""
    rows = [
        _row(0.0, velocity_intensity_max=0.0),    # Stillstand
        _row(2.0, velocity_intensity_max=0.001),  # Quasi-Stillstand
        _row(4.0, velocity_intensity_max=0.2),    # normal
        _row(6.0, velocity_intensity_max=0.3),    # normal
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.total == 2


def test_from_parquet_filters_peak_motor_load_windows(tmp_path):
    """Peak-Last-Frames (motor_load_ratio_max ≥ 0.92) werden ausgefiltert,
    damit Cap-Hits nach Re-Normalisierung den Demo-Chart nicht dominieren."""
    rows = [
        _row(0.0, motor_load_ratio_max=0.99),  # Peak → raus
        _row(2.0, motor_load_ratio_max=0.92),  # Schwelle (≥ 0.92) → raus
        _row(4.0, motor_load_ratio_max=0.7),   # normal
        _row(6.0, motor_load_ratio_max=0.5),   # normal
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.total == 2
