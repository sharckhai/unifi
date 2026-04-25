"""Round-trip-Tests für Train, Save, Load, Predict — keine echten Daten nötig."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from unifi.models.wear_rate import (
    CATEGORICAL_MAP,
    CLIP_HI,
    CLIP_LO,
    TrainParams,
    encode_categoricals,
    load,
    predict_one,
    save,
    train,
)
from unifi.ucs.schema import UcsFeatures


def _synthetic_labeled_df(n: int = 120, seed: int = 7) -> pd.DataFrame:
    """Ein synthetisches gelabeltes DataFrame mit deterministischer Formel."""
    rng = np.random.default_rng(seed)
    feature_order = UcsFeatures.feature_order()
    rows = []
    for i in range(n):
        load_max = float(rng.uniform(0.6, 1.4))
        cycle = float(rng.choice([0.5, 1.0]))
        temp = float(rng.uniform(-0.05, 0.15))
        thermal = "warm" if rng.random() > 0.3 else "cold"
        payload = "heavy" if rng.random() > 0.5 else "light"
        # deterministic-ish multiplier — Last³ × Cycle × thermal-Bonus, plus Rauschen.
        mult = (load_max**2.5) * cycle * math.exp(0.5 * temp)
        mult *= 1.0 + 0.05 * rng.normal()
        mult = max(0.05, mult)
        row = {
            "motor_load_ratio_max": load_max,
            "motor_load_ratio_mean": load_max * 0.4,
            "motor_load_ratio_std": load_max * 0.2,
            "cycle_intensity": cycle,
            "velocity_intensity_max": float(rng.uniform(0.2, 0.4)),
            "torque_load_ratio_max": float(rng.uniform(0.3, 0.45)),
            "temp_delta_normalized_max": temp,
            "temp_delta_normalized_mean": temp * 0.6,
            "tcp_force_norm": float(rng.uniform(1.0, 2.5)),
            "tracking_error_rms": float(rng.uniform(5e-4, 5e-3)),
            "thermal_state": thermal,
            "payload_class": payload,
            "wear_rate_multiplier": mult,
            "split": "train" if i < int(n * 0.7) else "val",
            "speed": "fullspeed" if cycle == 1.0 else "halfspeed",
        }
        # ensure feature_order keys exist
        assert all(k in row for k in feature_order)
        rows.append(row)
    return pd.DataFrame(rows)


def test_encode_categoricals_maps_correctly():
    df = pd.DataFrame(
        {"thermal_state": ["cold", "warm"], "payload_class": ["light", "heavy"], "x": [1, 2]}
    )
    out = encode_categoricals(df)
    assert list(out["thermal_state"]) == [0, 1]
    assert list(out["payload_class"]) == [0, 1]
    assert list(out["x"]) == [1, 2]


def test_categorical_map_uses_all_pydantic_literals():
    """Sicherstellen, dass CATEGORICAL_MAP keine UcsFeatures-Werte vergisst."""
    f = UcsFeatures(
        motor_load_ratio_max=1.0,
        motor_load_ratio_mean=0.5,
        motor_load_ratio_std=0.1,
        cycle_intensity=1.0,
        velocity_intensity_max=0.3,
        torque_load_ratio_max=0.4,
        temp_delta_normalized_max=0.1,
        temp_delta_normalized_mean=0.05,
        tcp_force_norm=1.5,
        tracking_error_rms=0.001,
        thermal_state="cold",
        payload_class="heavy",
    )
    assert f.thermal_state in CATEGORICAL_MAP["thermal_state"]
    assert f.payload_class in CATEGORICAL_MAP["payload_class"]


def test_train_runs_and_returns_stats():
    df = _synthetic_labeled_df()
    params = TrainParams(n_estimators=80, early_stopping_rounds=10)
    result = train(df, params)
    assert result.n_train > 50
    assert result.n_val > 20
    assert math.isfinite(result.val_rmse_log)
    assert result.val_rmse_log < 1.0  # synthetic data, easy
    assert result.feature_order == UcsFeatures.feature_order()
    assert result.categorical_indices == [
        result.feature_order.index("thermal_state"),
        result.feature_order.index("payload_class"),
    ]
    assert "p50" in result.quantiles


def test_save_and_load_round_trip(tmp_path):
    df = _synthetic_labeled_df()
    result = train(df, TrainParams(n_estimators=50, early_stopping_rounds=10))
    save(result, tmp_path)
    booster, feature_order, cat_idx, version = load(tmp_path)
    assert feature_order == result.feature_order
    assert cat_idx == result.categorical_indices
    assert isinstance(version, str) and len(version) == 8

    sample = UcsFeatures(
        motor_load_ratio_max=1.0,
        motor_load_ratio_mean=0.4,
        motor_load_ratio_std=0.2,
        cycle_intensity=1.0,
        velocity_intensity_max=0.3,
        torque_load_ratio_max=0.4,
        temp_delta_normalized_max=0.1,
        temp_delta_normalized_mean=0.05,
        tcp_force_norm=1.5,
        tracking_error_rms=0.001,
        thermal_state="warm",
        payload_class="light",
    )
    pred_a, _ = predict_one(result.booster, result.feature_order, sample)
    pred_b, _ = predict_one(booster, feature_order, sample)
    assert pred_a == pytest.approx(pred_b, rel=1e-9)


def test_predict_clip_lo(tmp_path):
    """Erzwinge ein Modell, das negative log-Werte predicted → multiplier < CLIP_LO."""
    rows = []
    for i in range(40):
        rows.append(
            {
                "motor_load_ratio_max": 0.05,
                "motor_load_ratio_mean": 0.01,
                "motor_load_ratio_std": 0.01,
                "cycle_intensity": 0.5,
                "velocity_intensity_max": 0.1,
                "torque_load_ratio_max": 0.1,
                "temp_delta_normalized_max": -0.1,
                "temp_delta_normalized_mean": -0.1,
                "tcp_force_norm": 0.5,
                "tracking_error_rms": 1e-4,
                "thermal_state": "warm",
                "payload_class": "light",
                "wear_rate_multiplier": 0.05,  # very low → log < log(CLIP_LO)
                "split": "train" if i < 30 else "val",
                "speed": "halfspeed",
            }
        )
    df = pd.DataFrame(rows)
    result = train(df, TrainParams(n_estimators=30, early_stopping_rounds=5))
    sample = UcsFeatures(
        motor_load_ratio_max=0.05,
        motor_load_ratio_mean=0.01,
        motor_load_ratio_std=0.01,
        cycle_intensity=0.5,
        velocity_intensity_max=0.1,
        torque_load_ratio_max=0.1,
        temp_delta_normalized_max=-0.1,
        temp_delta_normalized_mean=-0.1,
        tcp_force_norm=0.5,
        tracking_error_rms=1e-4,
        thermal_state="warm",
        payload_class="light",
    )
    multiplier, clipped = predict_one(result.booster, result.feature_order, sample)
    assert multiplier == pytest.approx(CLIP_LO)
    assert clipped is True


def test_predict_no_clip_for_normal_input():
    df = _synthetic_labeled_df()
    result = train(df, TrainParams(n_estimators=50, early_stopping_rounds=10))
    sample = UcsFeatures(
        motor_load_ratio_max=1.0,
        motor_load_ratio_mean=0.4,
        motor_load_ratio_std=0.2,
        cycle_intensity=1.0,
        velocity_intensity_max=0.3,
        torque_load_ratio_max=0.4,
        temp_delta_normalized_max=0.1,
        temp_delta_normalized_mean=0.05,
        tcp_force_norm=1.5,
        tracking_error_rms=0.001,
        thermal_state="warm",
        payload_class="light",
    )
    multiplier, clipped = predict_one(result.booster, result.feature_order, sample)
    assert CLIP_LO < multiplier < CLIP_HI
    assert clipped is False
