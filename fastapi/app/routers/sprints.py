from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.sprint import Sprint, SprintCreate, SprintUpdate
from app.services.sprint_service import (
    get_sprints,
    get_sprint,
    create_sprint,
    update_sprint,
    delete_sprint,
)
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/sprints", tags=["sprints"])


@router.get("", response_model=list[Sprint])
def list_sprints(
    project_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_sprints(db, project_id, current_user)


@router.post("", response_model=Sprint, status_code=status.HTTP_201_CREATED)
def create_new_sprint(
    sprint_data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_sprint(db, sprint_data, current_user)


@router.get("/{sprint_id}", response_model=Sprint)
def get_sprint_by_id(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_sprint(db, sprint_id, current_user)


@router.put("/{sprint_id}", response_model=Sprint)
def update_sprint_by_id(
    sprint_id: int,
    sprint_data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_sprint(db, sprint_id, sprint_data, current_user)


@router.delete("/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sprint_by_id(
    sprint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_sprint(db, sprint_id, current_user)
    return None
