from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.widget import Widget, WidgetCreate, WidgetUpdate
from app.services.widget_service import (
    get_widgets,
    get_widget,
    create_widget,
    update_widget,
    delete_widget,
)
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/widgets", tags=["widgets"])


@router.get("", response_model=list[Widget])
def list_widgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_widgets(db, current_user)


@router.post("", response_model=Widget, status_code=status.HTTP_201_CREATED)
def create_new_widget(
    data: WidgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_widget(db, data, current_user)


@router.get("/{widget_id}", response_model=Widget)
def get_widget_by_id(
    widget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_widget(db, widget_id, current_user)


@router.put("/{widget_id}", response_model=Widget)
def update_widget_by_id(
    widget_id: int,
    data: WidgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_widget(db, widget_id, data, current_user)


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget_by_id(
    widget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    delete_widget(db, widget_id, current_user)
    return None
