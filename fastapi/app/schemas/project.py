from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    status: ProjectStatus = ProjectStatus.ACTIVE


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None


class Project(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
