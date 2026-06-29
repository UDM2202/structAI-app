# backend/routers/continuous_slab.py
from fastapi import APIRouter, HTTPException
from models.schemas import ContinuousSlabRequest, ContinuousSlabResult
from services.continuous_slab_service import calculate_continuous_slab

router = APIRouter()


@router.post("/design/sync", response_model=ContinuousSlabResult)
async def sync_continuous_slab_design(request: ContinuousSlabRequest):
    try:
        return calculate_continuous_slab(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))