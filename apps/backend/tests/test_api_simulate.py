"""TestClient-Smoke für /simulate/pick und /simulate/reset."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from unifi.api.routes import cost_per_pick, health, simulate, wear_rate
from unifi.models.wear_rate import TrainParams, train
from unifi.residual.accumulator import LiveRobotState
from unifi.simulator.sampler import WindowSampler
from unifi.ucs.schema import UcsDatasheet

REPO_ROOT = Path(__file__).resolve().parents[3]
UR5_DATASHEET_PATH = (
    REPO_ROOT / "data" / "nist-ur5-degradation" / "datasheets" / "ur5_datasheet.json"
)


def _holdout_parquet_row(t_start_s: float, **overrides) -> dict:
    base = {
        "file": "ur5testresulthalfspeedpayload45lb3_flat.csv",
        "payload_lb": 45,
        "speed": "halfspeed",
        "coldstart": False,
        "run_idx": 3,
        "window_idx": int(t_start_s / 2),
        "t_start_s": t_start_s,
        "t_end_s": t_start_s + 2.0,
        "split": "holdout",
        "motor_current_max_A": 3.5,
        "joint_temp_max_C": 35.0,
        "joint_temp_mean_C": 33.0,
        "observed_cycle_time_s": 4.0,
        "motor_load_ratio_max": 0.55,
        "motor_load_ratio_mean": 0.20,
        "motor_load_ratio_std": 0.05,
        "cycle_intensity": 0.5,
        "velocity_intensity_max": 0.30,
        "torque_load_ratio_max": 0.25,
        "temp_delta_normalized_max": 0.10,
        "temp_delta_normalized_mean": 0.05,
        "tcp_force_norm": 1.10,
        "tracking_error_rms": 0.002,
        "thermal_state": "warm",
        "payload_class": "heavy",
    }
    base.update(overrides)
    return base


def _make_app(tmp_path, *, with_model: bool, with_simulator: bool) -> FastAPI:
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

    sampler = None
    if with_simulator:
        path = tmp_path / "windows.parquet"
        rows = [_holdout_parquet_row(t) for t in (0.0, 2.0, 4.0)]
        pd.DataFrame(rows).to_parquet(path, index=False)
        sampler = WindowSampler.from_parquet(path)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.default_datasheet = UcsDatasheet.model_validate_json(
            UR5_DATASHEET_PATH.read_text()
        )
        app.state.booster = booster
        app.state.feature_order = feature_order
        app.state.model_version = "test1234" if with_model else None
        app.state.simulator = sampler
        app.state.live_robot = LiveRobotState()
        yield

    app = FastAPI(lifespan=lifespan)
    app.include_router(health.router)
    app.include_router(wear_rate.router)
    app.include_router(cost_per_pick.router)
    app.include_router(simulate.router)
    return app


def test_simulate_pick_returns_full_breakdown(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        r = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 3.5, "pick_duration_s": 2.4, "seed": 42},
        )
    assert r.status_code == 200
    body = r.json()
    assert 0.3 <= body["wear_rate_multiplier"] <= 5.0
    assert body["cost"]["total_eur"] > 0
    assert body["features"]["payload_class"] == "light"
    assert len(body["shap_top"]) == 3
    assert body["emphasis"]["feature"] in {
        "motor_load_ratio_max", "torque_load_ratio_max",
        "temp_delta_normalized_max", "tcp_force_norm", "tracking_error_rms",
    }
    assert 1.2 <= body["emphasis"]["factor"] <= 2.0
    assert body["simulator"]["cursor"] == 1
    assert body["simulator"]["total"] == 3
    assert body["source"]["payload_lb"] == 45
    assert body["source"]["speed"] == "halfspeed"

    # Pricing-Stack: production + service + margin = customer
    pricing = body["pricing"]
    assert pricing["production_cost_eur_per_pick"] == body["cost"]["total_eur"]
    assert pricing["customer_price_eur_per_pick"] > pricing["production_cost_eur_per_pick"]
    assert pricing["total_uplift_pct"] == pytest.approx(0.40, rel=1e-9)

    # live_robot/live_residual sind Pflicht-Felder
    assert body["live_robot"] is not None
    assert body["live_robot"]["cumulative_picks"] == 1
    assert body["live_residual"] is not None
    assert body["live_residual"]["residual_value_eur"] > 0


def test_simulate_pick_custom_pricing(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        r = client.post(
            "/simulate/pick",
            json={
                "component_weight_kg": 3.5,
                "pick_duration_s": 2.4,
                "seed": 42,
                "pricing": {"service_fee_pct": 0.0, "operator_margin_pct": 0.40},
            },
        )
    body = r.json()
    pricing = body["pricing"]
    assert pricing["service_fee_eur_per_pick"] == 0.0
    assert pricing["operator_margin_eur_per_pick"] == pytest.approx(
        body["cost"]["total_eur"] * 0.40, rel=1e-9
    )
    assert pricing["customer_price_eur_per_pick"] == pytest.approx(
        body["cost"]["total_eur"] * 1.40, rel=1e-9
    )
    assert pricing["total_uplift_pct"] == pytest.approx(0.40, rel=1e-9)


def test_simulate_pick_503_without_model(tmp_path):
    app = _make_app(tmp_path, with_model=False, with_simulator=True)
    with TestClient(app) as client:
        r = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 3.5, "pick_duration_s": 2.4},
        )
    assert r.status_code == 503


def test_simulate_pick_503_without_simulator(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=False)
    with TestClient(app) as client:
        r = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 3.5, "pick_duration_s": 2.4},
        )
    assert r.status_code == 503


def test_simulate_pick_validates_positive_inputs(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        r = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 0, "pick_duration_s": 2.4},
        )
    assert r.status_code == 422


def test_simulate_pick_shorter_duration_propagates_through_pipeline(tmp_path):
    """Kürzere pick_duration_s bei gleichem Gewicht/Window propagiert deterministisch:

    - renormalize: cycle_intensity = rated/duration → ↑
    - renormalize: velocity_intensity_max *= duration_ratio → ↑
    - cost-engine: energy_eur ∝ observed_cycle_time_s = duration → ↓
    - wear-modell: höhere cycle_intensity ist Eingangs-Feature mit nicht-negativem
      Effekt auf den Multiplier → multiplier_fast >= multiplier_slow.

    Total-Trend ist absichtlich nicht asserted: er hängt vom konkreten Holdout-Sample
    und Modell-Sensitivität ab (z. B. clippt der UR5-Multiplier bei sehr leichten
    Lasten am unteren Floor 0.3, dann zieht energy↓ den Total leicht runter).
    """
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        slow = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 5.0, "pick_duration_s": 4.0, "seed": 11},
        ).json()
        client.post("/simulate/reset")
        fast = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 5.0, "pick_duration_s": 1.0, "seed": 11},
        ).json()
    assert fast["features"]["cycle_intensity"] > slow["features"]["cycle_intensity"]
    assert fast["features"]["velocity_intensity_max"] > slow["features"]["velocity_intensity_max"]
    assert fast["cost"]["energy_eur"] < slow["cost"]["energy_eur"]
    assert fast["wear_rate_multiplier"] >= slow["wear_rate_multiplier"]


def test_simulate_pick_heavier_yields_higher_multiplier(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        light = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 1.0, "pick_duration_s": 3.0, "seed": 7},
        ).json()
        # Reset, damit beide Calls dasselbe Window sehen.
        client.post("/simulate/reset")
        heavy = client.post(
            "/simulate/pick",
            json={"component_weight_kg": 12.0, "pick_duration_s": 3.0, "seed": 7},
        ).json()
    assert heavy["wear_rate_multiplier"] >= light["wear_rate_multiplier"]
    assert heavy["cost"]["wear_eur"] >= light["cost"]["wear_eur"]
    # Bei strikter Monotonie sollte mindestens eines strikt größer sein:
    assert heavy["cost"]["total_eur"] > light["cost"]["total_eur"]


def test_simulate_reset_resets_cursor(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        client.post("/simulate/pick", json={"component_weight_kg": 3.5, "pick_duration_s": 2.4})
        client.post("/simulate/pick", json={"component_weight_kg": 3.5, "pick_duration_s": 2.4})
        r = client.post("/simulate/reset")
    assert r.status_code == 200
    body = r.json()
    assert body["cursor"] == 0
    assert body["total"] == 3


def test_simulate_pick_wraps_around(tmp_path):
    app = _make_app(tmp_path, with_model=True, with_simulator=True)
    with TestClient(app) as client:
        cursors = []
        for _ in range(5):  # total=3, sollte wrappen
            r = client.post(
                "/simulate/pick",
                json={"component_weight_kg": 3.5, "pick_duration_s": 2.4, "seed": 42},
            )
            assert r.status_code == 200
            cursors.append(r.json()["simulator"]["cursor"])
    assert cursors == [1, 2, 0, 1, 2]


def test_simulate_reset_503_without_simulator(tmp_path):
    app = _make_app(tmp_path, with_model=False, with_simulator=False)
    with TestClient(app) as client:
        r = client.post("/simulate/reset")
    assert r.status_code == 503
