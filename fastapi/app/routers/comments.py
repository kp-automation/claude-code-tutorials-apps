from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.schemas.comment import Comment, CommentCreate
from app.models.comment import Comment as CommentModel
from app.models.task import Task
from app.models.project import Project
from app.utils.security import get_current_user
from app.models.user import User
from app.utils.exceptions import NotFoundException, ForbiddenException

router = APIRouter(prefix="/api/tasks", tags=["comments"])


# Intentional inconsistency: Using raw SQL mixed with ORM
@router.get("/{task_id}/comments", response_model=list[Comment])
def get_task_comments(
    task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all comments for a task"""
    # Verify access using ORM
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise NotFoundException("Task not found")

    # Get comments - intentionally using different query style
    comments = db.scalars(select(CommentModel).where(CommentModel.task_id == task_id)).all()
    return comments


# Intentional inconsistency: Sparse docstring and minimal error handling
@router.post("/{task_id}/comments", response_model=Comment, status_code=status.HTTP_201_CREATED)
def create_task_comment(
    task_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify task exists and user has access
    task = (
        db.query(Task)
        .join(Project)
        .filter(Task.id == task_id, Project.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise ForbiddenException("Access denied")

    comment = CommentModel(
        content=comment_data.content, task_id=task_id, author_id=current_user.id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
