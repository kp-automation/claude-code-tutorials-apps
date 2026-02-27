from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_tasks(db: Session, user: User, project_id: int | None = None) -> list[Task]:
    """Get tasks, optionally filtered by project"""
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
    if not task:
        raise NotFoundException("Task not found")
    return task


def create_task(db: Session, task_data: TaskCreate, user: User) -> Task:
    """Create a new task"""
    # Verify project ownership
    project = db.query(Project).filter(Project.id == task_data.project_id).first()
    if not project or project.owner_id != user.id:
        raise ForbiddenException("Access denied to this project")

    task = Task(**task_data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, task_data: TaskUpdate, user: User) -> Task:
    """Update a task"""
    task = get_task(db, task_id, user)
    update_data = task_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int, user: User) -> None:
    """Delete a task"""
    task = get_task(db, task_id, user)
    db.delete(task)
    db.commit()
