"""Deal-Desk endpoint.

POST /deal-desk/run
    Multipart upload `pdf` → runs the Deal-Desk-Agent on the uploaded
    inquiry → returns the structured Offer plus the tool-call trace for
    debugging.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict

from unifi.deal_desk.agent import run_agent
from unifi.deal_desk.schema import Offer

router = APIRouter(prefix="/deal-desk", tags=["deal-desk"])


class DealDeskRunResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offer: Offer
    tool_calls: list[dict]


@router.post("/run", response_model=DealDeskRunResponse)
async def run(pdf: UploadFile = File(...)) -> DealDeskRunResponse:
    if pdf.content_type and "pdf" not in pdf.content_type:
        raise HTTPException(
            status_code=400, detail=f"Expected a PDF, got {pdf.content_type}"
        )
    body = await pdf.read()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    try:
        result = run_agent(str(tmp_path))
    finally:
        tmp_path.unlink(missing_ok=True)

    return DealDeskRunResponse(
        offer=result.offer,
        tool_calls=[{"name": name, "args": args} for name, args in result.tool_calls],
    )
