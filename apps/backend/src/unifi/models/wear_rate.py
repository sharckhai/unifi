"""LightGBM-Wear-Rate-Modell — Train, Save, Load, Predict.

Loss: RMSE auf log(wear_rate_multiplier). Inferenz: clip(exp(pred), 0.3, 5.0).

Categoricals (`thermal_state`, `payload_class`) werden integer-encoded und
LightGBM via `categorical_feature` mitgeteilt. Encoding-Map ist Train- und
Inferenz-symmetrisch.

Siehe `docs/research/wear-rate-training.md` § 4.
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import asdict, dataclass, field
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from unifi.ucs.schema import UcsFeatures

CLIP_LO: float = 0.3
CLIP_HI: float = 5.0

CATEGORICAL_MAP: dict[str, dict[str, int]] = {
    "thermal_state": {"cold": 0, "warm": 1},
    "payload_class": {"light": 0, "heavy": 1},
}

BOOSTER_FILE = "wear_rate_lgbm.txt"
SCHEMA_FILE = "feature_schema.json"
STATS_FILE = "train_stats.json"


@dataclass(frozen=True)
class TrainParams:
    num_leaves: int = 15
    learning_rate: float = 0.05
    n_estimators: int = 300
    min_data_in_leaf: int = 20
    feature_fraction: float = 0.9
    bagging_fraction: float = 0.9
    bagging_freq: int = 5
    early_stopping_rounds: int = 30
    seed: int = 42


@dataclass
class TrainResult:
    booster: lgb.Booster
    feature_order: list[str]
    categorical_indices: list[int]
    val_rmse_log: float
    val_rmse: float
    quantiles: dict[str, float]
    bucket_means: dict[str, float]
    n_train: int
    n_val: int
    params: TrainParams = field(default_factory=TrainParams)


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """Integer-encode `thermal_state` und `payload_class` für LightGBM."""
    out = df.copy()
    for col, mapping in CATEGORICAL_MAP.items():
        if col in out.columns:
            out[col] = out[col].map(mapping).astype("int64")
    return out


def _categorical_indices(feature_order: list[str]) -> list[int]:
    return [feature_order.index(c) for c in CATEGORICAL_MAP if c in feature_order]


def _bucket_means_from_predictions(
    df: pd.DataFrame, pred_multiplier: np.ndarray
) -> dict[str, float]:
    tmp = df.copy()
    tmp["_pred"] = pred_multiplier
    grouped = tmp.groupby(["payload_class", "speed", "thermal_state"])["_pred"].mean()
    return {"|".join(map(str, k)): float(v) for k, v in grouped.items()}


def train(labeled: pd.DataFrame, params: TrainParams | None = None) -> TrainResult:
    """Trainiere LightGBM auf Train-Rows, validiere auf Val-Rows.

    Erwartet Spalten aus `make_labels.py`-Output (alle UcsFeatures-Felder,
    `wear_rate_multiplier`, `split`, kategoriale Originale `thermal_state`,
    `payload_class`, `speed`).
    """
    if params is None:
        params = TrainParams()
    feature_order = UcsFeatures.feature_order()
    cat_indices = _categorical_indices(feature_order)

    encoded = encode_categoricals(labeled)
    train_df = encoded[encoded["split"] == "train"]
    val_df = encoded[encoded["split"] == "val"]
    if train_df.empty or val_df.empty:
        raise ValueError(
            f"Need both train and val rows; got n_train={len(train_df)} n_val={len(val_df)}"
        )
    if (train_df["wear_rate_multiplier"] <= 0).any() or (val_df["wear_rate_multiplier"] <= 0).any():
        raise ValueError("wear_rate_multiplier must be > 0 in all train/val rows")

    x_train = train_df[feature_order].to_numpy(dtype=np.float64)
    y_train_log = np.log(train_df["wear_rate_multiplier"].to_numpy(dtype=np.float64))
    x_val = val_df[feature_order].to_numpy(dtype=np.float64)
    y_val_log = np.log(val_df["wear_rate_multiplier"].to_numpy(dtype=np.float64))

    train_set = lgb.Dataset(
        x_train,
        label=y_train_log,
        feature_name=feature_order,
        categorical_feature=cat_indices,
        free_raw_data=False,
    )
    val_set = lgb.Dataset(
        x_val,
        label=y_val_log,
        reference=train_set,
        feature_name=feature_order,
        categorical_feature=cat_indices,
        free_raw_data=False,
    )

    booster = lgb.train(
        params={
            "objective": "regression",
            "metric": "rmse",
            "num_leaves": params.num_leaves,
            "learning_rate": params.learning_rate,
            "min_data_in_leaf": params.min_data_in_leaf,
            "feature_fraction": params.feature_fraction,
            "bagging_fraction": params.bagging_fraction,
            "bagging_freq": params.bagging_freq,
            "seed": params.seed,
            "verbosity": -1,
        },
        train_set=train_set,
        num_boost_round=params.n_estimators,
        valid_sets=[val_set],
        valid_names=["val"],
        callbacks=[lgb.early_stopping(params.early_stopping_rounds, verbose=False)],
    )

    pred_val_log = booster.predict(x_val)
    val_rmse_log = float(np.sqrt(np.mean((pred_val_log - y_val_log) ** 2)))
    pred_val_mult = np.clip(np.exp(pred_val_log), CLIP_LO, CLIP_HI)
    val_rmse = float(np.sqrt(np.mean((pred_val_mult - val_df["wear_rate_multiplier"]) ** 2)))

    quantiles = {
        "p05": float(np.quantile(pred_val_mult, 0.05)),
        "p50": float(np.quantile(pred_val_mult, 0.50)),
        "p95": float(np.quantile(pred_val_mult, 0.95)),
    }
    bucket_means = _bucket_means_from_predictions(val_df, pred_val_mult)

    return TrainResult(
        booster=booster,
        feature_order=feature_order,
        categorical_indices=cat_indices,
        val_rmse_log=val_rmse_log,
        val_rmse=val_rmse,
        quantiles=quantiles,
        bucket_means=bucket_means,
        n_train=len(train_df),
        n_val=len(val_df),
        params=params,
    )


def _file_version(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def save(result: TrainResult, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    booster_path = out_dir / BOOSTER_FILE
    result.booster.save_model(str(booster_path))
    version = _file_version(booster_path)

    schema = {
        "feature_order": result.feature_order,
        "categorical_indices": result.categorical_indices,
        "categorical_map": CATEGORICAL_MAP,
        "clip_lo": CLIP_LO,
        "clip_hi": CLIP_HI,
        "model_version": version,
    }
    (out_dir / SCHEMA_FILE).write_text(json.dumps(schema, indent=2))

    stats = {
        "params": asdict(result.params),
        "n_train": result.n_train,
        "n_val": result.n_val,
        "val_rmse_log": result.val_rmse_log,
        "val_rmse": result.val_rmse,
        "quantiles": result.quantiles,
        "bucket_means": result.bucket_means,
        "model_version": version,
    }
    (out_dir / STATS_FILE).write_text(json.dumps(stats, indent=2))


def load(artifacts_dir: Path) -> tuple[lgb.Booster, list[str], list[int], str]:
    booster_path = artifacts_dir / BOOSTER_FILE
    schema_path = artifacts_dir / SCHEMA_FILE
    if not booster_path.exists() or not schema_path.exists():
        raise FileNotFoundError(f"Wear-rate model artifacts missing in {artifacts_dir}")
    booster = lgb.Booster(model_file=str(booster_path))
    schema = json.loads(schema_path.read_text())
    return (
        booster,
        schema["feature_order"],
        schema["categorical_indices"],
        schema["model_version"],
    )


def predict_one(
    booster: lgb.Booster,
    feature_order: list[str],
    features: UcsFeatures,
) -> tuple[float, bool]:
    """Predict für einen einzelnen UcsFeatures-Vektor.

    Returns:
        (multiplier, was_clipped) — multiplier ist auf [CLIP_LO, CLIP_HI] geklemmt.
    """
    raw = features.model_dump()
    encoded = {
        k: (CATEGORICAL_MAP[k][v] if k in CATEGORICAL_MAP else v) for k, v in raw.items()
    }
    vec = np.array([[encoded[k] for k in feature_order]], dtype=np.float64)
    pred_log = float(booster.predict(vec)[0])
    raw_mult = math.exp(pred_log)
    clipped_mult = max(CLIP_LO, min(CLIP_HI, raw_mult))
    return clipped_mult, raw_mult != clipped_mult
