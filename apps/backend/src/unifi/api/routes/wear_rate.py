"""POST /wear-rate/predict — applies trained LightGBM to a UcsFeatures vector."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from unifi.models.wear_rate import predict_one
from unifi.ucs.schema import UcsFeatures

router = APIRouter(prefix="/wear-rate", tags=["wear-rate"])


class PredictResponse(BaseModel):
    wear_rate_multiplier: float
    model_version: str
    clipped: bool


@router.post("/predict", response_model=PredictResponse)
def predict(features: UcsFeatures, request: Request) -> PredictResponse:
    state = request.app.state
    if getattr(state, "booster", None) is None:
        raise HTTPException(status_code=503, detail="Wear-Rate-Modell nicht geladen.")
    multiplier, clipped = predict_one(state.booster, state.feature_order, features)
    return PredictResponse(
        wear_rate_multiplier=multiplier,
        model_version=state.model_version,
        clipped=clipped,
    )
