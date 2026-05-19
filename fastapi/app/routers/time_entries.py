from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.time_entry import TimeEntry, TimeEntryCreate, TimeEntryUpdate
from app.services.time_entry_service import (
    get_time_entries,
    create_time_entry,
    update_time_entry,
    delete_time_entry,
)
from app.utils.security import get_current_user
from app.models.user import User

# Router for nested routes under /api/tasks
router_tasks = APIRouter(prefix="/api/tasks", tags=["time-entries"])

# Router for detail routes under /api/time-entries
router_entries = APIRouter(prefix="/api/time-entries", tags=["time-entries"])


@router_tasks.get("/{task_id}/time-entries", response_model=list[TimeEntry])
def list_time_entries(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all time entries for a task"""
    return get_time_entries(db, task_id, current_user)


@router_tasks.post(
    "/{task_id}/time-entries",
    response_model=TimeEntry,
    status_code=status.HTTP_201_CREATED,
)
def create_new_time_entry(
    task_id: int,
    entry_data: TimeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new time entry on a task"""
    return create_time_entry(db, task_id, entry_data, current_user)


@router_entries.patch("/{entry_id}", response_model=TimeEntry)
def update_time_entry_by_id(
    entry_id: int,
    entry_data: TimeEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a time entry"""
    return update_time_entry(db, entry_id, entry_data, current_user)


@router_entries.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_entry_by_id(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a time entry"""
    delete_time_entry(db, entry_id, current_user)
    return None
