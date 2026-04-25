"""Deal-Desk endpoints.

POST /deal-desk/run
    Multipart upload `pdf` → runs the Deal-Desk-Agent on the uploaded
    inquiry → returns the structured Offer plus the tool-call trace.

POST /deal-desk/run-from-path
    JSON body `{"pdf_path": "..."}` → runs the Deal-Desk-Agent on a PDF
    that already exists on the backend's filesystem. Used by the
    frontend when the inquiry has been pre-uploaded or lives in a known
    location (e.g., the fixtures dir during the demo). Hackathon
    convenience — production would lock the path to an allow-list.
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


class DealDeskRunFromPathRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pdf_path: str


def _result_to_response(result) -> DealDeskRunResponse:
    return DealDeskRunResponse(
        offer=result.offer,
        tool_calls=[{"name": name, "args": args} for name, args in result.tool_calls],
    )


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

    return _result_to_response(result)


@router.post("/run-from-path", response_model=DealDeskRunResponse)
def run_from_path(req: DealDeskRunFromPathRequest) -> DealDeskRunResponse:
    path = Path(req.pdf_path).expanduser()
    if not path.is_absolute():
        path = path.resolve()
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {path}")
    if not path.is_file():
        raise HTTPException(status_code=400, detail=f"Not a file: {path}")
    if path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail=f"Not a PDF: {path}")

    result = run_agent(str(path))
    return _result_to_response(result)
