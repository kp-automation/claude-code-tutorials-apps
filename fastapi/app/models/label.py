from sqlalchemy import String, ForeignKey, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# Many-to-many association table
TaskLabel = Table(
    "task_labels",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("label_id", Integer, ForeignKey("labels.id"), primary_key=True),
)


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)  # Hex color code
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="labels")
    tasks: Mapped[list["Task"]] = relationship(
        "Task", secondary="task_labels", back_populates="labels"
    )
