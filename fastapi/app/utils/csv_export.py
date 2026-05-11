import csv
import io
from app.models.task import Task


def tasks_to_csv(tasks: list[Task]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["id", "title", "description", "status", "priority", "assignee", "labels", "created_at", "updated_at"]
    )
    for task in tasks:
        assignee = ""
        if task.assignee:
            assignee = task.assignee.name or task.assignee.email
        labels = ";".join(label.name for label in task.labels)
        writer.writerow(
            [
                task.id,
                task.title,
                task.description or "",
                task.status.value,
                task.priority.value,
                assignee,
                labels,
                task.created_at.isoformat(),
                task.updated_at.isoformat(),
            ]
        )
    return output.getvalue()
