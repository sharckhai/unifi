"""FastAPI-TestClient-Smoke für /health und /wear-rate/predict.

Trainiert beim Setup ein Mini-LightGBM auf synthetischen Daten und injiziert
es in `app.state` — keine Abhängigkeit auf das echte Booster-Artefakt.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from unifi.api.routes import health, wear_rate
from unifi.models.wear_rate import TrainParams, train


def _normal_features_payload(**overrides) -> dict:
    base = {
        "motor_load_ratio_max": 1.0,
        "motor_load_ratio_mean": 0.4,
        "motor_load_ratio_std": 0.2,
        "cycle_intensity": 1.0,
        "velocity_intensity_max": 0.3,
        "torque_load_ratio_max": 0.4,
        "temp_delta_normalized_max": 0.1,
        "temp_delta_normalized_mean": 0.05,
        "tcp_force_norm": 1.5,
        "tracking_error_rms": 0.001,
        "thermal_state": "warm",
        "payload_class": "light",
    }
    base.update(overrides)
    return base


def _make_app(with_model: bool) -> FastAPI:
    booster = None
    feature_order = None
    cat_idx = None
    version = None
    if with_model:
        # Mini-Train auf synthetischen Daten.
        from tests.test_wear_rate_model import _synthetic_labeled_df

        df = _synthetic_labeled_df(n=120)
        result = train(df, TrainParams(n_estimators=50, early_stopping_rounds=10))
        booster = result.booster
        feature_order = result.feature_order
        cat_idx = result.categorical_indices
        version = "test1234"

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.booster = booster
        app.state.feature_order = feature_order
        app.state.categorical_indices = cat_idx
        app.state.model_version = version
        yield

    app = FastAPI(lifespan=lifespan)
    app.include_router(health.router)
    app.include_router(wear_rate.router)
    return app


def test_health_without_model():
    with TestClient(_make_app(with_model=False)) as client:
        r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "model_loaded": False}


def test_predict_returns_503_without_model():
    with TestClient(_make_app(with_model=False)) as client:
        r = client.post("/wear-rate/predict", json=_normal_features_payload())
    assert r.status_code == 503


def test_health_with_model():
    with TestClient(_make_app(with_model=True)) as client:
        r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "model_loaded": True}


def test_predict_with_model_returns_plausible_response():
    with TestClient(_make_app(with_model=True)) as client:
        r = client.post("/wear-rate/predict", json=_normal_features_payload())
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"wear_rate_multiplier", "model_version", "clipped"}
    assert body["model_version"] == "test1234"
    assert isinstance(body["clipped"], bool)
    assert 0.3 <= body["wear_rate_multiplier"] <= 5.0


def test_predict_validates_pydantic_body():
    with TestClient(_make_app(with_model=True)) as client:
        bad = _normal_features_payload(motor_load_ratio_max=-0.5)
        r = client.post("/wear-rate/predict", json=bad)
    assert r.status_code == 422


def test_predict_rejects_bad_categorical():
    with TestClient(_make_app(with_model=True)) as client:
        bad = _normal_features_payload(thermal_state="lukewarm")
        r = client.post("/wear-rate/predict", json=bad)
    assert r.status_code == 422


@pytest.mark.parametrize(
    "heavy_overrides,light_overrides",
    [
        (
            {"motor_load_ratio_max": 1.3, "payload_class": "heavy"},
            {"motor_load_ratio_max": 0.8, "payload_class": "light"},
        ),
    ],
)
def test_heavy_predicted_higher_than_light(heavy_overrides, light_overrides):
    with TestClient(_make_app(with_model=True)) as client:
        h = client.post("/wear-rate/predict", json=_normal_features_payload(**heavy_overrides))
        light = client.post("/wear-rate/predict", json=_normal_features_payload(**light_overrides))
    assert h.status_code == 200 and light.status_code == 200
    assert h.json()["wear_rate_multiplier"] > light.json()["wear_rate_multiplier"]
