"""Schritt 1 der Wear-Rate-Pipeline: Roh-CSV → gefensterte UCS-Feature-Parquet.

Liest alle 18 UR5-`_flat.csv`-Files, fenstert in 2 s-Blöcke, aggregiert pro
Spalte 7 Stats, normalisiert auf `UcsFeatures` und weist Train/Val/Holdout-
Splits zu (Holdout = 1 ganzes File, restliche stratifiziert nach
payload × speed × coldstart).

Output: `artifacts/ur5_windows.parquet` mit Run-Meta, Roh-Schlüsseln für die
Label-Berechnung und allen UcsFeatures-Spalten.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from unifi.core.config import get_settings
from unifi.data.ur5_loader import (
    UR5_TELEMETRY_MAP,
    aggregation_columns,
    enrich_ur5_df,
    list_ur5_files,
    load_ur5_run,
)
from unifi.data.windowing import compute_window_aggregates, iter_windows
from unifi.ucs.normalizer import SPEED_CYCLE_FACTOR, _peak, _stat, window_to_ucs_features
from unifi.ucs.schema import UcsDatasheet


def _max_motor_current(agg: dict[str, float]) -> float:
    return max(_peak(agg, c) for c in UR5_TELEMETRY_MAP["joint_currents"])


def _max_joint_temp(agg: dict[str, float]) -> float:
    return max(_stat(agg, c, "vMax") for c in UR5_TELEMETRY_MAP["joint_temperatures"])


def _mean_joint_temp(agg: dict[str, float]) -> float:
    cols = UR5_TELEMETRY_MAP["joint_temperatures"]
    return sum(_stat(agg, c, "value") for c in cols) / len(cols)


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=settings.ur5_dir)
    parser.add_argument("--datasheet", type=Path, default=settings.ur5_datasheet_path)
    parser.add_argument("--window-s", type=float, default=2.0)
    parser.add_argument(
        "--out", type=Path, default=settings.artifacts_dir / "ur5_windows.parquet"
    )
    parser.add_argument(
        "--holdout-pattern",
        default="halfspeedpayload45lb3",
        help="Substring im Filename, der das Holdout-File markiert (Coldstart wird ausgenommen).",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--val-frac", type=float, default=0.2)
    args = parser.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    datasheet = UcsDatasheet.model_validate_json(args.datasheet.read_text())
    files = list_ur5_files(args.data_dir)
    if not files:
        raise FileNotFoundError(f"No UR5 _flat.csv files in {args.data_dir}")

    print(f"Found {len(files)} UR5 files in {args.data_dir}")

    agg_cols = aggregation_columns()
    rows: list[dict] = []
    for path in files:
        df, meta = load_ur5_run(path)
        df = enrich_ur5_df(df)
        is_holdout = (args.holdout_pattern in path.name) and (not meta.coldstart)
        for window_idx, (t_start, t_end, chunk) in enumerate(iter_windows(df, args.window_s)):
            agg = compute_window_aggregates(chunk, agg_cols)
            features = window_to_ucs_features(agg, datasheet, meta)
            rows.append(
                {
                    "file": meta.file,
                    "payload_lb": meta.payload_lb,
                    "speed": meta.speed,
                    "coldstart": meta.coldstart,
                    "run_idx": meta.run_idx,
                    "window_idx": window_idx,
                    "t_start_s": t_start,
                    "t_end_s": t_end,
                    "split": "holdout" if is_holdout else "_pending",
                    "motor_current_max_A": _max_motor_current(agg),
                    "joint_temp_max_C": _max_joint_temp(agg),
                    "joint_temp_mean_C": _mean_joint_temp(agg),
                    "observed_cycle_time_s": SPEED_CYCLE_FACTOR[meta.speed]
                    * datasheet.rated_cycle_time_s,
                    **features.model_dump(),
                }
            )

    out = pd.DataFrame(rows)

    pending = out["split"] == "_pending"
    if pending.any():
        idx = out.loc[pending].index
        strata = out.loc[pending].apply(
            lambda r: f"{r.payload_lb}_{r.speed}_{r.coldstart}", axis=1
        )
        train_idx, val_idx = train_test_split(
            idx, test_size=args.val_frac, random_state=args.seed, stratify=strata
        )
        out.loc[train_idx, "split"] = "train"
        out.loc[val_idx, "split"] = "val"

    out.to_parquet(args.out, index=False)

    print(f"\n=== {args.out} ===")
    print(f"Total windows: {len(out)}")
    print(out["split"].value_counts())
    print("\n=== Strata distribution ===")
    print(
        out.groupby(["payload_lb", "speed", "coldstart", "split"]).size().to_string()
    )


if __name__ == "__main__":
    main()
