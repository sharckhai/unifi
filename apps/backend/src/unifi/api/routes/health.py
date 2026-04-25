from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
def health(request: Request) -> dict[str, str | bool]:
    return {
        "status": "ok",
        "model_loaded": getattr(request.app.state, "booster", None) is not None,
    }
