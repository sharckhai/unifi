"""Pick-Simulator-Endpoints.

- POST /simulate/pick   → popt ein Holdout-Window, re-normalisiert auf
                          (component_weight_kg, pick_duration_s), würfelt einen
                          Random-Bias auf ein Feature, ruft Wear-Modell und
                          Cost-Engine, gibt Top-3 SHAP-Beiträge zurück.
- POST /simulate/reset  → setzt den Sampler-Cursor zurück auf 0.
"""

from __future__ import annotations

from typing import Literal

import numpy as np
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from unifi.cost.engine import compute_cost_per_pick
from unifi.cost.schema import CostBreakdown, FinanceConfig, OperatingProfile
from unifi.models.wear_rate import predict_one
from unifi.simulator.scaling import apply_random_emphasis, renormalize
from unifi.simulator.shap import ShapContribution, top_k_contributions
from unifi.ucs.schema import UcsFeatures

router = APIRouter(prefix="/simulate", tags=["simulate"])


class SimulatePickRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    component_weight_kg: float = Field(gt=0)
    pick_duration_s: float = Field(gt=0)
    seed: int | None = None
    finance: FinanceConfig | None = None
    operating: OperatingProfile | None = None


class EmphasisInfo(BaseModel):
    feature: str
    factor: float


class SourceInfo(BaseModel):
    file: str
    window_idx: int
    payload_lb: int
    speed: Literal["fullspeed", "halfspeed"]


class SimulatorState(BaseModel):
    cursor: int
    total: int


class SimulatePickResponse(BaseModel):
    wear_rate_multiplier: float
    clipped: bool
    cost: CostBreakdown
    features: UcsFeatures
    emphasis: EmphasisInfo
    shap_top: list[ShapContribution]
    source: SourceInfo
    simulator: SimulatorState


class SimulateResetResponse(BaseModel):
    cursor: int
    total: int


def _require_state(request: Request) -> tuple:
    state = request.app.state
    if getattr(state, "booster", None) is None:
        raise HTTPException(status_code=503, detail="Wear-Rate-Modell nicht geladen.")
    if getattr(state, "simulator", None) is None:
        raise HTTPException(status_code=503, detail="Window-Sampler nicht geladen.")
    return state.booster, state.feature_order, state.simulator, state.default_datasheet


@router.post("/pick", response_model=SimulatePickResponse)
def simulate_pick(req: SimulatePickRequest, request: Request) -> SimulatePickResponse:
    booster, feature_order, sampler, datasheet = _require_state(request)

    sample = sampler.pop()
    rescaled = renormalize(
        sample.features,
        source_payload_lb=sample.payload_lb,
        source_speed=sample.speed,
        component_weight_kg=req.component_weight_kg,
        pick_duration_s=req.pick_duration_s,
        datasheet=datasheet,
    )

    rng = np.random.default_rng(req.seed)
    biased, emphasis_feature, emphasis_factor = apply_random_emphasis(rescaled, rng)

    multiplier, clipped = predict_one(booster, feature_order, biased)
    cost = compute_cost_per_pick(
        datasheet=datasheet,
        wear_rate_multiplier=multiplier,
        motor_load_ratio_max=biased.motor_load_ratio_max,
        cycle_intensity=biased.cycle_intensity,
        finance=req.finance,
        operating=req.operating,
    )
    shap_top = top_k_contributions(booster, feature_order, biased, k=3)

    return SimulatePickResponse(
        wear_rate_multiplier=multiplier,
        clipped=clipped,
        cost=cost,
        features=biased,
        emphasis=EmphasisInfo(feature=emphasis_feature, factor=emphasis_factor),
        shap_top=shap_top,
        source=SourceInfo(
            file=sample.file,
            window_idx=sample.window_idx,
            payload_lb=sample.payload_lb,
            speed=sample.speed,
        ),
        simulator=SimulatorState(cursor=sampler.cursor, total=sampler.total),
    )


@router.post("/reset", response_model=SimulateResetResponse)
def simulate_reset(request: Request) -> SimulateResetResponse:
    state = request.app.state
    if getattr(state, "simulator", None) is None:
        raise HTTPException(status_code=503, detail="Window-Sampler nicht geladen.")
    state.simulator.reset()
    return SimulateResetResponse(cursor=state.simulator.cursor, total=state.simulator.total)
