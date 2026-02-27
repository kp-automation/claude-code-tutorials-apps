from pydantic import BaseModel, ConfigDict


class LabelBase(BaseModel):
    name: str
    color: str


class LabelCreate(LabelBase):
    pass


class Label(LabelBase):
    id: int
    project_id: int

    model_config = ConfigDict(from_attributes=True)
