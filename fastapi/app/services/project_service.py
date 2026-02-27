from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.utils.exceptions import NotFoundException, ForbiddenException


def get_projects(db: Session, user: User) -> list[Project]:
    """Get all projects for the current user"""
    return db.query(Project).filter(Project.owner_id == user.id).all()


def get_project(db: Session, project_id: int, user: User) -> Project:
    """Get a specific project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise NotFoundException("Project not found")
    if project.owner_id != user.id:
        raise ForbiddenException("Access denied")
    return project


def create_project(db: Session, project_data: ProjectCreate, user: User) -> Project:
    """Create a new project"""
    project = Project(**project_data.model_dump(), owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(
    db: Session, project_id: int, project_data: ProjectUpdate, user: User
) -> Project:
    """Update a project"""
    project = get_project(db, project_id, user)
    update_data = project_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int, user: User) -> None:
    """Delete a project"""
    project = get_project(db, project_id, user)
    db.delete(project)
    db.commit()
