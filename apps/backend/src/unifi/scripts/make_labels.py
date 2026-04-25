"""Schritt 2 der Wear-Rate-Pipeline: gefensterte Parquet → gelabelte Parquet.

Wendet die Physik-Formel (Basquin × Arrhenius × Zyklusrate) auf alle Rows an,
verankert den Median über die Anker-Konfig (warm × fullspeed × light × Train),
und schreibt eine zusätzliche `wear_rate_multiplier`-Spalte.

Ankert ausschließlich auf Train-Rows der Anker-Config — niemals Val/Holdout
(Leakage-Vermeidung). Holdout-Rows kriegen trotzdem ein Label für die spätere
Demo, fließen aber nicht in die Verankerung ein.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from unifi.core.config import get_settings
from unifi.labels.physics import (
    LabelParams,
    anchor_multiplier,
    compute_raw_multiplier_series,
)
from unifi.ucs.schema import UcsDatasheet


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--windows", type=Path, default=settings.artifacts_dir / "ur5_windows.parquet"
    )
    parser.add_argument("--datasheet", type=Path, default=settings.ur5_datasheet_path)
    parser.add_argument(
        "--out", type=Path, default=settings.artifacts_dir / "ur5_labeled.parquet"
    )
    parser.add_argument(
        "--stats-out", type=Path, default=settings.artifacts_dir / "label_stats.json"
    )
    parser.add_argument("--alpha", type=float, default=2.5)
    parser.add_argument("--k", type=float, default=0.05)
    parser.add_argument("--t-ref", type=float, default=30.0)
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    datasheet = UcsDatasheet.model_validate_json(args.datasheet.read_text())
    df = pd.read_parquet(args.windows)

    p = LabelParams(alpha=args.alpha, k=args.k, t_ref=args.t_ref)
    raw = compute_raw_multiplier_series(
        df["motor_current_max_A"],
        df["joint_temp_max_C"],
        df["observed_cycle_time_s"],
        datasheet,
        p,
    )

    anchor_mask = (
        (df["split"] == p.anchor_split)
        & (df["payload_class"] == p.anchor_payload_class)
        & (df["speed"] == p.anchor_speed)
        & (df["thermal_state"] == p.anchor_thermal_state)
    )
    multiplier, stats = anchor_multiplier(raw, anchor_mask)
    df["wear_rate_multiplier"] = multiplier
    df.to_parquet(args.out, index=False)

    bucket_means = (
        df.groupby(["payload_class", "speed", "thermal_state", "split"])[
            "wear_rate_multiplier"
        ]
        .agg(["mean", "median", "count"])
        .round(3)
    )

    full_stats = {
        "params": {
            "alpha": p.alpha,
            "k": p.k,
            "t_ref": p.t_ref,
            "anchor_payload_class": p.anchor_payload_class,
            "anchor_speed": p.anchor_speed,
            "anchor_thermal_state": p.anchor_thermal_state,
            "anchor_split": p.anchor_split,
        },
        **stats,
        "bucket_means": {
            "|".join(map(str, k)): v
            for k, v in bucket_means["mean"].to_dict().items()
        },
    }
    args.stats_out.write_text(json.dumps(full_stats, indent=2))

    print(f"=== {args.out} ===")
    print(f"Anchor n={stats['anchor_n']}  raw_median={stats['anchor_median_raw']:.4f}")
    print(
        f"Multiplier quantiles  p05={stats['multiplier_p05']:.3f}  "
        f"p50={stats['multiplier_p50']:.3f}  p95={stats['multiplier_p95']:.3f}"
    )
    print("\nBucket means:")
    print(bucket_means.to_string())


if __name__ == "__main__":
    main()
