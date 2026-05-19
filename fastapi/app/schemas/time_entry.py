from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TimeEntryBase(BaseModel):
    duration_seconds: int
    description: str | None = None


class TimeEntryCreate(TimeEntryBase):
    pass


class TimeEntryUpdate(BaseModel):
    duration_seconds: int | None = None
    description: str | None = None


class TimeEntry(TimeEntryBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
