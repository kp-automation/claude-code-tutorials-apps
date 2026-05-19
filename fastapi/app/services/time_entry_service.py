from sqlalchemy.orm import Session
from app.models.time_entry import TimeEntry
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_time_entries(db: Session, task_id: int, user: User) -> list[TimeEntry]:
    # Verify task belongs to user via project ownership
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == user.id)
        .first()
    )
    if not task:
        raise NotFoundException("Task not found")
    return db.query(TimeEntry).filter(TimeEntry.task_id == task_id).all()


def create_time_entry(db: Session, task_id: int, data: TimeEntryCreate, user: User) -> TimeEntry:
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == user.id)
        .first()
    )
    if not task:
        raise NotFoundException("Task not found")
    entry = TimeEntry(**data.model_dump(), task_id=task_id, user_id=user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_time_entry(db: Session, entry_id: int, data: TimeEntryUpdate, user: User) -> TimeEntry:
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise NotFoundException("Time entry not found")
    if entry.user_id != user.id:
        raise ForbiddenException("Forbidden")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_time_entry(db: Session, entry_id: int, user: User) -> None:
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise NotFoundException("Time entry not found")
    if entry.user_id != user.id:
        raise ForbiddenException("Forbidden")
    db.delete(entry)
    db.commit()
