"""Live-Robot-State — thread-safer Akkumulator für die Demo-Session.

Wird vom `/simulate/pick`-Endpoint nach jedem Pop inkrementiert. Hält
`cumulative_wear_pick_equivalents`, `cumulative_picks` und Σ multiplier (für
Display-Mittelwert). `/simulate/reset` setzt zurück und nimmt einen neuen
`commissioned_at`-Zeitstempel.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime

from unifi.residual.schema import RobotState


@dataclass
class LiveRobotState:
    commissioned_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    cumulative_wear_pick_equivalents: float = 0.0
    cumulative_picks: int = 0
    sum_multiplier: float = 0.0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def increment(
        self,
        multiplier: float,
        cycle_intensity: float,
        picks_per_window: float = 1.0,
    ) -> None:
        with self._lock:
            self.cumulative_wear_pick_equivalents += (
                multiplier * cycle_intensity * picks_per_window
            )
            self.cumulative_picks += max(1, int(picks_per_window))
            self.sum_multiplier += multiplier

    def reset(self) -> None:
        with self._lock:
            self.cumulative_wear_pick_equivalents = 0.0
            self.cumulative_picks = 0
            self.sum_multiplier = 0.0
            self.commissioned_at = datetime.now(UTC)

    def snapshot(self, simulated_age_years: float | None = None) -> RobotState:
        with self._lock:
            if simulated_age_years is None:
                age_years = (datetime.now(UTC) - self.commissioned_at).total_seconds() / (
                    365.25 * 86400
                )
            else:
                age_years = simulated_age_years
            avg_mult = (
                self.sum_multiplier / self.cumulative_picks
                if self.cumulative_picks
                else None
            )
            return RobotState(
                age_years=max(0.0, age_years),
                cumulative_wear_pick_equivalents=self.cumulative_wear_pick_equivalents,
                cumulative_picks=self.cumulative_picks,
                avg_wear_multiplier=avg_mult,
            )
