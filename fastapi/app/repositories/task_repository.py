from typing import Optional
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskUpdate
from app.utils.exceptions import ForbiddenException, NotFoundException


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        user_id: int,
        project_id: int | None = None,
        status_filter: str | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> list[Task]:
        query = self.db.query(Task).join(Project).filter(Project.owner_id == user_id)
        if project_id is not None:
            query = query.filter(Task.project_id == project_id)
        if status_filter is not None:
            query = query.filter(Task.status == status_filter.upper())
        skip = (page - 1) * per_page
        return query.offset(skip).limit(per_page).all()

    def get_by_id(self, task_id: int, user_id: int) -> Optional[Task]:
        return (
            self.db.query(Task)
            .join(Project)
            .filter(Task.id == task_id, Project.owner_id == user_id)
            .first()
        )

    def create(self, task_data: TaskCreate, user_id: int) -> Task:
        project = self.db.query(Project).filter(Project.id == task_data.project_id).first()
        if not project or project.owner_id != user_id:
            raise ForbiddenException("Access denied to this project")

        task = Task(**task_data.model_dump())
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update(self, task_id: int, task_data: TaskUpdate, user_id: int) -> Task:
        task = self.get_by_id(task_id, user_id)
        if not task:
            raise NotFoundException("Task not found")

        for key, value in task_data.model_dump(exclude_unset=True).items():
            setattr(task, key, value)
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete(self, task_id: int, user_id: int) -> bool:
        task = self.get_by_id(task_id, user_id)
        if not task:
            return False
        self.db.delete(task)
        self.db.commit()
        return True
