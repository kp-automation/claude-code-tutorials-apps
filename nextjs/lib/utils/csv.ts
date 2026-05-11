function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface TaskForExport {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { name: string; email: string } | null;
  taskLabels: { label: { name: string } }[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

const CSV_HEADERS = [
  "id",
  "title",
  "description",
  "status",
  "priority",
  "assignee",
  "labels",
  "created_at",
  "updated_at",
];

export function tasksToCSV(tasks: TaskForExport[]): string {
  const rows = tasks.map((task) =>
    [
      task.id,
      task.title,
      task.description ?? "",
      task.status,
      task.priority,
      task.assignee ? task.assignee.name || task.assignee.email : "",
      task.taskLabels.map((tl) => tl.label.name).join(";"),
      new Date(task.createdAt).toISOString(),
      new Date(task.updatedAt).toISOString(),
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}
