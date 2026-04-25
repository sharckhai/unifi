"""FastAPI-App-Factory mit Lifespan-Loader.

Lädt beim Startup:
- Default-Datasheet (UR5) als `app.state.default_datasheet`. Pflicht — ohne
  Datasheet kein Cost-Endpoint sinnvoll.
- LightGBM-Booster als `app.state.booster` (optional — `/wear-rate/predict`
  und `/cost-per-pick/from-features` geben 503 wenn nicht geladen).
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from unifi.api.routes import cost_per_pick, health, residual, simulate, wear_rate
from unifi.core.config import get_settings
from unifi.models.wear_rate import load
from unifi.residual.accumulator import LiveRobotState
from unifi.simulator.sampler import WindowSampler
from unifi.ucs.schema import UcsDatasheet


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.default_datasheet = UcsDatasheet.model_validate_json(
        settings.ur5_datasheet_path.read_text()
    )
    try:
        booster, feature_order, cat_idx, version = load(settings.artifacts_dir)
        app.state.booster = booster
        app.state.feature_order = feature_order
        app.state.categorical_indices = cat_idx
        app.state.model_version = version
    except FileNotFoundError:
        app.state.booster = None
        app.state.feature_order = None
        app.state.categorical_indices = None
        app.state.model_version = None
    try:
        app.state.simulator = WindowSampler.from_parquet(
            settings.artifacts_dir / "ur5_windows.parquet"
        )
    except (FileNotFoundError, ValueError):
        app.state.simulator = None
    app.state.live_robot = LiveRobotState()
    yield


app = FastAPI(title="UNIFI Backend", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(wear_rate.router)
app.include_router(cost_per_pick.router)
app.include_router(simulate.router)
app.include_router(residual.router)
