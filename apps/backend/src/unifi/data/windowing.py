"""2 s-Window-Slicing und 7-Stat-Aggregate analog PHM-SCARA-Schema.

Statistik-Namen (`vCnt`, `vFreq`, `vMax`, `vMin`, `vStd`, `vTrend`, `value`)
folgen der PHM-Society-2021-Konvention; siehe `unifi_konzept_v2.md` und
`docs/research/wear-rate-training.md`.
"""

from __future__ import annotations

from collections.abc import Iterator

import numpy as np
import pandas as pd

STAT_NAMES: tuple[str, ...] = ("vCnt", "vFreq", "vMax", "vMin", "vStd", "vTrend", "value")


def iter_windows(
    df: pd.DataFrame, window_s: float = 2.0, time_col: str = "ROBOT_TIME"
) -> Iterator[tuple[float, float, pd.DataFrame]]:
    """Slice df in non-overlapping windows of `window_s` seconds.

    Times sind relativ zum Run-Start ausgegeben. Letztes unvollständiges Fenster
    wird verworfen.
    """
    if df.empty:
        return
    t0 = float(df[time_col].iloc[0])
    t_last = float(df[time_col].iloc[-1])
    start = t0
    while start + window_s <= t_last + 1e-9:
        end = start + window_s
        mask = (df[time_col] >= start) & (df[time_col] < end)
        chunk = df.loc[mask]
        if not chunk.empty:
            yield start - t0, end - t0, chunk
        start = end


def aggregate_column(values: np.ndarray, t: np.ndarray) -> dict[str, float]:
    """7-Stat-Aggregat über eine Spalte innerhalb eines Windows."""
    n = int(values.size)
    if n == 0:
        return {k: float("nan") for k in STAT_NAMES}
    duration = float(t[-1] - t[0]) if n > 1 else 0.0
    freq = (n - 1) / duration if duration > 0 else 0.0
    if n > 1 and duration > 0:
        slope = float(np.polyfit(t - t[0], values, 1)[0])
    else:
        slope = 0.0
    return {
        "vCnt": float(n),
        "vFreq": freq,
        "vMax": float(values.max()),
        "vMin": float(values.min()),
        "vStd": float(values.std(ddof=0)),
        "vTrend": slope,
        "value": float(values.mean()),
    }


def compute_window_aggregates(
    chunk: pd.DataFrame, columns: list[str], time_col: str = "ROBOT_TIME"
) -> dict[str, float]:
    """Flat dict mit Keys `<col>_<stat>`."""
    t = chunk[time_col].to_numpy()
    out: dict[str, float] = {}
    for col in columns:
        for stat, value in aggregate_column(chunk[col].to_numpy(), t).items():
            out[f"{col}_{stat}"] = value
    return out
