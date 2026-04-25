"""Deal-Desk-Agent data contracts.

Schemas are designed to round-trip through Gemini's response_schema and
function-calling parameters: no dict-with-Literal-keys, no discriminated
unions, no Optional defaults that the model is expected to populate.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

WeightClass = Literal["light", "medium", "heavy"]
Timestep = Literal["monthly", "quarterly", "yearly"]
FlexibilityPriority = Literal["low", "medium", "high"]
CashFlowProfile = Literal["fixed", "volume_coupled"]


class WeightMix(BaseModel):
    """Share of picks per weight class. Should sum to ~1.0."""

    model_config = ConfigDict(extra="forbid")

    light_share: float = Field(ge=0, le=1)
    medium_share: float = Field(ge=0, le=1)
    heavy_share: float = Field(ge=0, le=1)


class Inquiry(BaseModel):
    """Structured customer inquiry extracted from the PDF."""

    model_config = ConfigDict(extra="forbid")

    customer_name: str
    industry: str
    fleet_size: int = Field(ge=1)
    weight_mix: WeightMix
    expected_picks_per_month: int = Field(ge=1)
    seasonality: str
    term_preference_months: int = Field(ge=1)
    flexibility_priority: FlexibilityPriority
    notes: str = ""


class RobotSummary(BaseModel):
    """Short catalog entry — what get_robots returns."""

    model_config = ConfigDict(extra="forbid")

    name: str
    robot_class: str
    use_case: str


class RobotInfo(BaseModel):
    """Full robot info returned by get_robot_infos."""

    model_config = ConfigDict(extra="forbid")

    name: str
    robot_class: str
    cost_new_eur: float
    nominal_picks_lifetime: int
    rated_payload_kg: float
    rated_cycle_time_s: float
    power_consumption_w: float
    maintenance_cost_pct_per_year: float
    suitable_for: list[str]
    not_suitable_for: list[str]


class PricingPoint(BaseModel):
    """One operating point on the pricing curve.

    `eur_per_pick` is the all-in production cost (energy + wear + capital +
    maintenance) — same field the frontend's pricing display uses. No service
    fee or operator margin is applied here, so the agent's range matches the
    app's drill-down view.
    """

    model_config = ConfigDict(extra="forbid")

    wear_rate_multiplier: float
    eur_per_pick: float


class PricingCurve(BaseModel):
    """Pricing curve over the wear-multiplier spectrum for one weight class.

    Despite the tool name `get_pricing_history`, this is NOT a time-series.
    It is a deterministic curve over operating-point multipliers — used by
    the agent to quote a defensible price range rather than a single number.
    """

    model_config = ConfigDict(extra="forbid")

    robot_name: str
    weight_class: WeightClass
    timestep_granularity: Timestep
    points: list[PricingPoint]
    median_eur_per_pick: float
    range_low_eur_per_pick: float
    range_high_eur_per_pick: float


class LeasingSide(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_payment_eur: float
    total_cost_over_term_eur: float
    cash_flow_profile: CashFlowProfile


class UnifiSide(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_monthly_eur: float
    monthly_low_eur: float
    monthly_high_eur: float
    total_cost_over_term_eur: float
    cash_flow_profile: CashFlowProfile


class LeasingComparison(BaseModel):
    """Cash-flow-only comparison. No balance-sheet / IFRS-16 / covenants."""

    model_config = ConfigDict(extra="forbid")

    robot_name: str
    fleet_size: int
    term_months: int
    expected_picks_per_month: int
    leasing: LeasingSide
    unifi: UnifiSide
    break_even_volume_picks_per_month: float
    savings_at_minus_30pct_volume_eur: float


class Scenario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    eur_per_pick: float
    delta_vs_base_pct: float
    note: str


class ClauseSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    reasoning: str


class OfferHeader(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_name: str
    robot_chosen: str
    fleet_size: int
    term_months: int


class OfferPricing(BaseModel):
    model_config = ConfigDict(extra="forbid")

    eur_per_pick_min: float
    eur_per_pick_median: float
    eur_per_pick_max: float
    expected_monthly_eur: float
    peak_monthly_eur: float


class OfferComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    leasing_total_eur: float
    unifi_total_eur: float
    cash_flow_narrative: str
    risk_narrative: str


class Offer(BaseModel):
    """Final structured offer document — the agent's deliverable."""

    model_config = ConfigDict(extra="forbid")

    header: OfferHeader
    pricing: OfferPricing
    scenarios: list[Scenario]
    clauses: list[ClauseSuggestion]
    comparison: OfferComparison
    narrative: str
