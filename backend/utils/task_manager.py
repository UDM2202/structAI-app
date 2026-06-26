# backend/utils/task_manager.py
import uuid
import time
import threading
from typing import Dict, Any
from datetime import datetime

# In-memory task store (replace with Redis/DB in production)
tasks: Dict[str, Dict[str, Any]] = {}

def create_task() -> str:
    """Create a new task and return its ID"""
    task_id = str(uuid.uuid4())
    tasks[task_id] = {
        "status": "pending",
        "progress": 0,
        "result": None,
        "error": None,
        "created_at": datetime.now().isoformat()
    }
    return task_id

def get_task(task_id: str) -> Dict:
    """Get task status"""
    return tasks.get(task_id, {"status": "not_found"})

def update_task(task_id: str, **kwargs):
    """Update task fields"""
    if task_id in tasks:
        tasks[task_id].update(kwargs)

def run_async(task_id: str, func, *args, **kwargs):
    """Run a function asynchronously and store result in task"""
    def wrapper():
        try:
            update_task(task_id, status="running", progress=10)
            
            # Execute the design function
            result = func(*args, **kwargs)
            
            update_task(
                task_id,
                status="completed",
                progress=100,
                result=result
            )
        except Exception as e:
            update_task(
                task_id,
                status="failed",
                progress=0,
                error=str(e)
            )
    
    thread = threading.Thread(target=wrapper)
    thread.start()
    return task_id