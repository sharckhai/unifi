"""TestClient-Smoke für /residual-Endpoints."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from unifi.api.routes import health, residual
from unifi.residual.accumulator import LiveRobotState
from unifi.ucs.schema import UcsDatasheet

REPO_ROOT = Path(__file__).resolve().parents[3]
UR5_DATASHEET_PATH = (
    REPO_ROOT / "data" / "nist-ur5-degradation" / "datasheets" / "ur5_datasheet.json"
)


def _make_app(with_live_robot: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.default_datasheet = UcsDatasheet.model_validate_json(
            UR5_DATASHEET_PATH.read_text()
        )
        app.state.live_robot = LiveRobotState() if with_live_robot else None
        yield

    app = FastAPI(lifespan=lifespan)
    app.include_router(health.router)
    app.include_router(residual.router)
    return app


def test_residual_value_fresh_robot():
    with TestClient(_make_app()) as client:
        r = client.post(
            "/residual/value",
            json={"state": {"age_years": 0.0, "cumulative_wear_pick_equivalents": 0}},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["residual_value_eur"] == pytest.approx(35000)
    assert body["floor_active"] is False


def test_residual_value_2y_15pct():
    with TestClient(_make_app()) as client:
        r = client.post(
            "/residual/value",
            json={
                "state": {
                    "age_years": 2.0,
                    "cumulative_wear_pick_equivalents": 4_500_000,
                }
            },
        )
    body = r.json()
    # use=15%, age=20% → max=20% → 35000 * 0.80 = 28000
    assert body["residual_value_eur"] == pytest.approx(28000, rel=0.01)


def test_residual_value_full_consumption_returns_floor():
    with TestClient(_make_app()) as client:
        r = client.post(
            "/residual/value",
            json={
                "state": {
                    "age_years": 5.0,
                    "cumulative_wear_pick_equivalents": 30_000_000,
                }
            },
        )
    body = r.json()
    assert body["floor_active"] is True
    assert body["residual_value_eur"] == pytest.approx(35000 * 0.05)


def test_residual_value_with_industrial_override():
    industrial = {
        "model": "ACME I-200", "manufacturer": "ACME", "robot_class": "gantry",
        "cost_new_eur": 200000, "nominal_picks_lifetime": 100000000,
        "rated_current_a": 12.0, "rated_torque_nm": 800.0,
        "rated_cycle_time_s": 1.5, "rated_payload_kg": 80.0,
        "nominal_duty_cycle": 0.85, "maintenance_cost_pct_per_year": 0.07,
        "power_consumption_w": 2500.0,
    }
    with TestClient(_make_app()) as client:
        r = client.post(
            "/residual/value",
            json={
                "state": {"age_years": 1.0, "cumulative_wear_pick_equivalents": 0},
                "datasheet": industrial,
            },
        )
    body = r.json()
    # gantry hat Klassen-default lifetime=20J → age=1J = 5% decay → 95% von 200k
    assert body["residual_value_eur"] == pytest.approx(200000 * 0.95, rel=0.01)
    assert body["nominal_lifetime_years_used"] == 20.0


def test_residual_live_503_without_initialized_state():
    with TestClient(_make_app(with_live_robot=False)) as client:
        r = client.get("/residual/live")
    assert r.status_code == 503


def test_residual_live_returns_fresh_value():
    with TestClient(_make_app()) as client:
        r = client.get("/residual/live")
    assert r.status_code == 200
    body = r.json()
    assert body["state"]["cumulative_wear_pick_equivalents"] == 0
    assert body["residual"]["residual_value_eur"] == pytest.approx(35000, rel=1e-3)


def test_residual_live_simulated_age_years():
    with TestClient(_make_app()) as client:
        r = client.get("/residual/live", params={"simulated_age_years": 5.0})
    body = r.json()
    assert body["state"]["age_years"] == 5.0
    assert body["residual"]["residual_value_eur"] == pytest.approx(35000 * 0.5, rel=1e-3)


def test_residual_fleet_returns_twelve_entries():
    with TestClient(_make_app()) as client:
        r = client.get("/residual/fleet")
    assert r.status_code == 200
    body = r.json()
    assert len(body["fleet"]) == 12
    assert body["total_residual_eur"] > 0
    assert 0 < body["weighted_combined_decay"] < 1


def test_residual_fleet_seed_deterministic():
    with TestClient(_make_app()) as client:
        a = client.get("/residual/fleet", params={"seed": 42}).json()
        b = client.get("/residual/fleet", params={"seed": 42}).json()
    assert a["total_residual_eur"] == b["total_residual_eur"]
