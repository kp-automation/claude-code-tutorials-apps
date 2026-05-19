from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.sprint import SprintStatus


class SprintBase(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    status: SprintStatus = SprintStatus.PLANNING


class SprintCreate(SprintBase):
    project_id: int


class SprintUpdate(BaseModel):
    name: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: SprintStatus | None = None


class Sprint(SprintBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
