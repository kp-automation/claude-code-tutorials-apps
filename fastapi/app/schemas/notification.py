from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.notification import NotificationType


class _UserSummary(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class _TaskSummary(BaseModel):
    id: int
    title: str
    project_id: int

    model_config = ConfigDict(from_attributes=True)


class _CommentSummary(BaseModel):
    id: int
    content: str

    model_config = ConfigDict(from_attributes=True)


class NotificationBase(BaseModel):
    type: NotificationType
    read: bool = False


class NotificationCreate(NotificationBase):
    user_id: int
    actor_id: int
    task_id: int | None = None
    comment_id: int | None = None


class Notification(NotificationBase):
    id: int
    created_at: datetime
    actor: _UserSummary
    task: _TaskSummary | None = None
    comment: _CommentSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class UnreadCount(BaseModel):
    count: int


class ReadAllResponse(BaseModel):
    updated: int
