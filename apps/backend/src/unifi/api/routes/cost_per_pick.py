"""Cost-per-Pick-Endpoints.

- POST /cost-per-pick               → expliziter Multiplier (Slider-Szenarien)
- POST /cost-per-pick/from-features → UcsFeatures, intern Wear-Rate-Booster
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from unifi.cost.engine import compute_cost_per_pick
from unifi.cost.schema import CostBreakdown, FinanceConfig, OperatingProfile
from unifi.models.wear_rate import predict_one
from unifi.ucs.schema import UcsDatasheet, UcsFeatures

router = APIRouter(prefix="/cost-per-pick", tags=["cost-per-pick"])


class CostPerPickRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    wear_rate_multiplier: float = Field(gt=0)
    motor_load_ratio_max: float = Field(default=1.0, ge=0)
    cycle_intensity: float = Field(default=1.0, gt=0)
    datasheet: UcsDatasheet | None = None
    finance: FinanceConfig | None = None
    operating: OperatingProfile | None = None


class CostFromFeaturesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features: UcsFeatures
    datasheet: UcsDatasheet | None = None
    finance: FinanceConfig | None = None
    operating: OperatingProfile | None = None


@router.post("", response_model=CostBreakdown)
def cost_per_pick(req: CostPerPickRequest, request: Request) -> CostBreakdown:
    datasheet = req.datasheet or request.app.state.default_datasheet
    return compute_cost_per_pick(
        datasheet=datasheet,
        wear_rate_multiplier=req.wear_rate_multiplier,
        motor_load_ratio_max=req.motor_load_ratio_max,
        cycle_intensity=req.cycle_intensity,
        finance=req.finance,
        operating=req.operating,
    )


@router.post("/from-features", response_model=CostBreakdown)
def cost_per_pick_from_features(
    req: CostFromFeaturesRequest, request: Request
) -> CostBreakdown:
    state = request.app.state
    if getattr(state, "booster", None) is None:
        raise HTTPException(status_code=503, detail="Wear-Rate-Modell nicht geladen.")
    multiplier, _ = predict_one(state.booster, state.feature_order, req.features)
    datasheet = req.datasheet or state.default_datasheet
    return compute_cost_per_pick(
        datasheet=datasheet,
        wear_rate_multiplier=multiplier,
        motor_load_ratio_max=req.features.motor_load_ratio_max,
        cycle_intensity=req.features.cycle_intensity,
        finance=req.finance,
        operating=req.operating,
    )
