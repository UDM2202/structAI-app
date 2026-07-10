from fastapi import APIRouter, HTTPException
from models.column_schemas import ColumnDesignRequest
from services.column_service import calculate_column_design

router = APIRouter()

@router.post("/design/sync")
async def design_column_sync(request: ColumnDesignRequest):
    try:
        return calculate_column_design(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Column design failed: {e}")