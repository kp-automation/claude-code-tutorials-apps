import re
from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload
from app.models.notification import Notification, NotificationType
from app.models.task import Task
from app.models.comment import Comment
from app.models.user import User
from app.utils.exceptions import NotFoundException, ForbiddenException


_MENTION_RE = re.compile(r"@([A-Za-z0-9_]+)")


def parse_mentions(body: str) -> list[str]:
    """Extract @<name> tokens from a comment body, lowercased."""
    return [m.group(1).lower() for m in _MENTION_RE.finditer(body or "")]


def _create(
    db: Session,
    user_id: int,
    type_: NotificationType,
    actor_id: int,
    task_id: int | None = None,
    comment_id: int | None = None,
) -> None:
    """Best-effort write — never raises."""
    try:
        notification = Notification(
            user_id=user_id,
            actor_id=actor_id,
            type=type_,
            task_id=task_id,
            comment_id=comment_id,
        )
        db.add(notification)
        db.commit()
    except Exception:
        db.rollback()


def notify_task_assigned(db: Session, actor: User, task: Task) -> None:
    if task.assignee_id is None or task.assignee_id == actor.id:
        return
    _create(
        db,
        user_id=task.assignee_id,
        type_=NotificationType.TASK_ASSIGNED,
        actor_id=actor.id,
        task_id=task.id,
    )


def notify_task_completed(db: Session, actor: User, task: Task) -> None:
    project_owner_id = task.project.owner_id if task.project else None
    recipients: set[int] = set()
    if task.assignee_id is not None:
        recipients.add(task.assignee_id)
    if project_owner_id is not None:
        recipients.add(project_owner_id)
    recipients.discard(actor.id)
    for recipient_id in recipients:
        _create(
            db,
            user_id=recipient_id,
            type_=NotificationType.TASK_COMPLETED,
            actor_id=actor.id,
            task_id=task.id,
        )


def notify_mentions(db: Session, actor: User, comment: Comment) -> None:
    names = parse_mentions(comment.content)
    if not names:
        return
    try:
        users = (
            db.query(User)
            .filter(func.lower(User.name).in_(names), User.id != actor.id)
            .all()
        )
    except Exception:
        return
    for user in users:
        _create(
            db,
            user_id=user.id,
            type_=NotificationType.MENTION,
            actor_id=actor.id,
            task_id=comment.task_id,
            comment_id=comment.id,
        )


def list_for_user(db: Session, user: User, limit: int = 50) -> list[Notification]:
    return (
        db.query(Notification)
        .options(
            joinedload(Notification.actor),
            joinedload(Notification.task),
            joinedload(Notification.comment),
        )
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def unread_count(db: Session, user: User) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read.is_(False))
        .count()
    )


def mark_read(db: Session, notification_id: int, user: User) -> Notification:
    notification = (
        db.query(Notification)
        .options(
            joinedload(Notification.actor),
            joinedload(Notification.task),
            joinedload(Notification.comment),
        )
        .filter(Notification.id == notification_id)
        .first()
    )
    if not notification:
        raise NotFoundException("Notification not found")
    if notification.user_id != user.id:
        raise ForbiddenException("Forbidden")
    if not notification.read:
        notification.read = True
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_read(db: Session, user: User) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read.is_(False))
        .values(read=True)
    )
    db.commit()
    return int(result.rowcount or 0)
