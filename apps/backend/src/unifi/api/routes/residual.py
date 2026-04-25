"""Restwert-Endpoints.

- POST /residual/value  → stateless, gegebenes RobotState → ResidualValue.
- GET  /residual/live   → Live-Restwert basierend auf Simulator-Akkumulator.
- GET  /residual/fleet  → synthetische 12-Roboter-Flotte für Bank-View.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from unifi.residual.engine import compute_residual_value
from unifi.residual.fleet import generate_synthetic_fleet
from unifi.residual.schema import (
    FleetEntry,
    ResidualConfig,
    ResidualValue,
    RobotState,
)
from unifi.ucs.schema import UcsDatasheet

router = APIRouter(prefix="/residual", tags=["residual"])


class ResidualValueRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: RobotState
    datasheet: UcsDatasheet | None = None
    config: ResidualConfig | None = None


class LiveResidualResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: RobotState
    residual: ResidualValue
    commissioned_at: datetime


class FleetResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fleet: list[FleetEntry]
    total_residual_eur: float
    weighted_combined_decay: float


@router.post("/value", response_model=ResidualValue)
def residual_value(req: ResidualValueRequest, request: Request) -> ResidualValue:
    datasheet = req.datasheet or request.app.state.default_datasheet
    return compute_residual_value(
        datasheet=datasheet, state=req.state, config=req.config
    )


@router.get("/live", response_model=LiveResidualResponse)
def residual_live(
    request: Request, simulated_age_years: float | None = None
) -> LiveResidualResponse:
    state = request.app.state
    if getattr(state, "live_robot", None) is None:
        raise HTTPException(status_code=503, detail="Live-Robot-State nicht initialisiert.")
    snap = state.live_robot.snapshot(simulated_age_years=simulated_age_years)
    residual = compute_residual_value(datasheet=state.default_datasheet, state=snap)
    return LiveResidualResponse(
        state=snap, residual=residual, commissioned_at=state.live_robot.commissioned_at
    )


@router.get("/fleet", response_model=FleetResponse)
def residual_fleet(request: Request, seed: int = 42) -> FleetResponse:
    fleet = generate_synthetic_fleet(request.app.state.default_datasheet, seed=seed)
    total = sum(e.residual.residual_value_eur for e in fleet)
    if total > 0:
        weighted_decay = (
            sum(e.residual.combined_decay * e.residual.residual_value_eur for e in fleet)
            / total
        )
    else:
        weighted_decay = 0.0
    return FleetResponse(
        fleet=fleet,
        total_residual_eur=total,
        weighted_combined_decay=weighted_decay,
    )
