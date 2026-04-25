"""FastAPI-App-Factory mit Lifespan-Loader fürs Wear-Rate-Modell.

Lädt beim Startup das LightGBM-Booster-Artefakt aus `artifacts/` (sofern
vorhanden) und legt es als `app.state.booster` ab. Routen (`/health`,
`/wear-rate/predict`) lesen daraus.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from unifi.api.routes import health, wear_rate
from unifi.core.config import get_settings
from unifi.models.wear_rate import load


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
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
    yield


app = FastAPI(title="UNIFI Backend", version="0.1.0", lifespan=lifespan)
app.include_router(health.router)
app.include_router(wear_rate.router)
