"use client";

import { useState } from "react";
import { Task, User } from "@prisma/client";
import { TaskCard } from "./task-card";
import { useRouter } from "next/navigation";

interface TaskBoardProps {
  tasks: (Task & {
    assignee: Pick<User, "id" | "name" | "email"> | null;
  })[];
  projectId: string;
}

export function TaskBoard({ tasks, projectId }: TaskBoardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  const handleTaskClick = (taskId: string) => {
    router.push(`/projects/${projectId}/tasks/${taskId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">To Do</h3>
          <p className="text-sm text-muted-foreground">{todoTasks.length} tasks</p>
        </div>
        <div className="space-y-3">
          {todoTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
            />
          ))}
          {todoTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks yet
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">In Progress</h3>
          <p className="text-sm text-muted-foreground">
            {inProgressTasks.length} tasks
          </p>
        </div>
        <div className="space-y-3">
          {inProgressTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
            />
          ))}
          {inProgressTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks in progress
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Done</h3>
          <p className="text-sm text-muted-foreground">{doneTasks.length} tasks</p>
        </div>
        <div className="space-y-3">
          {doneTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
            />
          ))}
          {doneTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No completed tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
