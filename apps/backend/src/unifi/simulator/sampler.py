"""Mean-Vector Sampler für synthetische Pick-Daten.

Berechnet beim Startup Mean & Std aller gefilterten Holdout-Windows (Filter-
Stack: split, velocity, motor_load) und synthetisiert pro `pop()` einen
Feature-Vektor als `mean + NOISE_SCALE * std * N(0,1)`. Die natürliche
Window-zu-Window-Varianz aus den realen NIST-Daten wird damit ersetzt durch
ein deterministisches, eng gefasstes Sampling rund um den Holdout-Mittelwert.

Categorical Features (`thermal_state`, `payload_class`) werden auf den Modus
des Holdouts fixiert. `payload_lb`, `speed`, `file` reflektieren die Source.

Determinismus: jeder Cursor-Index seedet `np.random.default_rng(base_seed +
cursor)`, sodass `reset()` exakt dieselbe Pick-Sequenz reproduziert.
"""

from __future__ import annotations

import threading
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd

from unifi.ucs.schema import UcsFeatures

Speed = Literal["fullspeed", "halfspeed"]

# Untere Schwelle für `velocity_intensity_max` — Stillstand-Frames (insb.
# Window 0 vor Bewegungsbeginn) werden ausgefiltert, damit der Mean nicht
# durch unbewegte Frames verzerrt wird. Normale Windows haben median ~0.17.
MIN_VELOCITY_INTENSITY: float = 0.05

# Obere Schwelle für `motor_load_ratio_max` — Peak-Last-Frames im Source-Run
# (RMS-Strom ≈ rated_current) würden den Mean und nach Re-Normalisierung auf
# größere Pick-Gewichte den Wear-Multiplier ans Cap drücken.
MAX_MOTOR_LOAD_RATIO: float = 0.92

# Anteil der natürlichen Holdout-Std, der als Gaussian Noise pro Pop addiert
# wird. 0.15 sorgt für leichte sichtbare Varianz im Frontend-Chart, ohne dass
# gleiche (kg, dauer)-Inputs stark unterschiedliche Multiplikatoren liefern.
NOISE_SCALE: float = 0.15

# Cursor-Wrap-Länge im synthetischen Modus. Lang genug, dass eine Demo-Session
# nicht in spürbare Wiederholung läuft.
SYNTHETIC_CYCLE_LENGTH: int = 100

# Pydantic-Felder mit `ge=0`-Constraint — Noise-Sample muss geclamped werden.
_NON_NEGATIVE_FEATURES: frozenset[str] = frozenset({
    "motor_load_ratio_max",
    "motor_load_ratio_mean",
    "motor_load_ratio_std",
    "cycle_intensity",
    "velocity_intensity_max",
    "torque_load_ratio_max",
    "tcp_force_norm",
    "tracking_error_rms",
})


@dataclass(frozen=True)
class WindowSample:
    features: UcsFeatures
    payload_lb: int
    speed: Speed
    file: str
    window_idx: int


@dataclass(frozen=True)
class _MeanProfile:
    numeric_mean: dict[str, float]
    numeric_std: dict[str, float]
    thermal_state: str
    payload_class: str
    payload_lb: int
    speed: Speed
    file: str
    source_n: int


class WindowSampler:
    def __init__(
        self,
        profile: _MeanProfile,
        cycle_length: int = SYNTHETIC_CYCLE_LENGTH,
        noise_scale: float = NOISE_SCALE,
        base_seed: int = 0,
    ) -> None:
        self._profile = profile
        self._cycle_length = cycle_length
        self._noise_scale = noise_scale
        self._base_seed = base_seed
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
        if df.empty:
            raise ValueError("WindowSampler: kein Window nach Filter übrig")

        feature_keys = UcsFeatures.feature_order()
        numeric_keys = [k for k in feature_keys if k not in ("thermal_state", "payload_class")]

        numeric_mean = {k: float(df[k].mean()) for k in numeric_keys}
        numeric_std = {k: float(df[k].std(ddof=0)) for k in numeric_keys}

        thermal_state = Counter(df["thermal_state"]).most_common(1)[0][0]
        payload_class = Counter(df["payload_class"]).most_common(1)[0][0]
        payload_lb = int(Counter(df["payload_lb"]).most_common(1)[0][0])
        speed: Speed = Counter(df["speed"]).most_common(1)[0][0]
        file = Counter(df["file"]).most_common(1)[0][0]

        profile = _MeanProfile(
            numeric_mean=numeric_mean,
            numeric_std=numeric_std,
            thermal_state=thermal_state,
            payload_class=payload_class,
            payload_lb=payload_lb,
            speed=speed,
            file=file,
            source_n=len(df),
        )
        return cls(profile)

    @property
    def total(self) -> int:
        return self._cycle_length

    @property
    def cursor(self) -> int:
        return self._cursor

    @property
    def source_n(self) -> int:
        return self._profile.source_n

    def pop(self) -> WindowSample:
        with self._lock:
            cursor = self._cursor
            self._cursor = (self._cursor + 1) % self._cycle_length

        rng = np.random.default_rng(self._base_seed + cursor)
        feats: dict[str, object] = {}
        for key, mean in self._profile.numeric_mean.items():
            std = self._profile.numeric_std[key]
            value = mean + self._noise_scale * std * float(rng.standard_normal())
            if key in _NON_NEGATIVE_FEATURES:
                value = max(0.0, value)
            feats[key] = value
        feats["thermal_state"] = self._profile.thermal_state
        feats["payload_class"] = self._profile.payload_class

        return WindowSample(
            features=UcsFeatures(**feats),
            payload_lb=self._profile.payload_lb,
            speed=self._profile.speed,
            file=self._profile.file,
            window_idx=cursor,
        )

    def reset(self) -> None:
        with self._lock:
            self._cursor = 0
