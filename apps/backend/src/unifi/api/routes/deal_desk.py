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

POST /deal-desk/stream
    Multipart upload `pdf` → text/event-stream of the agent's run.
    Each step is emitted as a `data: {"type":"step",…}` line as it
    happens; the final Offer arrives as `data: {"type":"offer",…}` and
    the run ends with `data: {"type":"done"}`. Errors emit
    `data: {"type":"error",…}`.
"""

from __future__ import annotations

import asyncio
import dataclasses
import json
import logging
import tempfile
import threading
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict

from unifi.deal_desk.agent import StepEvent, run_agent
from unifi.deal_desk.schema import Offer

logger = logging.getLogger(__name__)

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


def _step_event_to_dict(event: StepEvent) -> dict[str, Any]:
    return dataclasses.asdict(event)


def _sse(payload: dict[str, Any]) -> bytes:
    return f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n".encode()


async def _agent_event_stream(pdf_path: Path) -> AsyncIterator[bytes]:
    """Run the agent in a thread, surface events via an asyncio.Queue.

    The agent's `on_step` callback fires from inside the worker thread;
    we marshal each event onto the main loop's queue with
    `loop.call_soon_threadsafe`. The async generator yields SSE-formatted
    lines until the worker pushes the sentinel.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

    def _enqueue(payload: dict[str, Any] | None) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, payload)

    def _worker() -> None:
        try:
            result = run_agent(
                str(pdf_path),
                on_step=lambda ev: _enqueue(
                    {"type": "step", "event": _step_event_to_dict(ev)}
                ),
            )
            _enqueue({"type": "offer", "offer": result.offer.model_dump(mode="json")})
            _enqueue({"type": "done"})
        except Exception as exc:  # noqa: BLE001 — surface any agent error to the client
            logger.exception("deal-desk stream agent failed")
            _enqueue(
                {
                    "type": "error",
                    "message": f"{type(exc).__name__}: {exc}",
                }
            )
        finally:
            _enqueue(None)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()

    try:
        # Initial connecting heartbeat so the browser opens the stream
        # immediately rather than waiting for the first agent step (which
        # involves a multimodal Gemini call and can take 2–5 s).
        yield _sse({"type": "connecting"})
        while True:
            payload = await queue.get()
            if payload is None:
                break
            yield _sse(payload)
    finally:
        # Ensure the worker thread cleans up even if the client disconnects.
        thread.join(timeout=0.1)


@router.post("/stream")
async def stream(pdf: UploadFile = File(...)) -> StreamingResponse:
    if pdf.content_type and "pdf" not in pdf.content_type:
        raise HTTPException(
            status_code=400, detail=f"Expected a PDF, got {pdf.content_type}"
        )
    body = await pdf.read()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(body)
        tmp_path = Path(tmp.name)

    async def generator() -> AsyncIterator[bytes]:
        try:
            async for chunk in _agent_event_stream(tmp_path):
                yield chunk
        finally:
            tmp_path.unlink(missing_ok=True)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
