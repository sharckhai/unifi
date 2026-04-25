"""Restwert-Schemas — Konfig, State, Output, Fleet-Entry.

Klassen-Defaults für `nominal_lifetime_years` greifen, wenn das Datasheet
keinen expliziten Wert hat. Quelle: Industrie-Erfahrung + `mechanics.md`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from unifi.ucs.schema import RobotClass

CLASS_LIFETIME_YEARS: dict[RobotClass, float] = {
    "scara": 12.0,
    "cobot": 10.0,
    "parallel": 15.0,
    "gantry": 20.0,
}

ProfileLabel = Literal[
    "light_low_use",
    "light_normal",
    "heavy_normal",
    "heavy_high_use",
    "aged_unused",
]


class ResidualConfig(BaseModel):
    """Stellschrauben der Restwert-Engine."""

    model_config = ConfigDict(extra="forbid")

    residual_floor_pct: float = Field(default=0.05, ge=0, le=0.5)
    use_degressive_curve: bool = False
    degressive_k: float = Field(default=0.7, gt=0, le=2.0)


class RobotState(BaseModel):
    """Was UNIFI über einen Roboter zu einem Zeitpunkt weiß."""

    model_config = ConfigDict(extra="forbid")

    age_years: float = Field(ge=0)
    cumulative_wear_pick_equivalents: float = Field(ge=0)
    cumulative_picks: int = Field(default=0, ge=0)
    avg_wear_multiplier: float | None = Field(default=None, ge=0)


class ResidualValue(BaseModel):
    """Output der Restwert-Engine."""

    model_config = ConfigDict(extra="forbid")

    residual_value_eur: float
    cost_new_eur: float
    use_consumed_fraction: float
    age_consumed_fraction: float
    combined_decay: float
    residual_floor_eur: float
    floor_active: bool
    annualized_depreciation_eur_per_year: float
    nominal_lifetime_years_used: float
    nominal_picks_lifetime_used: int


class FleetEntry(BaseModel):
    """Eine Zeile in der synthetischen Bank-View-Flotten-Tabelle."""

    model_config = ConfigDict(extra="forbid")

    robot_id: str
    profile_label: ProfileLabel
    state: RobotState
    residual: ResidualValue
