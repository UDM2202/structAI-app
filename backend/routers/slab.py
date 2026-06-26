from fastapi import APIRouter, HTTPException
from models.schemas import SlabDesignRequest, SlabDesignResult, TaskResponse, TaskStatusResponse
from services.slab_service import calculate_slab_design
from utils.task_manager import create_task, get_task, run_async

router = APIRouter()

@router.post("/design", response_model=TaskResponse)
async def start_slab_design(request: SlabDesignRequest):
    """
    Start a slab design calculation.
    Returns a task ID for polling.
    """
    try:
        task_id = create_task()
        
        # Run calculation asynchronously
        run_async(task_id, calculate_slab_design, request)
        
        return TaskResponse(
            task_id=task_id,
            status="pending",
            message="Design calculation started"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Poll the status of a design task.
    """
    task = get_task(task_id)
    
    if task["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task["status"],
        progress=task.get("progress", 0),
        result=task.get("result"),
        error=task.get("error")
    )

@router.post("/design/sync", response_model=SlabDesignResult)
async def sync_slab_design(request: SlabDesignRequest):
    """
    Synchronous slab design calculation.
    Returns results immediately (for small calculations).
    """
    try:
        result = calculate_slab_design(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))