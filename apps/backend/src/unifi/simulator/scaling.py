"""Re-Normalisierung eines gepoppten Holdout-Windows auf die Frontend-Eingaben.

Das Window kommt mit Belastungs-Features, die auf seinen Source-Run normiert sind
(Source-Payload in lb, Source-Speed). Der Frontend-Pick definiert (component_weight_kg,
pick_duration_s) und `renormalize` rechnet die linearen Last- und Geschwindigkeits-
Features um, sodass die Cost-Engine deterministisch dem Frontend-Input folgt.

Anschließend würfelt `apply_random_emphasis` einen multiplikativen Bias auf genau
ein numerisches Feature — das schiebt den dominanten SHAP-Beitrag pro Pick.
"""

from __future__ import annotations

from typing import Literal

import numpy as np

from unifi.ucs.normalizer import SPEED_CYCLE_FACTOR
from unifi.ucs.schema import PayloadClass, UcsDatasheet, UcsFeatures

LB_TO_KG: float = 0.45359237

# Empirisch aus NIST-Daten kalibriert (16 lb vs 45 lb, warm × fullspeed):
# - temp_delta_normalized_max:  Exponent 0.17
# - temp_delta_normalized_mean: Exponent 0.61
# - tracking_error_rms:         Exponent 0.08 (praktisch last-unabhängig)
# Wir nutzen einen einheitlichen Exponenten 0.4 für temp (Mittel) und lassen
# tracking unskaliert, weil reine Last die Joint-Genauigkeit kaum verändert.
# Clamp bleibt als Safety-Cap gegen out-of-spec User-Inputs.
TEMP_DELTA_EXPONENT: float = 0.4
TEMP_DELTA_CLAMP: tuple[float, float] = (-0.5, 1.0)

EMPHASIS_CANDIDATES: tuple[str, ...] = (
    "motor_load_ratio_max",
    "torque_load_ratio_max",
    "temp_delta_normalized_max",
    "tcp_force_norm",
    "tracking_error_rms",
)
EMPHASIS_FACTOR_RANGE: tuple[float, float] = (1.2, 2.0)


def _clamp(value: float, bounds: tuple[float, float]) -> float:
    lo, hi = bounds
    return max(lo, min(hi, value))


def renormalize(
    features: UcsFeatures,
    *,
    source_payload_lb: int,
    source_speed: Literal["fullspeed", "halfspeed"],
    component_weight_kg: float,
    pick_duration_s: float,
    datasheet: UcsDatasheet,
) -> UcsFeatures:
    source_payload_kg = source_payload_lb * LB_TO_KG
    source_cycle_time_s = SPEED_CYCLE_FACTOR[source_speed] * datasheet.rated_cycle_time_s

    mass_ratio = component_weight_kg / source_payload_kg
    duration_ratio = source_cycle_time_s / pick_duration_s
    mass_ratio_temp = mass_ratio ** TEMP_DELTA_EXPONENT

    payload_class: PayloadClass = (
        "heavy" if component_weight_kg > datasheet.rated_payload_kg else "light"
    )

    return features.model_copy(
        update={
            "motor_load_ratio_max": features.motor_load_ratio_max * mass_ratio,
            "motor_load_ratio_mean": features.motor_load_ratio_mean * mass_ratio,
            "motor_load_ratio_std": features.motor_load_ratio_std * mass_ratio,
            "torque_load_ratio_max": features.torque_load_ratio_max * mass_ratio,
            "tcp_force_norm": features.tcp_force_norm * mass_ratio,
            "velocity_intensity_max": features.velocity_intensity_max * duration_ratio,
            "cycle_intensity": datasheet.rated_cycle_time_s / pick_duration_s,
            "temp_delta_normalized_max": _clamp(
                features.temp_delta_normalized_max * mass_ratio_temp, TEMP_DELTA_CLAMP
            ),
            "temp_delta_normalized_mean": _clamp(
                features.temp_delta_normalized_mean * mass_ratio_temp, TEMP_DELTA_CLAMP
            ),
            "payload_class": payload_class,
        }
    )


def apply_random_emphasis(
    features: UcsFeatures, rng: np.random.Generator
) -> tuple[UcsFeatures, str, float]:
    idx = int(rng.integers(0, len(EMPHASIS_CANDIDATES)))
    feature_name = EMPHASIS_CANDIDATES[idx]
    lo, hi = EMPHASIS_FACTOR_RANGE
    factor = float(rng.uniform(lo, hi))
    biased = features.model_copy(
        update={feature_name: getattr(features, feature_name) * factor}
    )
    return biased, feature_name, factor
