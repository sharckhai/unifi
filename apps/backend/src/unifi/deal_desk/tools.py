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

from unifi.cost.engine import compute_cost_per_pick, compute_customer_pricing
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
                "Extract the structured inquiry data from this customer letter. "
                "Map weight mentions to light (≤1 kg), medium (1–3 kg), heavy (>3 kg). "
                "Convert any annual volume to monthly (divide by 12). "
                "If a field is not stated, use a sensible default and note it in `notes`."
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Inquiry,
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
        pricing = compute_customer_pricing(cost=cost)
        points.append(
            PricingPoint(
                wear_rate_multiplier=multiplier,
                production_cost_eur_per_pick=cost.total_eur,
                customer_price_eur_per_pick=pricing.customer_price_eur_per_pick,
            )
        )

    customer_prices = [p.customer_price_eur_per_pick for p in points]
    sorted_prices = sorted(customer_prices)
    median = sorted_prices[len(sorted_prices) // 2]
    return PricingCurve(
        robot_name=robot_name,
        weight_class=weight_class,
        timestep_granularity=timestep,
        points=points,
        median_eur_per_pick=median,
        range_low_eur_per_pick=min(customer_prices),
        range_high_eur_per_pick=max(customer_prices),
    )


def compare_leasing_and_unifi(
    robot_name: str,
    fleet_size: int,
    term_months: int,
    expected_picks_per_month: int,
    expected_eur_per_pick: float,
) -> LeasingComparison:
    """Cash-flow + risk comparison. No balance-sheet inputs.

    `expected_eur_per_pick` is the median from `get_pricing_history` for
    the dominant weight class — passed in by the agent so this tool stays
    arithmetic-only.
    """
    datasheet = catalog.get_datasheet(robot_name)
    leasing_monthly = (
        datasheet.cost_new_eur * fleet_size * catalog.MONTHLY_LEASING_FACTOR
    )
    leasing_total = leasing_monthly * term_months

    unifi_monthly_expected = expected_eur_per_pick * expected_picks_per_month
    unifi_total = unifi_monthly_expected * term_months
    unifi_monthly_low = unifi_monthly_expected * 0.7
    unifi_monthly_high = unifi_monthly_expected * 1.3

    break_even = (
        leasing_monthly / expected_eur_per_pick if expected_eur_per_pick > 0 else 0.0
    )
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
            expected_monthly_eur=unifi_monthly_expected,
            monthly_low_eur=unifi_monthly_low,
            monthly_high_eur=unifi_monthly_high,
            total_cost_over_term_eur=unifi_total,
            cash_flow_profile="volume_coupled",
        ),
        break_even_volume_picks_per_month=break_even,
        savings_at_minus_30pct_volume_eur=savings_at_minus_30,
    )
