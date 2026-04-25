"""Cost-Engine-Schemas — externe Konstanten und Output-Breakdown.

Klassen-Defaults für Power: Fallback wenn `UcsDatasheet.power_consumption_w`
nicht gesetzt ist. Quelle: docs/research/datasheet-data-and-finance.md § 3.2.

Default-Werte für Strompreis und Zinsen kommen aus `unifi_konzept_v2.md`
Z. 240–242 und sind in `docs/research/financials.md` für DE 2025/2026
verifiziert.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from unifi.ucs.schema import RobotClass, UcsDatasheet

CLASS_POWER_DEFAULT_W: dict[RobotClass, float] = {
    "scara": 200.0,
    "cobot": 150.0,
    "parallel": 400.0,
    "gantry": 800.0,
}

SECONDS_PER_YEAR: int = 3600 * 24 * 365


class FinanceConfig(BaseModel):
    """Externe Finanz-Konstanten — kommen in Produktion aus Kunden-ERP / Leasing-Verträgen."""

    model_config = ConfigDict(extra="forbid")

    electricity_price_eur_per_kwh: float = Field(default=0.30, ge=0)
    interest_rate_per_year: float = Field(default=0.05, ge=0, le=1)


class OperatingProfile(BaseModel):
    """Use-Case-spezifisches Auslastungs-Profil.

    Wenn `picks_per_year` explizit gesetzt: dieser Wert wird genutzt.
    Sonst: `theoretical_max · utilization_factor`, wobei
    `theoretical_max = (s/Jahr · duty_cycle) / rated_cycle_time_s`.
    Default `utilization_factor = 0.16` ergibt für UR5 ca. 2 M picks/p.a.,
    konsistent mit dem Worked Example aus `unifi_konzept_v2.md` Z. 244.
    """

    model_config = ConfigDict(extra="forbid")

    utilization_factor: float = Field(default=0.16, gt=0, le=1)
    picks_per_year: int | None = Field(default=None, gt=0)

    def resolve_picks_per_year(self, datasheet: UcsDatasheet) -> int:
        if self.picks_per_year is not None:
            return self.picks_per_year
        theoretical_max = (
            SECONDS_PER_YEAR * datasheet.nominal_duty_cycle / datasheet.rated_cycle_time_s
        )
        return int(theoretical_max * self.utilization_factor)


class CostBreakdown(BaseModel):
    """Output der Cost-per-Pick-Engine — vier Komponenten plus Total und genutzte Konstanten."""

    model_config = ConfigDict(extra="forbid")

    energy_eur: float
    wear_eur: float
    capital_eur: float
    maintenance_eur: float
    total_eur: float
    wear_rate_multiplier: float
    picks_per_year_used: int
    power_w_used: float
