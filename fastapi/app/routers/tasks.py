from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.repositories.task_repository import TaskRepository
from app.schemas.task import Task, TaskCreate, TaskUpdate
from app.models.task import TaskStatus
from app.services.notification_service import notify_task_assigned, notify_task_completed
from app.utils.exceptions import NotFoundException
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_task_repo(db: Session = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)


@router.get("", response_model=list[Task])
def list_tasks(
    project_id: int | None = Query(None),
    status: TaskStatus | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    repo: TaskRepository = Depends(get_task_repo),
):
    """List all tasks, optionally filtered by project_id or status, with pagination"""
    return repo.get_all(current_user.id, project_id, status, page, per_page)


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_new_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    repo: TaskRepository = Depends(get_task_repo),
):
    """Create a new task"""
    task = repo.create(task_data, current_user.id)
    if task.assignee_id is not None:
        notify_task_assigned(repo.db, current_user, task)
    if task.status == TaskStatus.DONE:
        notify_task_completed(repo.db, current_user, task)
    return task


@router.get("/{task_id}", response_model=Task)
def get_task_by_id(
    task_id: int,
    current_user: User = Depends(get_current_user),
    repo: TaskRepository = Depends(get_task_repo),
):
    """Get a specific task"""
    task = repo.get_by_id(task_id, current_user.id)
    if not task:
        raise NotFoundException("Task not found")
    return task


@router.put("/{task_id}", response_model=Task)
def update_task_by_id(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    repo: TaskRepository = Depends(get_task_repo),
):
    """Update a task"""
    # Capture prior state before the repo mutates the ORM object in-place.
    # SQLAlchemy's identity map means prior and the returned task are the same
    # Python object, so these values must be saved now.
    prior = repo.get_by_id(task_id, current_user.id)
    if not prior:
        raise NotFoundException("Task not found")
    prior_assignee_id = prior.assignee_id
    prior_status = prior.status

    task = repo.update(task_id, task_data, current_user.id)

    update_data = task_data.model_dump(exclude_unset=True)
    if (
        "assignee_id" in update_data
        and task.assignee_id is not None
        and task.assignee_id != prior_assignee_id
    ):
        notify_task_assigned(repo.db, current_user, task)

    if task.status == TaskStatus.DONE and prior_status != TaskStatus.DONE:
        notify_task_completed(repo.db, current_user, task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_by_id(
    task_id: int,
    current_user: User = Depends(get_current_user),
    repo: TaskRepository = Depends(get_task_repo),
):
    """Delete a task"""
    if not repo.delete(task_id, current_user.id):
        raise NotFoundException("Task not found")
    return None
