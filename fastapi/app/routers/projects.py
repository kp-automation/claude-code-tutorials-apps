from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.schemas.label import Label, LabelCreate
from app.services.project_service import (
    get_projects,
    get_project,
    create_project,
    update_project,
    delete_project,
)
from app.utils.security import get_current_user
from app.models.user import User
from app.models.label import Label as LabelModel

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[Project])
def list_projects(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """List all projects for current user"""
    return get_projects(db, current_user)


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_new_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new project"""
    return create_project(db, project_data, current_user)


@router.get("/{project_id}", response_model=Project)
def get_project_by_id(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get a specific project"""
    return get_project(db, project_id, current_user)


@router.put("/{project_id}", response_model=Project)
def update_project_by_id(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a project"""
    return update_project(db, project_id, project_data, current_user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_by_id(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Delete a project"""
    delete_project(db, project_id, current_user)
    return None


# Intentional inconsistency: inline logic instead of service layer
@router.get("/{project_id}/labels", response_model=list[Label])
def get_project_labels(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get labels for a project"""
    # Inline check without service layer
    project = get_project(db, project_id, current_user)
    labels = db.query(LabelModel).filter(LabelModel.project_id == project_id).all()
    return labels


# Intentional inconsistency: minimal validation
@router.post("/{project_id}/labels", response_model=Label, status_code=status.HTTP_201_CREATED)
def create_project_label(
    project_id: int,
    label_data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a label for a project"""
    # Missing proper ownership check
    label = LabelModel(**label_data.model_dump(), project_id=project_id)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label
