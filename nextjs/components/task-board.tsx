"use client";

import { Suspense } from "react";
import { useState } from "react";
import { Task, User } from "@prisma/client";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { TaskStatus } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";

interface TaskBoardProps {
  tasks: (Task & {
    assignee: Pick<User, "id" | "name" | "email"> | null;
  })[];
  projectId: string;
}

export function TaskBoard({ tasks, projectId }: TaskBoardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") as TaskStatus | null;
  const qParam = searchParams.get("q") ?? "";

  function updateFilters(status: TaskStatus | "ALL", q: string) {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?");
  }

  const isFiltering = !!(statusParam || qParam);

  const filtered = tasks.filter((t) => {
    const matchesStatus = !statusParam || t.status === statusParam;
    const matchesQuery = !qParam || t.title.toLowerCase().includes(qParam.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const todoTasks = filtered.filter((t) => t.status === "TODO");
  const inProgressTasks = filtered.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = filtered.filter((t) => t.status === "DONE");

  const handleTaskClick = (taskId: string) => {
    router.push(`/projects/${projectId}/tasks/${taskId}`);
  };

  return (
    <>
      <Suspense fallback={null}>
        <TaskFilters
          statusFilter={statusParam ?? "ALL"}
          searchQuery={qParam}
          onStatusChange={(s) => updateFilters(s, qParam)}
          onSearchChange={(q) => updateFilters(statusParam ?? "ALL", q)}
          onClear={() => updateFilters("ALL", "")}
        />
      </Suspense>

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
                {isFiltering ? "No tasks match your filters" : "No tasks yet"}
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
                {isFiltering ? "No tasks match your filters" : "No tasks in progress"}
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
                {isFiltering ? "No tasks match your filters" : "No completed tasks"}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
