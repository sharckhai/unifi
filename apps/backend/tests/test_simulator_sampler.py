"""WindowSampler-Tests im synthetischen Mean-Vector-Modus."""

from __future__ import annotations

import pandas as pd
import pytest

from unifi.simulator.sampler import (
    NOISE_SCALE,
    SYNTHETIC_CYCLE_LENGTH,
    WindowSampler,
)
from unifi.ucs.schema import UcsFeatures


def _row(t_start_s: float, payload_lb: int = 16, speed: str = "fullspeed",
         split: str = "holdout", file: str = "ur5testresultfullspeedpayload16lb3_flat.csv",
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
        "motor_load_ratio_max": 0.5,
        "motor_load_ratio_mean": 0.1,
        "motor_load_ratio_std": 0.05,
        "cycle_intensity": 1.0,
        "velocity_intensity_max": 0.3,
        "torque_load_ratio_max": 0.25,
        "temp_delta_normalized_max": 0.12,
        "temp_delta_normalized_mean": 0.03,
        "tcp_force_norm": 1.05,
        "tracking_error_rms": 0.01,
        "thermal_state": "warm",
        "payload_class": "light",
    }
    base.update(overrides)
    return base


def _write_parquet(tmp_path, rows: list[dict]):
    path = tmp_path / "windows.parquet"
    pd.DataFrame(rows).to_parquet(path, index=False)
    return path


def test_from_parquet_filters_holdout_only(tmp_path):
    """Mean wird nur über holdout-Rows berechnet, andere Splits ignoriert."""
    rows = [
        _row(0.0, split="train", motor_load_ratio_mean=0.99),  # darf Mean nicht beeinflussen
        _row(2.0, split="holdout", motor_load_ratio_mean=0.10),
        _row(4.0, split="val", motor_load_ratio_mean=0.99),
        _row(6.0, split="holdout", motor_load_ratio_mean=0.20),
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.source_n == 2
    sample = sampler.pop()
    # Mean = (0.10 + 0.20) / 2 = 0.15, mit kleinem Noise.
    assert 0.10 < sample.features.motor_load_ratio_mean < 0.20


def test_total_is_synthetic_cycle_length(tmp_path):
    """`total` ist die Wrap-Länge des synthetischen Cursors, nicht die Row-Zahl."""
    rows = [_row(0.0), _row(2.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.total == SYNTHETIC_CYCLE_LENGTH


def test_pop_is_deterministic_per_cursor(tmp_path):
    """Gleicher Cursor → gleicher Feature-Vektor (Reset reproduziert die Sequenz)."""
    rows = [_row(0.0), _row(2.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    first = sampler.pop().features.model_dump()
    sampler.reset()
    again = sampler.pop().features.model_dump()
    assert first == again


def test_pop_features_concentrate_around_mean(tmp_path):
    """Über viele Pops bleibt der empirische Mean nahe am Holdout-Mean."""
    rows = [
        _row(0.0, motor_load_ratio_max=0.4),
        _row(2.0, motor_load_ratio_max=0.5),
        _row(4.0, motor_load_ratio_max=0.6),
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    samples = [sampler.pop().features.motor_load_ratio_max for _ in range(80)]
    empirical = sum(samples) / len(samples)
    assert abs(empirical - 0.5) < 0.05  # Holdout-Mean = 0.5, Noise klein


def test_cursor_wraps_around(tmp_path):
    """Cursor läuft auf 0 zurück nach Erreichen von cycle_length."""
    rows = [_row(0.0)]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    for _ in range(SYNTHETIC_CYCLE_LENGTH):
        sampler.pop()
    assert sampler.cursor == 0


def test_reset_sets_cursor_to_zero(tmp_path):
    rows = [_row(0.0)]
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
    assert sample.features.payload_class == "light"
    assert sample.features.thermal_state == "warm"


def test_empty_sampler_raises(tmp_path):
    path = _write_parquet(tmp_path, [_row(0.0, split="train")])
    with pytest.raises(ValueError):
        WindowSampler.from_parquet(path)


def test_from_parquet_filters_zero_velocity_windows(tmp_path):
    """Stillstand-Frames (velocity_intensity_max < 0.05) werden ausgefiltert."""
    rows = [
        _row(0.0, velocity_intensity_max=0.0),    # Stillstand → raus
        _row(2.0, velocity_intensity_max=0.001),  # Quasi-Stillstand → raus
        _row(4.0, velocity_intensity_max=0.2),    # normal
        _row(6.0, velocity_intensity_max=0.3),    # normal
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.source_n == 2


def test_from_parquet_filters_peak_motor_load_windows(tmp_path):
    """Peak-Last-Frames (motor_load_ratio_max ≥ 0.92) werden ausgefiltert,
    damit der Mean nicht durch Spitzen-Strom-Frames verzerrt wird."""
    rows = [
        _row(0.0, motor_load_ratio_max=0.99),  # Peak → raus
        _row(2.0, motor_load_ratio_max=0.92),  # Schwelle (≥ 0.92) → raus
        _row(4.0, motor_load_ratio_max=0.7),   # normal
        _row(6.0, motor_load_ratio_max=0.5),   # normal
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    assert sampler.source_n == 2


def test_noise_scale_zero_yields_exact_mean(tmp_path):
    """Mit noise_scale=0 sind alle Pops identisch dem Holdout-Mean."""
    rows = [
        _row(0.0, motor_load_ratio_max=0.4),
        _row(2.0, motor_load_ratio_max=0.6),
    ]
    path = _write_parquet(tmp_path, rows)
    sampler = WindowSampler.from_parquet(path)
    sampler._noise_scale = 0.0  # für diesen Test direkt setzen
    a = sampler.pop().features
    b = sampler.pop().features
    assert a.motor_load_ratio_max == pytest.approx(0.5)
    assert b.motor_load_ratio_max == pytest.approx(0.5)
