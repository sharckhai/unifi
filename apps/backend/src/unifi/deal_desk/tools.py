"""Five tools the Deal-Desk-Agent calls.

Each tool is a plain Python function returning a Pydantic model. The
Gemini agent loop in `agent.py` adapts these to Gemini's function-calling
protocol.

Sequencing: `get_robot_infos` may only be called after `get_robots`. The
`ToolSession` carries that state and the Gemini client used by
`analyze_pdf_inquiry`.
"""

from __future__ import annotations

import dataclasses
from pathlib import Path

from google import genai
from google.genai import types

from unifi.cost.engine import compute_cost_per_pick
from unifi.deal_desk import catalog
from unifi.deal_desk.schema import (
    Inquiry,
    LeasingComparison,
    LeasingSide,
    PricingCurve,
    PricingPoint,
    RobotInfo,
    RobotSummary,
    Timestep,
    UnifiSide,
    WeightClass,
)


@dataclasses.dataclass
class ToolSession:
    """Per-run state passed by reference into each tool wrapper."""

    client: genai.Client
    model: str
    robots_listed: bool = False


_INQUIRY_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "customer_name": types.Schema(type=types.Type.STRING),
        "industry": types.Schema(type=types.Type.STRING),
        "weight_mix": types.Schema(
            type=types.Type.OBJECT,
            properties={
                "light_share": types.Schema(type=types.Type.NUMBER),
                "medium_share": types.Schema(type=types.Type.NUMBER),
                "heavy_share": types.Schema(type=types.Type.NUMBER),
            },
            required=["light_share", "medium_share", "heavy_share"],
        ),
        "is_one_time_project": types.Schema(type=types.Type.BOOLEAN),
        "expected_picks_per_month": types.Schema(type=types.Type.INTEGER),
        "seasonality": types.Schema(type=types.Type.STRING),
        "notes": types.Schema(type=types.Type.STRING),
        "fleet_size": types.Schema(type=types.Type.INTEGER, nullable=True),
        "term_preference_months": types.Schema(
            type=types.Type.INTEGER, nullable=True
        ),
        "flexibility_priority": types.Schema(
            type=types.Type.STRING,
            enum=["low", "medium", "high"],
            nullable=True,
        ),
    },
    required=[
        "customer_name",
        "industry",
        "weight_mix",
        "is_one_time_project",
        "expected_picks_per_month",
        "seasonality",
        "notes",
    ],
)


_PRICING_GRID: dict[str, dict[str, list[float] | float]] = {
    "light": {
        "multipliers": [0.6, 0.8, 1.0, 1.2],
        "motor_load_ratio_max": 0.5,
    },
    "medium": {
        "multipliers": [0.8, 1.0, 1.3, 1.6],
        "motor_load_ratio_max": 0.8,
    },
    "heavy": {
        "multipliers": [1.0, 1.5, 1.8, 2.2],
        "motor_load_ratio_max": 1.0,
    },
}


