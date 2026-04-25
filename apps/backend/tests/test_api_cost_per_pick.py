"""TestClient-Smoke für /cost-per-pick und /cost-per-pick/from-features."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from unifi.api.routes import cost_per_pick, health, wear_rate
from unifi.models.wear_rate import TrainParams, train
from unifi.ucs.schema import UcsDatasheet

REPO_ROOT = Path(__file__).resolve().parents[3]
UR5_DATASHEET_PATH = (
    REPO_ROOT / "data" / "nist-ur5-degradation" / "datasheets" / "ur5_datasheet.json"
)


def _normal_features_payload(**overrides) -> dict:
    base = {
        "motor_load_ratio_max": 0.54,
        "motor_load_ratio_mean": 0.12,
        "motor_load_ratio_std": 0.05,
        "cycle_intensity": 1.0,
        "velocity_intensity_max": 0.32,
        "torque_load_ratio_max": 0.20,
        "temp_delta_normalized_max": 0.12,
        "temp_delta_normalized_mean": 0.03,
        "tcp_force_norm": 1.01,
        "tracking_error_rms": 0.009,
        "thermal_state": "warm",
        "payload_class": "light",
    }
    base.update(overrides)
    return base


def _make_app(with_model: bool) -> FastAPI:
    booster = None
    feature_order = None
    if with_model:
        from tests.test_wear_rate_model import _synthetic_labeled_df

        result = train(
            _synthetic_labeled_df(n=120),
            TrainParams(n_estimators=50, early_stopping_rounds=10),
        )
        booster = result.booster
        feature_order = result.feature_order

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.default_datasheet = UcsDatasheet.model_validate_json(
            UR5_DATASHEET_PATH.read_text()
        )
        app.state.booster = booster
        app.state.feature_order = feature_order
        app.state.model_version = "test1234" if with_model else None
        yield

    app = FastAPI(lifespan=lifespan)
    app.include_router(health.router)
    app.include_router(wear_rate.router)
    app.include_router(cost_per_pick.router)
    return app


def test_cost_per_pick_anchor_returns_about_two_milli_eur():
    """multiplier=1.0, load=1.0, cycle=1.0 → total_eur ≈ 0.002 €/Pick."""
    with TestClient(_make_app(with_model=False)) as client:
        r = client.post(
            "/cost-per-pick",
            json={"wear_rate_multiplier": 1.0, "motor_load_ratio_max": 1.0, "cycle_intensity": 1.0},
        )
    assert r.status_code == 200
    body = r.json()
    assert 0.0018 <= body["total_eur"] <= 0.0022
    assert body["wear_rate_multiplier"] == 1.0
    assert body["picks_per_year_used"] > 1_000_000
    assert body["power_w_used"] == 150.0


def test_cost_per_pick_heavy_higher_than_anchor():
    with TestClient(_make_app(with_model=False)) as client:
        anchor = client.post("/cost-per-pick", json={"wear_rate_multiplier": 1.0}).json()
        heavy = client.post(
            "/cost-per-pick",
            json={
                "wear_rate_multiplier": 1.5,
                "motor_load_ratio_max": 1.25,
                "cycle_intensity": 1.0,
            },
        ).json()
    assert heavy["total_eur"] > anchor["total_eur"]
    assert heavy["wear_eur"] == pytest.approx(1.5 * anchor["wear_eur"], rel=1e-6)


def test_cost_per_pick_with_industrial_datasheet_override():
    industrial = {
        "model": "ACME I-200", "manufacturer": "ACME", "robot_class": "gantry",
        "cost_new_eur": 200000, "nominal_picks_lifetime": 100000000,
        "rated_current_a": 12.0, "rated_torque_nm": 800.0,
        "rated_cycle_time_s": 1.5, "rated_payload_kg": 80.0,
        "nominal_duty_cycle": 0.85, "maintenance_cost_pct_per_year": 0.07,
        "power_consumption_w": 2500.0,
    }
    with TestClient(_make_app(with_model=False)) as client:
        ur5 = client.post("/cost-per-pick", json={"wear_rate_multiplier": 1.0}).json()
        ind = client.post(
            "/cost-per-pick",
            json={"wear_rate_multiplier": 1.0, "datasheet": industrial},
        ).json()
    assert ind["total_eur"] > ur5["total_eur"]
    assert ind["power_w_used"] == 2500.0


def test_cost_per_pick_validates_negative_multiplier():
    with TestClient(_make_app(with_model=False)) as client:
        r = client.post("/cost-per-pick", json={"wear_rate_multiplier": -1.0})
    assert r.status_code == 422


def test_cost_per_pick_from_features_503_without_model():
    with TestClient(_make_app(with_model=False)) as client:
        r = client.post(
            "/cost-per-pick/from-features", json={"features": _normal_features_payload()}
        )
    assert r.status_code == 503


def test_cost_per_pick_from_features_returns_breakdown_with_model():
    with TestClient(_make_app(with_model=True)) as client:
        r = client.post(
            "/cost-per-pick/from-features", json={"features": _normal_features_payload()}
        )
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {
        "energy_eur", "wear_eur", "capital_eur", "maintenance_eur", "total_eur",
        "wear_rate_multiplier", "picks_per_year_used", "power_w_used",
    }
    assert body["total_eur"] > 0
    assert body["wear_rate_multiplier"] > 0


def test_cost_per_pick_operating_profile_override():
    with TestClient(_make_app(with_model=False)) as client:
        default = client.post("/cost-per-pick", json={"wear_rate_multiplier": 1.0}).json()
        override = client.post(
            "/cost-per-pick",
            json={
                "wear_rate_multiplier": 1.0,
                "operating": {"picks_per_year": 500_000},
            },
        ).json()
    assert override["picks_per_year_used"] == 500_000
    # Maintenance steigt bei weniger Picks → höher pro Pick
    assert override["maintenance_eur"] > default["maintenance_eur"]


def test_cost_per_pick_finance_override_changes_capital():
    with TestClient(_make_app(with_model=False)) as client:
        default = client.post("/cost-per-pick", json={"wear_rate_multiplier": 1.0}).json()
        high_rate = client.post(
            "/cost-per-pick",
            json={
                "wear_rate_multiplier": 1.0,
                "finance": {"electricity_price_eur_per_kwh": 0.30, "interest_rate_per_year": 0.10},
            },
        ).json()
    assert high_rate["capital_eur"] == pytest.approx(2 * default["capital_eur"], rel=1e-6)
