"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SprintTask, SprintTaskCard } from "@/components/sprint/sprint-task-card";
import { cn } from "@/lib/utils";

interface SprintBoardProps {
  tasks: SprintTask[];
  projectId: string;
  onTaskReorder?: (taskId: string, newStatus: string) => void;
}

const COLUMNS: { key: string; label: string; emptyLabel: string }[] = [
  { key: "TODO", label: "To Do", emptyLabel: "No tasks yet" },
  { key: "IN_PROGRESS", label: "In Progress", emptyLabel: "No tasks in progress" },
  { key: "DONE", label: "Done", emptyLabel: "No completed tasks" },
];

export function SprintBoard({ tasks, projectId, onTaskReorder }: SprintBoardProps) {
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleTaskClick = (taskId: string) => {
    router.push(`/projects/${projectId}/tasks/${taskId}`);
  };

  const handleDragStart = (taskId: string) => {
    setDraggingId(taskId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    if (draggingId) {
      onTaskReorder?.(draggingId, newStatus);
    }
    setDraggingId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {COLUMNS.map(({ key, label, emptyLabel }) => {
        const columnTasks = tasks.filter((t) => t.status === key);
        return (
          <div
            key={key}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, key)}
          >
            <div className="mb-4">
              <h3 className="font-semibold text-lg">{label}</h3>
              <p className="text-sm text-muted-foreground">{columnTasks.length} tasks</p>
            </div>
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(draggingId === task.id && "opacity-50")}
                >
                  <SprintTaskCard
                    task={task}
                    onClick={() => handleTaskClick(task.id)}
                  />
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {emptyLabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