def analyze_pdf_inquiry(pdf_path: str, session: ToolSession) -> Inquiry:
    """Extract a structured Inquiry from a customer PDF using Gemini multimodal."""
    pdf_bytes = Path(pdf_path).read_bytes()
    response = session.client.models.generate_content(
        model=session.model,
        contents=[
            types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            (
                "Extract only what the customer explicitly states.\n\n"
                "Set `is_one_time_project` to true if the customer asks for a "
                "single batch / one-off run / fixed total volume with no "
                "recurring follow-up. False for recurring monthly volume.\n\n"
                "Volume: count placements (picks), not finished assemblies. "
                "If the customer mentions N units and each requires K "
                "components, the volume is N × K picks. For a recurring "
                "contract (`is_one_time_project = false`), put picks per "
                "month in `expected_picks_per_month`. For a one-time project "
                "(`is_one_time_project = true`), put the full one-off total "
                "in `expected_picks_per_month` — the agent will derive the "
                "project duration from robot capacity.\n\n"
                "Weight mix: light = ≤1 kg, medium = 1–3 kg, heavy = >3 kg. "
                "Use the share of picks (not assemblies) per class.\n\n"
                "Set `fleet_size`, `term_preference_months`, and "
                "`flexibility_priority` to null if the customer did not state "
                "them — those are recommendations the agent will derive from "
                "robot specs and standard contract conventions. Do not "
                "fabricate values.\n\n"
                "Use `notes` to capture anything else the customer mentions "
                "that doesn't fit the structured fields."
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_INQUIRY_SCHEMA,
        ),
    )
    return Inquiry.model_validate_json(response.text)


def get_robots(session: ToolSession) -> list[RobotSummary]:
    """List available robots with one-line use-case hints."""
    session.robots_listed = True
    return catalog.list_robots()


class SequencingError(Exception):
    """Raised when get_robot_infos is called before get_robots."""


def get_robot_infos(robot_name: str, session: ToolSession) -> RobotInfo:
    """Full info for a robot. Must be called after get_robots."""
    if not session.robots_listed:
        raise SequencingError(
            "get_robot_infos called before get_robots. "
            "Call get_robots() first to discover available robots."
        )
    if robot_name not in catalog.known_robots():
        raise KeyError(
            f"Unknown robot {robot_name!r}. Known: {catalog.known_robots()}"
        )
    return catalog.build_robot_info(robot_name)


def get_pricing_history(
    robot_name: str,
    weight_class: WeightClass,
    timestep: Timestep,
) -> PricingCurve:
    """€/pick curve over the wear-multiplier spectrum for one weight class.

    Despite the name, this is not a time-series — it samples the cost
    engine at four operating points so the agent can quote a defensible
    range. `timestep` is echoed back to inform the agent's framing.
    """
    datasheet = catalog.get_datasheet(robot_name)
    grid = _PRICING_GRID[weight_class]
    motor_load_ratio_max = grid["motor_load_ratio_max"]
    multipliers = grid["multipliers"]

    points: list[PricingPoint] = []
    for multiplier in multipliers:
        cost = compute_cost_per_pick(
            datasheet=datasheet,
            wear_rate_multiplier=multiplier,
            motor_load_ratio_max=motor_load_ratio_max,
        )
        points.append(
            PricingPoint(
                wear_rate_multiplier=multiplier,
                eur_per_pick=cost.total_eur,
            )
        )

    prices = sorted(p.eur_per_pick for p in points)
    median = prices[len(prices) // 2]
    return PricingCurve(
        robot_name=robot_name,
        weight_class=weight_class,
        timestep_granularity=timestep,
        points=points,
        median_eur_per_pick=median,
        range_low_eur_per_pick=prices[0],
        range_high_eur_per_pick=prices[-1],
    )


def compare_leasing_and_unifi(
    robot_name: str,
    fleet_size: int,
    term_months: int,
    expected_picks_per_month: int,
    expected_eur_per_pick: float,
) -> LeasingComparison:
    """Cash-flow + risk comparison. No balance-sheet inputs.

    UNIFI-Pricing kombiniert eine zeitbasierte Base Fee pro Roboter
    (deckt CapEx-Anteil + Plattform-Marge) mit dem Pay-per-Pick
    (`expected_eur_per_pick` = production cost aus get_pricing_history).
    Ohne die Base Fee subventioniert UNIFI implizit niedrige
    Auslastung — der Roboter steht auf UNIFIs Bilanz, refinanziert
    wird er aber nur über den Wear-Anteil pro tatsächlich gefahrenem
    Pick.
    """
    datasheet = catalog.get_datasheet(robot_name)
    leasing_monthly = (
        datasheet.cost_new_eur * fleet_size * catalog.MONTHLY_LEASING_FACTOR
    )
    leasing_total = leasing_monthly * term_months

    base_fee_per_robot = catalog.base_fee_eur_per_robot_per_month(robot_name)
    base_fee_monthly = base_fee_per_robot * fleet_size
    base_fee_total = base_fee_monthly * term_months

    pay_per_pick_monthly = expected_eur_per_pick * expected_picks_per_month
    pay_per_pick_total = pay_per_pick_monthly * term_months

    unifi_monthly_expected = base_fee_monthly + pay_per_pick_monthly
    unifi_total = base_fee_total + pay_per_pick_total
    # Variability comes from the pay-per-pick component only — the base
    # fee is fixed regardless of volume.
    unifi_monthly_low = base_fee_monthly + pay_per_pick_monthly * 0.7
    unifi_monthly_high = base_fee_monthly + pay_per_pick_monthly * 1.3

    # Break-even = picks/month at which UNIFI total equals classical
    # leasing total. Solve: leasing_monthly = base_fee_monthly +
    # picks × eur_per_pick.
    if expected_eur_per_pick > 0:
        break_even = max(
            0.0, (leasing_monthly - base_fee_monthly) / expected_eur_per_pick
        )
    else:
        break_even = 0.0
    savings_at_minus_30 = (leasing_monthly - unifi_monthly_low) * term_months

    return LeasingComparison(
        robot_name=robot_name,
        fleet_size=fleet_size,
        term_months=term_months,
        expected_picks_per_month=expected_picks_per_month,
        leasing=LeasingSide(
            monthly_payment_eur=leasing_monthly,
            total_cost_over_term_eur=leasing_total,
            cash_flow_profile="fixed",
        ),
        unifi=UnifiSide(
            base_fee_monthly_eur=base_fee_monthly,
            pay_per_pick_monthly_eur=pay_per_pick_monthly,
            expected_monthly_eur=unifi_monthly_expected,
            monthly_low_eur=unifi_monthly_low,
            monthly_high_eur=unifi_monthly_high,
            base_fee_total_eur=base_fee_total,
            pay_per_pick_total_eur=pay_per_pick_total,
            total_cost_over_term_eur=unifi_total,
            cash_flow_profile="volume_coupled",
        ),
        break_even_volume_picks_per_month=break_even,
        savings_at_minus_30pct_volume_eur=savings_at_minus_30,
    )
