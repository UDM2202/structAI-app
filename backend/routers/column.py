# backend/routers/column.py
"""
Column design endpoints.

Path kept as /api/column/design/sync to match what columnAPI.startDesign in
src/services/api.js already posts to.

response_model_by_alias is left at its FastAPI default of True on purpose.
ColAxisResult.lambda_ and ColCheck.passed carry aliases because `lambda` and
`pass` are Python reserved words; with the default the client receives
"lambda" and "pass", which is what ColumnResults.jsx reads. Setting it to
False would not raise an error — the per-level tables would simply render
blank, which is a much harder failure to trace.
"""

import logging

from fastapi import APIRouter, HTTPException

from models.column_schemas import ColumnDesignRequest, ColumnDesignResult
from services.column_service import design_column

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/column", tags=["column"])


@router.post("/design/sync", response_model=ColumnDesignResult)
def design_column_sync(request: ColumnDesignRequest) -> ColumnDesignResult:
    """
    Run a full EC2 column design and return the result synchronously.

    Request validation errors are raised by Pydantic and surface as 422 with
    the field path, which extractErrorMessage() in api.js already unpacks.
    A ValueError from the engine means the inputs validated but the design
    could not be carried out (unsupported grade, impossible geometry), so it
    is reported as 400 rather than 500.
    """
    try:
        return design_column(request)
    except ValueError as exc:
        logger.warning("Column design rejected: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Column design failed unexpectedly")
        raise HTTPException(
            status_code=500,
            detail="The column design engine failed unexpectedly. "
                   "Check the server log for the full traceback.",
        ) from exc


@router.get("/health")
def column_health() -> dict:
    """Cheap check that the router and engine import cleanly."""
    return {"status": "ok", "module": "column"}