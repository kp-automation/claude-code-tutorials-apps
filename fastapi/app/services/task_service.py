from sqlalchemy.orm import Session, selectinload
from app.models.task import Task, TaskStatus
from app.models.project import Project
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.notification_service import notify_task_assigned, notify_task_completed
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_tasks(db: Session, user: User, project_id: int | None = None) -> list[Task]:
    """Get tasks, optionally filtered by project"""
    # Authorization is enforced through the project join: only tasks belonging to
    # projects the caller owns are visible. Assignees cannot read tasks assigned to them
    # unless they also own the parent project.
    query = db.query(Task).join(Project).filter(Project.owner_id == user.id)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    return query.all()


def get_task(db: Session, task_id: int, user: User) -> Task:
    """Get a specific task"""
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == user.id)
        .first()
    )
    # Returning NotFoundException for both "not found" and "not owned" cases intentionally
    # avoids leaking whether a task ID exists to users who don't own the parent project.
    if not task:
        raise NotFoundException("Task not found")
    return task


def create_task(db: Session, task_data: TaskCreate, user: User) -> Task:
    """Create a new task"""
    # Can't use the join-based pattern from get_task here because the task doesn't exist
    # yet, so ownership must be verified against the project directly before inserting.
    project = db.query(Project).filter(Project.id == task_data.project_id).first()
    if not project or project.owner_id != user.id:
        raise ForbiddenException("Access denied to this project")

    task = Task(**task_data.model_dump())
    db.add(task)
    # Commit before notifying so task.id is populated from the DB sequence.
    # If a notification call fails, the task is already saved — notifications are
    # best-effort and do not roll back task creation.
    db.commit()
    db.refresh(task)

    if task.assignee_id is not None:
        notify_task_assigned(db, user, task)
    if task.status == TaskStatus.DONE:
        notify_task_completed(db, user, task)

    return task


def update_task(db: Session, task_id: int, task_data: TaskUpdate, user: User) -> Task:
    """Update a task"""
    task = get_task(db, task_id, user)
    # Capture pre-update values before setattr mutations overwrite the in-memory object.
    prior_assignee_id = task.assignee_id
    prior_status = task.status

    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)

    # Three conditions are all required:
    # - "assignee_id" in update_data: field was explicitly sent (exclude_unset means absent
    #   fields aren't here, so patching other fields won't re-notify the existing assignee)
    # - task.assignee_id is not None: handles the unassign case (None → no notification)
    # - != prior_assignee_id: prevents re-notifying when the same assignee is re-submitted
    if (
        "assignee_id" in update_data
        and task.assignee_id is not None
        and task.assignee_id != prior_assignee_id
    ):
        notify_task_assigned(db, user, task)
    # Guard against prior_status prevents re-firing on every save of an already-DONE task.
    if (
        task.status == TaskStatus.DONE
        and prior_status != TaskStatus.DONE
    ):
        notify_task_completed(db, user, task)

    return task


def delete_task(db: Session, task_id: int, user: User) -> None:
    """Delete a task"""
    task = get_task(db, task_id, user)
    db.delete(task)
    db.commit()


def get_tasks_for_export(db: Session, project_id: int, user: User) -> list[Task]:
    """Get all tasks for a project with labels and assignee eagerly loaded."""
    return (
        db.query(Task)
        .join(Project)
        .filter(Task.project_id == project_id, Project.owner_id == user.id)
        .options(selectinload(Task.labels), selectinload(Task.assignee))
        .order_by(Task.created_at)
        .all()
    )
