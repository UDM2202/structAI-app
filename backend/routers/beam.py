# backend/routers/beam.py
from fastapi import APIRouter, HTTPException
from models.beam_schemas import BeamDesignRequest, BeamDesignResult
from services.beam_service import calculate_beam_design

router = APIRouter()


@router.post("/design/sync", response_model=BeamDesignResult)
async def sync_beam_design(request: BeamDesignRequest):
    """Synchronous beam design — returns results immediately."""
    try:
        return calculate_beam_design(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))