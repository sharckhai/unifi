"""Sequentieller Window-Sampler für den Pick-Simulator.

Lädt beim Startup die Holdout-Windows aus `ur5_windows.parquet` und gibt sie
pro `pop()` in zeitlicher Reihenfolge heraus. Bei Erschöpfung wrappt der Cursor
zurück auf 0.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import pandas as pd

from unifi.ucs.schema import UcsFeatures

Speed = Literal["fullspeed", "halfspeed"]

# Untere Schwelle für `velocity_intensity_max` — Stillstand-Frames (insb.
# Window 0 vor Bewegungsbeginn) werden ausgefiltert, damit Demo-Picks immer
# auf bewegten Frames basieren. Normale Windows haben median ~0.17.
MIN_VELOCITY_INTENSITY: float = 0.05

# Obere Schwelle für `motor_load_ratio_max` — Peak-Last-Frames im Source-Run
# (RMS-Strom ≈ rated_current) erzeugen nach Re-Normalisierung auf größere
# Pick-Gewichte garantiert Cap-Hits beim Wear-Multiplier. Filter sorgt dafür,
# dass der Demo-Chart nicht durch geclippte Outlier dominiert wird.
MAX_MOTOR_LOAD_RATIO: float = 0.92


@dataclass(frozen=True)
class WindowSample:
    features: UcsFeatures
    payload_lb: int
    speed: Speed
    file: str
    window_idx: int


class WindowSampler:
    def __init__(self, samples: list[WindowSample]) -> None:
        if not samples:
            raise ValueError("WindowSampler needs at least one sample")
        self._samples = samples
        self._cursor = 0
        self._lock = threading.Lock()

    @classmethod
    def from_parquet(
        cls, path: Path, splits: tuple[str, ...] = ("holdout",)
    ) -> WindowSampler:
        df = pd.read_parquet(path)
        df = df[df["split"].isin(splits)]
        df = df[df["velocity_intensity_max"] >= MIN_VELOCITY_INTENSITY]
        df = df[df["motor_load_ratio_max"] < MAX_MOTOR_LOAD_RATIO]
        df = df.sort_values("t_start_s").reset_index(drop=True)
        feature_keys = UcsFeatures.feature_order()
        samples: list[WindowSample] = []
        for _, row in df.iterrows():
            features = UcsFeatures(**{k: row[k] for k in feature_keys})
            samples.append(
                WindowSample(
                    features=features,
                    payload_lb=int(row["payload_lb"]),
                    speed=row["speed"],
                    file=row["file"],
                    window_idx=int(row["window_idx"]),
                )
            )
        return cls(samples)

    @property
    def total(self) -> int:
        return len(self._samples)

    @property
    def cursor(self) -> int:
        return self._cursor

    def pop(self) -> WindowSample:
        with self._lock:
            sample = self._samples[self._cursor]
            self._cursor = (self._cursor + 1) % len(self._samples)
        return sample

    def reset(self) -> None:
        with self._lock:
            self._cursor = 0
