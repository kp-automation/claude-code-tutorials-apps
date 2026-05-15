from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models.time_entry import TimeEntry
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.schemas.time_entry import TimeEntryCreate, TimeEntryUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_time_entries(db: Session, task_id: int, user: User) -> list[TimeEntry]:
    """Get all time entries for a task, verifying project ownership."""
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == user.id)
        .first()
    )
    if not task:
        raise NotFoundException("Task not found")

    return (
        db.query(TimeEntry)
        .options(joinedload(TimeEntry.user))
        .filter(TimeEntry.task_id == task_id)
        .order_by(TimeEntry.created_at.desc(), TimeEntry.id.desc())
        .all()
    )


def create_time_entry(db: Session, task_id: int, entry_data: TimeEntryCreate, user: User) -> TimeEntry:
    """Create a time entry on a task, verifying project ownership."""
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == user.id)
        .first()
    )
    if not task:
        raise NotFoundException("Task not found")

    entry = TimeEntry(
        duration_seconds=entry_data.duration_seconds,
        description=entry_data.description,
        task_id=task_id,
        user_id=user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_time_entry(db: Session, entry_id: int, entry_data: TimeEntryUpdate, user: User) -> TimeEntry:
    """Update a time entry, verifying entry ownership."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise NotFoundException("Time entry not found")
    if entry.user_id != user.id:
        raise ForbiddenException("Access denied to this time entry")

    for key, value in entry_data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_time_entry(db: Session, entry_id: int, user: User) -> None:
    """Delete a time entry, verifying entry ownership."""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise NotFoundException("Time entry not found")
    if entry.user_id != user.id:
        raise ForbiddenException("Access denied to this time entry")

    db.delete(entry)
    db.commit()


def get_project_time_report(db: Session, project_id: int, user: User) -> list[dict]:
    """Get per-user time totals for all tasks in a project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == user.id)
        .first()
    )
    if not project:
        raise NotFoundException("Project not found")

    rows = (
        db.query(
            TimeEntry.user_id,
            func.sum(TimeEntry.duration_seconds).label("total_seconds"),
            func.count(TimeEntry.id).label("entry_count"),
        )
        .join(Task, TimeEntry.task_id == Task.id)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.id == project_id, Project.owner_id == user.id)
        .group_by(TimeEntry.user_id)
        .all()
    )

    if not rows:
        return []

    user_ids = [row.user_id for row in rows]
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    report = []
    for row in rows:
        u = user_map.get(row.user_id)
        report.append(
            {
                "userId": row.user_id,
                "userName": u.name if u else None,
                "userEmail": u.email if u else None,
                "totalSeconds": row.total_seconds,
                "entryCount": row.entry_count,
            }
        )
    return report
