"""Restwert-Engine — reine Arithmetik, kein ML.

`combined_decay = max(use_consumed, age_consumed)` — die schnellere Uhr
gewinnt. Linear (`residual = cost_new · (1 − decay)`) oder degressiv
(`residual = cost_new · exp(-k · decay)`), gefloort auf einen
Schrottwert-Mindestanteil.
"""

from __future__ import annotations

import math

from unifi.residual.schema import (
    CLASS_LIFETIME_YEARS,
    ResidualConfig,
    ResidualValue,
    RobotState,
)
from unifi.ucs.schema import UcsDatasheet


def resolve_lifetime_years(datasheet: UcsDatasheet) -> float:
    """Lifetime aus Datasheet, Fallback auf Klassen-Default."""
    if datasheet.nominal_lifetime_years is not None:
        return datasheet.nominal_lifetime_years
    return CLASS_LIFETIME_YEARS[datasheet.robot_class]


def compute_residual_value(
    *,
    datasheet: UcsDatasheet,
    state: RobotState,
    config: ResidualConfig | None = None,
) -> ResidualValue:
    config = config or ResidualConfig()
    lifetime_years = resolve_lifetime_years(datasheet)

    use_frac = min(
        1.0, state.cumulative_wear_pick_equivalents / datasheet.nominal_picks_lifetime
    )
    age_frac = min(1.0, state.age_years / lifetime_years)
    decay = max(use_frac, age_frac)

    floor_eur = datasheet.cost_new_eur * config.residual_floor_pct
    if config.use_degressive_curve:
        primary = datasheet.cost_new_eur * math.exp(-config.degressive_k * decay)
    else:
        primary = datasheet.cost_new_eur * (1.0 - decay)

    floor_active = primary < floor_eur
    residual = max(floor_eur, primary)
    annual_dep = (datasheet.cost_new_eur - residual) / max(state.age_years, 0.1)

    return ResidualValue(
        residual_value_eur=residual,
        cost_new_eur=datasheet.cost_new_eur,
        use_consumed_fraction=use_frac,
        age_consumed_fraction=age_frac,
        combined_decay=decay,
        residual_floor_eur=floor_eur,
        floor_active=floor_active,
        annualized_depreciation_eur_per_year=annual_dep,
        nominal_lifetime_years_used=lifetime_years,
        nominal_picks_lifetime_used=datasheet.nominal_picks_lifetime,
    )
