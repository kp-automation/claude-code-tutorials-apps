from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TimeEntryBase(BaseModel):
    duration_seconds: int = Field(gt=0)
    description: str | None = None


class TimeEntryCreate(TimeEntryBase):
    pass  # task_id comes from path param, user_id from current_user


class TimeEntryUpdate(BaseModel):
    duration_seconds: int | None = Field(default=None, gt=0)
    description: str | None = None


class TimeEntry(TimeEntryBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimeReport(BaseModel):
    userId: int
    userName: str | None = None
    userEmail: str | None = None
    totalSeconds: int
    entryCount: int
