"""Cost-per-Pick-Engine — reine Arithmetik, kein ML.

Vier Komponenten, alle aus Datasheet + Operating-/Finance-Konfig + dynamischem
Wear-Rate-Multiplier ableitbar:

    energy_eur      = power_w/1000 · motor_load · cycle_time_s · price/3600
    wear_eur        = cost_new/lifetime · wear_rate_multiplier
    capital_eur     = cost_new · interest_rate / lifetime
    maintenance_eur = cost_new · maintenance_pct / picks_per_year
    total_eur       = sum

Worked-Example-Anker (UR5, multiplier=1.0, load=1.0, cycle=2 s) ≈ 0.002 €/Pick.
Siehe `docs/research/wear-rate-training.md` und `docs/research/datasheet-data-and-finance.md`.
"""

from __future__ import annotations

from unifi.cost.schema import (
    CLASS_POWER_DEFAULT_W,
    CostBreakdown,
    FinanceConfig,
    OperatingProfile,
)
from unifi.ucs.schema import UcsDatasheet


def resolve_power_w(datasheet: UcsDatasheet) -> float:
    """Power aus Datasheet, Fallback auf Klassen-Default."""
    if datasheet.power_consumption_w is not None:
        return datasheet.power_consumption_w
    return CLASS_POWER_DEFAULT_W[datasheet.robot_class]


def compute_cost_per_pick(
    *,
    datasheet: UcsDatasheet,
    wear_rate_multiplier: float,
    motor_load_ratio_max: float = 1.0,
    cycle_intensity: float = 1.0,
    finance: FinanceConfig | None = None,
    operating: OperatingProfile | None = None,
) -> CostBreakdown:
    finance = finance or FinanceConfig()
    operating = operating or OperatingProfile()

    power_w = resolve_power_w(datasheet)
    picks_per_year = operating.resolve_picks_per_year(datasheet)
    observed_cycle_time_s = datasheet.rated_cycle_time_s / cycle_intensity

    energy = (
        power_w
        / 1000.0
        * motor_load_ratio_max
        * observed_cycle_time_s
        * finance.electricity_price_eur_per_kwh
        / 3600.0
    )
    wear = datasheet.cost_new_eur / datasheet.nominal_picks_lifetime * wear_rate_multiplier
    capital = (
        datasheet.cost_new_eur * finance.interest_rate_per_year / datasheet.nominal_picks_lifetime
    )
    maintenance = (
        datasheet.cost_new_eur * datasheet.maintenance_cost_pct_per_year / picks_per_year
    )
    total = energy + wear + capital + maintenance

    return CostBreakdown(
        energy_eur=energy,
        wear_eur=wear,
        capital_eur=capital,
        maintenance_eur=maintenance,
        total_eur=total,
        wear_rate_multiplier=wear_rate_multiplier,
        picks_per_year_used=picks_per_year,
        power_w_used=power_w,
    )
