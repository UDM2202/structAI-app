from fastapi import APIRouter, HTTPException
from models.continuous_beam_schemas import ContinuousBeamRequest, ContinuousBeamResult
from services.continuous_beam_service import calculate_continuous_beam

router = APIRouter()


@router.post("/design/sync", response_model=ContinuousBeamResult)
async def sync_continuous_beam(request: ContinuousBeamRequest):
    try:
        return calculate_continuous_beam(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))