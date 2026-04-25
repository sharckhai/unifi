"""Top-k SHAP-Beiträge zum log-Wear-Multiplier aus dem LightGBM-Booster.

`Booster.predict(pred_contrib=True)` liefert pro Feature einen log-space Beitrag
plus eine Bias-Spalte am Ende. Wir geben die k größten nach `|contribution|`
zurück, mit Vorzeichen-Richtung.
"""

from __future__ import annotations

from typing import Literal

import lightgbm as lgb
import numpy as np
from pydantic import BaseModel, ConfigDict

from unifi.models.wear_rate import CATEGORICAL_MAP
from unifi.ucs.schema import UcsFeatures

Direction = Literal["increase", "decrease"]

_REVERSE_CATEGORICAL: dict[str, dict[int, str]] = {
    col: {v: k for k, v in mapping.items()} for col, mapping in CATEGORICAL_MAP.items()
}


class ShapContribution(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature: str
    contribution: float
    direction: Direction
    value: float | str


def top_k_contributions(
    booster: lgb.Booster,
    feature_order: list[str],
    features: UcsFeatures,
    k: int = 3,
) -> list[ShapContribution]:
    raw = features.model_dump()
    encoded = {
        name: (CATEGORICAL_MAP[name][v] if name in CATEGORICAL_MAP else v)
        for name, v in raw.items()
    }
    vec = np.array([[encoded[name] for name in feature_order]], dtype=np.float64)
    contribs = booster.predict(vec, pred_contrib=True)[0][:-1]

    order = np.argsort(np.abs(contribs))[::-1][:k]
    out: list[ShapContribution] = []
    for i in order:
        name = feature_order[int(i)]
        c = float(contribs[int(i)])
        if name in _REVERSE_CATEGORICAL:
            value: float | str = _REVERSE_CATEGORICAL[name][int(encoded[name])]
        else:
            value = float(raw[name])
        out.append(
            ShapContribution(
                feature=name,
                contribution=c,
                direction="increase" if c >= 0 else "decrease",
                value=value,
            )
        )
    return out
