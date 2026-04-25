from unifi.residual.accumulator import LiveRobotState
from unifi.residual.engine import compute_residual_value, resolve_lifetime_years
from unifi.residual.fleet import generate_synthetic_fleet
from unifi.residual.schema import (
    CLASS_LIFETIME_YEARS,
    FleetEntry,
    ProfileLabel,
    ResidualConfig,
    ResidualValue,
    RobotState,
)

__all__ = [
    "CLASS_LIFETIME_YEARS",
    "FleetEntry",
    "LiveRobotState",
    "ProfileLabel",
    "ResidualConfig",
    "ResidualValue",
    "RobotState",
    "compute_residual_value",
    "generate_synthetic_fleet",
    "resolve_lifetime_years",
]
