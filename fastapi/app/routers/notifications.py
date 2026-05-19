from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.notification import Notification, UnreadCount, ReadAllResponse
from app.services.notification_service import (
    list_for_user,
    unread_count,
    mark_read,
    mark_all_read,
)
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[Notification])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the current user, newest first."""
    return list_for_user(db, current_user)


@router.get("/unread-count", response_model=UnreadCount)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Number of unread notifications for the current user."""
    return UnreadCount(count=unread_count(db, current_user))


@router.post("/read-all", response_model=ReadAllResponse)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark every unread notification for the current user as read."""
    return ReadAllResponse(updated=mark_all_read(db, current_user))


@router.post("/{notification_id}/read", response_model=Notification)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark one notification read."""
    return mark_read(db, notification_id, current_user)
