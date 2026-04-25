"""UR5-NIST CSV-Loader und Filename-Parser.

Liest die `_flat.csv`-Dateien (vorprozessiert von
`data/nist-ur5-degradation/normalize.py`) und parst die Run-Metadaten aus dem
Filename (Coldstart / Speed / Payload / Run-Index).
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import pandas as pd

# Authoritative column order of the UR5 _flat.csv files.
# Source of truth: data/nist-ur5-degradation/normalize.py
UR5_COLUMNS: tuple[str, ...] = tuple(
    ["ROBOT_TIME"]
    + [f"ROBOT_TARGET_JOINT_POSITIONS_J{i}" for i in range(1, 7)]
    + [f"ROBOT_ACTUAL_JOINT_POSITIONS_J{i}" for i in range(1, 7)]
    + [f"ROBOT_TARGET_JOINT_VELOCITIES_J{i}" for i in range(1, 7)]
    + [f"ROBOT_ACTUAL_JOINT_VELOCITIES_J{i}" for i in range(1, 7)]
    + [f"ROBOT_TARGET_JOINT_CURRENT_J{i}" for i in range(1, 7)]
    + [f"ROBOT_ACTUAL_JOINT_CURRENT_J{i}" for i in range(1, 7)]
    + [f"ROBOT_TARGET_JOINT_ACCELERATIONS_J{i}" for i in range(1, 7)]
    + [f"ROBOT_TARGET_JOINT_TORQUES_J{i}" for i in range(1, 7)]
    + [f"ROBOT_JOINT_CONTROL_CURRENT_J{i}" for i in range(1, 7)]
    + [f"ROBOT_CARTESIAN_COORD_TOOL_{a}" for a in ("x", "y", "z", "rx", "ry", "rz")]
    + [f"ROBOT_TCP_FORCE_{a}" for a in ("x", "y", "z", "rx", "ry", "rz")]
    + [f"ROBOT_JOINT_TEMP_J{i}" for i in range(1, 7)]
)
assert len(UR5_COLUMNS) == 73

# UCS-Field → UR5-Roh-Spaltennamen. Fließt in Normalizer und Aggregations-Auswahl.
UR5_TELEMETRY_MAP: dict[str, list[str]] = {
    "t_s": ["ROBOT_TIME"],
    "joint_currents": [f"ROBOT_ACTUAL_JOINT_CURRENT_J{i}" for i in range(1, 7)],
    "joint_positions": [f"ROBOT_ACTUAL_JOINT_POSITIONS_J{i}" for i in range(1, 7)],
    "joint_positions_target": [f"ROBOT_TARGET_JOINT_POSITIONS_J{i}" for i in range(1, 7)],
    "joint_velocities": [f"ROBOT_ACTUAL_JOINT_VELOCITIES_J{i}" for i in range(1, 7)],
    "joint_temperatures": [f"ROBOT_JOINT_TEMP_J{i}" for i in range(1, 7)],
    "joint_torques": [f"ROBOT_TARGET_JOINT_TORQUES_J{i}" for i in range(1, 7)],
    "tcp_pose": [f"ROBOT_CARTESIAN_COORD_TOOL_{a}" for a in ("x", "y", "z", "rx", "ry", "rz")],
    "tcp_force": [f"ROBOT_TCP_FORCE_{a}" for a in ("x", "y", "z", "rx", "ry", "rz")],
}

# Per-Joint-Tracking-Error-Spalten, die `enrich_ur5_df` nachträglich anhängt.
TRACKING_ERROR_COLS: list[str] = [f"TRACKING_ERROR_J{i}" for i in range(1, 7)]

RUN_TAG_RE = re.compile(
    r"ur5testresult(coldstart)?(fullspeed|halfspeed)payload(\d+)lb(\d)_flat\.csv"
)


@dataclass(frozen=True)
class RunMeta:
    file: str
    payload_lb: int
    speed: Literal["fullspeed", "halfspeed"]
    coldstart: bool
    run_idx: int


def parse_filename(filename: str) -> RunMeta:
    m = RUN_TAG_RE.fullmatch(filename)
    if not m:
        raise ValueError(f"Filename does not match UR5 pattern: {filename}")
    cold, speed, payload, run = m.groups()
    return RunMeta(
        file=filename,
        payload_lb=int(payload),
        speed=speed,  # type: ignore[arg-type]
        coldstart=bool(cold),
        run_idx=int(run),
    )


def list_ur5_files(data_dir: Path) -> list[Path]:
    return sorted(data_dir.glob("ur5testresult*_flat.csv"))


def load_ur5_run(path: Path) -> tuple[pd.DataFrame, RunMeta]:
    df = pd.read_csv(path)
    if tuple(df.columns) != UR5_COLUMNS:
        raise ValueError(
            f"Schema drift in {path.name}: expected {len(UR5_COLUMNS)} cols, got {len(df.columns)}"
        )
    df = df.dropna().reset_index(drop=True)
    return df, parse_filename(path.name)


def enrich_ur5_df(df: pd.DataFrame) -> pd.DataFrame:
    """Hängt pro Joint die Tracking-Error-Spalte an (target − actual position, in rad)."""
    df = df.copy()
    for i in range(1, 7):
        df[f"TRACKING_ERROR_J{i}"] = (
            df[f"ROBOT_TARGET_JOINT_POSITIONS_J{i}"] - df[f"ROBOT_ACTUAL_JOINT_POSITIONS_J{i}"]
        )
    return df


def aggregation_columns() -> list[str]:
    """Spaltenliste, über die `compute_window_aggregates` Stats rechnet.

    Beinhaltet Joint-Sensoren + TCP-Force + abgeleitete Tracking-Error-Spalten.
    Joint-Positionen selbst gehen nicht direkt rein — sie werden über
    `TRACKING_ERROR_J*` aggregiert.
    """
    cols: list[str] = []
    for key in (
        "joint_currents",
        "joint_velocities",
        "joint_temperatures",
        "joint_torques",
    ):
        cols.extend(UR5_TELEMETRY_MAP[key])
    cols.extend(UR5_TELEMETRY_MAP["tcp_force"])
    cols.extend(TRACKING_ERROR_COLS)
    return cols


def iter_runs(files: Iterable[Path]) -> Iterable[tuple[pd.DataFrame, RunMeta]]:
    for path in files:
        df, meta = load_ur5_run(path)
        yield enrich_ur5_df(df), meta
