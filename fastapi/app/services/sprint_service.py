from sqlalchemy.orm import Session
from app.models.sprint import Sprint
from app.models.project import Project
from app.models.user import User
from app.schemas.sprint import SprintCreate, SprintUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_sprints(db: Session, project_id: int, user: User) -> list[Sprint]:
    return (
        db.query(Sprint)
        .join(Project)
        .filter(Sprint.project_id == project_id, Project.owner_id == user.id)
        .all()
    )


def get_sprint(db: Session, sprint_id: int, user: User) -> Sprint:
    sprint = (
        db.query(Sprint)
        .join(Project)
        .filter(Sprint.id == sprint_id, Project.owner_id == user.id)
        .first()
    )
    if not sprint:
        raise NotFoundException("Sprint not found")
    return sprint


def create_sprint(db: Session, data: SprintCreate, user: User) -> Sprint:
    project = (
        db.query(Project)
        .filter(Project.id == data.project_id, Project.owner_id == user.id)
        .first()
    )
    if not project:
        raise NotFoundException("Project not found")

    sprint = Sprint(**data.model_dump())
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def update_sprint(db: Session, sprint_id: int, data: SprintUpdate, user: User) -> Sprint:
    sprint = get_sprint(db, sprint_id, user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(sprint, key, value)
    db.commit()
    db.refresh(sprint)
    return sprint


def delete_sprint(db: Session, sprint_id: int, user: User) -> None:
    sprint = get_sprint(db, sprint_id, user)
    db.delete(sprint)
    db.commit()
