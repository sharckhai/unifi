"""Robot catalog for the Deal-Desk-Agent.

Two robots in scope: UR5 (cobot, mixed weights) and SCARA (high-throughput
light pick). UR5 numbers come from the existing NIST datasheet; SCARA
numbers are illustrative — calibration TODO when we wire real catalogs.

Leasing factor (`MONTHLY_LEASING_FACTOR`) is a 5-year industrial
equipment-leasing approximation, applied as `cost_new_eur · fleet_size ·
factor`. Source: market-typical for Western-Europe equipment leases at
2025/26 rates. TODO: replace with a real benchmark in a later round.
"""

from __future__ import annotations

from unifi.cost.schema import OperatingProfile
from unifi.deal_desk.schema import RobotInfo, RobotSummary
from unifi.ucs.schema import UcsDatasheet

MONTHLY_LEASING_FACTOR: float = 0.022
_DEFAULT_OPERATING_PROFILE = OperatingProfile()

# Base fee per robot per month — covers ~80 % of the robot's purchase price
# over a 48-month contract plus UNIFI's platform margin. Real-world RaaS
# always combines a time-based component (covers CapEx + service margin)
# with a usage-based component (covers OpEx + variable margin). Without it,
# UNIFI implicitly subsidises low-utilisation customers — the robot sits on
# UNIFI's balance sheet but is paid for only via the per-pick wear charge.
_MONTHLY_BASE_FEE_EUR: dict[str, float] = {
    "UR5": 600.0,
    "SCARA": 400.0,
}


def base_fee_eur_per_robot_per_month(robot_name: str) -> float:
    if robot_name not in _MONTHLY_BASE_FEE_EUR:
        raise KeyError(robot_name)
    return _MONTHLY_BASE_FEE_EUR[robot_name]


UR5_DATASHEET = UcsDatasheet(
    model="Universal Robots UR5",
    manufacturer="Universal Robots",
    robot_class="cobot",
    cost_new_eur=35_000,
    nominal_picks_lifetime=30_000_000,
    rated_current_a=6.0,
    rated_torque_nm=150.0,
    rated_cycle_time_s=2.0,
    rated_payload_kg=5.0,
    nominal_duty_cycle=0.8,
    maintenance_cost_pct_per_year=0.05,
    power_consumption_w=150.0,
    nominal_lifetime_years=10.0,
)

SCARA_DATASHEET = UcsDatasheet(
    model="Generic SCARA-S2",
    manufacturer="Reference Industrial",
    robot_class="scara",
    cost_new_eur=22_000,
    nominal_picks_lifetime=40_000_000,
    rated_current_a=4.5,
    rated_torque_nm=40.0,
    rated_cycle_time_s=0.8,
    rated_payload_kg=2.0,
    nominal_duty_cycle=0.85,
    maintenance_cost_pct_per_year=0.04,
    power_consumption_w=200.0,
    nominal_lifetime_years=12.0,
)


_CATALOG: dict[str, UcsDatasheet] = {
    "UR5": UR5_DATASHEET,
    "SCARA": SCARA_DATASHEET,
}

_USE_CASE: dict[str, str] = {
    "UR5": (
        "Flexible cobot pick lines with mixed package weights up to ~5 kg. "
        "Mid-cycle (~2 s). Best for e-commerce fulfillment and small-parts "
        "kitting where load varies."
    ),
    "SCARA": (
        "High-throughput light pick-and-place for packages ≤2 kg. "
        "Sub-second cycles (~0.8 s). Best for fast lanes with uniform light "
        "items — pharma, electronics, sortable e-commerce."
    ),
}

_SUITABLE: dict[str, list[str]] = {
    "UR5": [
        "Packages 0.5–5 kg",
        "Mixed weight lanes",
        "Cycle times 1.8–2.5 s",
        "Daytime + light night-shift duty",
    ],
    "SCARA": [
        "Packages ≤2 kg",
        "Uniform light items",
        "Sub-second to ~1 s cycles",
        "24/7 high-throughput lanes",
    ],
}

_NOT_SUITABLE: dict[str, list[str]] = {
    "UR5": [
        "Packages >5 kg",
        "Sub-second cycles",
        "Heavy palletizing duty",
    ],
    "SCARA": [
        "Packages >2 kg",
        "Mixed-weight lanes with heavy share",
        "Tasks needing 6-DOF reach or vertical compliance",
    ],
}


def list_robots() -> list[RobotSummary]:
    return [
        RobotSummary(
            name=name,
            robot_class=_CATALOG[name].robot_class,
            use_case=_USE_CASE[name],
        )
        for name in _CATALOG
    ]


def get_datasheet(robot_name: str) -> UcsDatasheet:
    if robot_name not in _CATALOG:
        raise KeyError(robot_name)
    return _CATALOG[robot_name]


def build_robot_info(robot_name: str) -> RobotInfo:
    ds = get_datasheet(robot_name)
    picks_per_year = _DEFAULT_OPERATING_PROFILE.resolve_picks_per_year(ds)
    picks_per_hour = (3600.0 / ds.rated_cycle_time_s) * ds.nominal_duty_cycle
    return RobotInfo(
        name=robot_name,
        robot_class=ds.robot_class,
        cost_new_eur=ds.cost_new_eur,
        nominal_picks_lifetime=ds.nominal_picks_lifetime,
        rated_payload_kg=ds.rated_payload_kg,
        rated_cycle_time_s=ds.rated_cycle_time_s,
        nominal_duty_cycle=ds.nominal_duty_cycle,
        power_consumption_w=ds.power_consumption_w or 0.0,
        maintenance_cost_pct_per_year=ds.maintenance_cost_pct_per_year,
        picks_per_hour_at_full_duty=picks_per_hour,
        nominal_picks_per_month_per_robot=picks_per_year // 12,
        suitable_for=_SUITABLE[robot_name],
        not_suitable_for=_NOT_SUITABLE[robot_name],
    )


def known_robots() -> list[str]:
    return list(_CATALOG.keys())
