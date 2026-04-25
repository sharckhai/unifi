"""LiveRobotState-Akkumulator-Tests."""

from __future__ import annotations

import threading
from datetime import UTC, datetime, timedelta

from unifi.residual.accumulator import LiveRobotState


def test_initial_state_is_zero():
    live = LiveRobotState()
    snap = live.snapshot(simulated_age_years=0.0)
    assert snap.cumulative_wear_pick_equivalents == 0.0
    assert snap.cumulative_picks == 0
    assert snap.avg_wear_multiplier is None


def test_increment_sums_multiplier_times_cycle_intensity():
    live = LiveRobotState()
    live.increment(multiplier=1.0, cycle_intensity=1.0)
    live.increment(multiplier=2.0, cycle_intensity=0.5)
    snap = live.snapshot(simulated_age_years=0.0)
    assert snap.cumulative_wear_pick_equivalents == pytest_approx(2.0)
    assert snap.cumulative_picks == 2
    assert snap.avg_wear_multiplier == pytest_approx(1.5)


def test_increment_with_picks_per_window():
    live = LiveRobotState()
    live.increment(multiplier=1.5, cycle_intensity=1.0, picks_per_window=10)
    snap = live.snapshot(simulated_age_years=0.0)
    assert snap.cumulative_wear_pick_equivalents == pytest_approx(15.0)
    assert snap.cumulative_picks == 10


def test_reset_zeroes_state():
    live = LiveRobotState()
    live.increment(1.5, 1.0)
    live.increment(2.0, 1.0)
    live.reset()
    snap = live.snapshot(simulated_age_years=0.0)
    assert snap.cumulative_wear_pick_equivalents == 0.0
    assert snap.cumulative_picks == 0


def test_simulated_age_years_overrides_real_time():
    live = LiveRobotState()
    snap = live.snapshot(simulated_age_years=3.0)
    assert snap.age_years == 3.0


def test_real_age_advances_with_commissioned_at():
    live = LiveRobotState()
    live.commissioned_at = datetime.now(UTC) - timedelta(days=365)
    snap = live.snapshot()
    assert snap.age_years == pytest_approx(1.0, rel=0.01)


def test_thread_safe_increment():
    live = LiveRobotState()
    n_threads = 8
    n_per_thread = 250

    def worker():
        for _ in range(n_per_thread):
            live.increment(multiplier=1.0, cycle_intensity=1.0)

    threads = [threading.Thread(target=worker) for _ in range(n_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    snap = live.snapshot(simulated_age_years=0.0)
    assert snap.cumulative_wear_pick_equivalents == pytest_approx(
        n_threads * n_per_thread
    )
    assert snap.cumulative_picks == n_threads * n_per_thread


def pytest_approx(expected, rel: float = 1e-9):
    import pytest

    return pytest.approx(expected, rel=rel)
