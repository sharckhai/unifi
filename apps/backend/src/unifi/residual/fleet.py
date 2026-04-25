"""Synthetische 12-Roboter-Flotte für den Bank-View.

Deterministische Mischung aus fünf Profilen (light_low_use, light_normal,
heavy_normal, heavy_high_use, aged_unused) — gestreut über `numpy.random`
mit fixem Seed, damit Demos reproduzierbar sind.
"""

from __future__ import annotations

import numpy as np

from unifi.residual.engine import compute_residual_value, resolve_lifetime_years
from unifi.residual.schema import (
    FleetEntry,
    ProfileLabel,
    ResidualConfig,
    RobotState,
)
from unifi.ucs.schema import UcsDatasheet

_PROFILE_DISTRIBUTION: list[tuple[ProfileLabel, int]] = [
    ("light_low_use", 3),
    ("light_normal", 3),
    ("heavy_normal", 3),
    ("heavy_high_use", 2),
    ("aged_unused", 1),
]


def _profile_state(
    profile: ProfileLabel,
    rng: np.random.Generator,
    nominal_lifetime_years: float,
    nominal_picks_lifetime: int,
) -> RobotState:
    """Würfelt age + cumulative wear für ein Profil."""
    if profile == "light_low_use":
        age_years = float(rng.uniform(1.0, 3.0))
        use_frac = float(rng.uniform(0.05, 0.15))
        avg_mult = float(rng.uniform(0.4, 0.7))
    elif profile == "light_normal":
        age_years = float(rng.uniform(2.0, 5.0))
        use_frac = float(rng.uniform(0.20, 0.40))
        avg_mult = float(rng.uniform(0.7, 1.1))
    elif profile == "heavy_normal":
        age_years = float(rng.uniform(2.0, 4.0))
        use_frac = float(rng.uniform(0.40, 0.60))
        avg_mult = float(rng.uniform(1.3, 1.7))
    elif profile == "heavy_high_use":
        age_years = float(rng.uniform(3.0, 6.0))
        use_frac = float(rng.uniform(0.70, 0.95))
        avg_mult = float(rng.uniform(1.8, 2.4))
    elif profile == "aged_unused":
        age_years = float(rng.uniform(8.0, min(12.0, nominal_lifetime_years * 1.2)))
        use_frac = float(rng.uniform(0.30, 0.40))
        avg_mult = float(rng.uniform(0.6, 0.9))
    else:
        raise ValueError(f"Unknown profile: {profile}")

    cumulative_wear = use_frac * nominal_picks_lifetime
    cumulative_picks = int(cumulative_wear / max(avg_mult, 1e-3))
    return RobotState(
        age_years=age_years,
        cumulative_wear_pick_equivalents=cumulative_wear,
        cumulative_picks=cumulative_picks,
        avg_wear_multiplier=avg_mult,
    )


def generate_synthetic_fleet(
    datasheet: UcsDatasheet,
    config: ResidualConfig | None = None,
    seed: int = 42,
) -> list[FleetEntry]:
    rng = np.random.default_rng(seed)
    lifetime_years = resolve_lifetime_years(datasheet)
    nominal_picks = datasheet.nominal_picks_lifetime

    entries: list[FleetEntry] = []
    counter = 1
    for profile, count in _PROFILE_DISTRIBUTION:
        for _ in range(count):
            state = _profile_state(profile, rng, lifetime_years, nominal_picks)
            residual = compute_residual_value(
                datasheet=datasheet, state=state, config=config
            )
            entries.append(
                FleetEntry(
                    robot_id=f"R-{counter:03d}",
                    profile_label=profile,
                    state=state,
                    residual=residual,
                )
            )
            counter += 1
    return entries
