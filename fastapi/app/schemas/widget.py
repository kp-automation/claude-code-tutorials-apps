from datetime import datetime
from pydantic import BaseModel, ConfigDict


class WidgetBase(BaseModel):
    name: str
    # TODO: add fields matching your SQLAlchemy model


class WidgetCreate(WidgetBase):
    pass  # add required FK fields here (e.g. project_id: int)


class WidgetUpdate(BaseModel):
    name: str | None = None
    # TODO: make all fields optional


class Widget(WidgetBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
