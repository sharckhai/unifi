"""Schritt 3 der Wear-Rate-Pipeline: gelabelte Parquet → trainiertes LightGBM.

Liest `artifacts/ur5_labeled.parquet` aus `make_labels.py`, trainiert
LightGBM auf log(multiplier), serialisiert Booster + Feature-Schema +
Train-Stats nach `artifacts/`.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from unifi.core.config import get_settings
from unifi.models.wear_rate import TrainParams, save, train


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--labeled", type=Path, default=settings.artifacts_dir / "ur5_labeled.parquet"
    )
    parser.add_argument("--out-dir", type=Path, default=settings.artifacts_dir)
    parser.add_argument("--num-leaves", type=int, default=15)
    parser.add_argument("--learning-rate", type=float, default=0.05)
    parser.add_argument("--n-estimators", type=int, default=300)
    parser.add_argument("--min-data-in-leaf", type=int, default=20)
    parser.add_argument("--early-stopping-rounds", type=int, default=30)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    params = TrainParams(
        num_leaves=args.num_leaves,
        learning_rate=args.learning_rate,
        n_estimators=args.n_estimators,
        min_data_in_leaf=args.min_data_in_leaf,
        early_stopping_rounds=args.early_stopping_rounds,
        seed=args.seed,
    )

    df = pd.read_parquet(args.labeled)
    result = train(df, params)
    save(result, args.out_dir)

    print(f"=== {args.out_dir} ===")
    print(f"n_train={result.n_train}  n_val={result.n_val}")
    print(f"val_rmse_log={result.val_rmse_log:.4f}  val_rmse={result.val_rmse:.4f}")
    print(
        f"Predicted multiplier quantiles  p05={result.quantiles['p05']:.3f}  "
        f"p50={result.quantiles['p50']:.3f}  p95={result.quantiles['p95']:.3f}"
    )
    print("\nVal-Bucket means (predicted):")
    print(json.dumps(result.bucket_means, indent=2))


if __name__ == "__main__":
    main()
