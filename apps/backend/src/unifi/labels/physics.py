"""Physikalisch motivierte Wear-Rate-Labels.

Verschleiß = `load_factor · thermal_factor · cycle_factor`, anschließend
median-verankert auf `warm-fullspeed-light-Train-Windows ≡ 1.0×`.

Siehe `docs/research/wear-rate-training.md` § 1.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
import pandas as pd

from unifi.ucs.schema import UcsDatasheet


@dataclass(frozen=True)
class LabelParams:
    alpha: float = 2.5
    k: float = 0.05
    t_ref: float = 30.0
    anchor_payload_class: str = "light"
    anchor_speed: str = "fullspeed"
    anchor_thermal_state: str = "warm"
    anchor_split: str = "train"


def compute_raw_multiplier(
    motor_current_max_A: float,
    joint_temp_max_C: float,
    observed_cycle_time_s: float,
    datasheet: UcsDatasheet,
    p: LabelParams,
) -> float:
    load = (motor_current_max_A / datasheet.rated_current_a) ** p.alpha
    thermal = math.exp(p.k * (joint_temp_max_C - p.t_ref))
    cycle = datasheet.rated_cycle_time_s / observed_cycle_time_s
    return load * thermal * cycle


def compute_raw_multiplier_series(
    motor_current_max_A: pd.Series,
    joint_temp_max_C: pd.Series,
    observed_cycle_time_s: pd.Series,
    datasheet: UcsDatasheet,
    p: LabelParams,
) -> pd.Series:
    load = (motor_current_max_A / datasheet.rated_current_a) ** p.alpha
    thermal = np.exp(p.k * (joint_temp_max_C - p.t_ref))
    cycle = datasheet.rated_cycle_time_s / observed_cycle_time_s
    return load * thermal * cycle


def anchor_multiplier(raw: pd.Series, anchor_mask: pd.Series) -> tuple[pd.Series, dict]:
    n = int(anchor_mask.sum())
    if n == 0:
        raise ValueError("anchor_mask selects 0 rows — cannot anchor")
    anchor_median_raw = float(raw[anchor_mask].median())
    multiplier = raw / anchor_median_raw
    return multiplier, {
        "anchor_n": n,
        "anchor_median_raw": anchor_median_raw,
        "multiplier_p05": float(multiplier.quantile(0.05)),
        "multiplier_p50": float(multiplier.quantile(0.50)),
        "multiplier_p95": float(multiplier.quantile(0.95)),
    }
