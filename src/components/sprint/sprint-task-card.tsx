"use client";

import { Task } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SprintTask = Task & {
  assignee: { id: string; name: string; email: string } | null;
};

interface SprintTaskCardProps {
  task: SprintTask;
  onClick?: () => void;
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

const statusDotColors = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-green-500",
};

export function SprintTaskCard({ task, onClick }: SprintTaskCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "shrink-0 h-2 w-2 rounded-full",
                statusDotColors[task.status as keyof typeof statusDotColors] ?? "bg-slate-400"
              )}
            />
            <CardTitle className="text-sm font-medium leading-snug truncate">
              {task.title}
            </CardTitle>
          </div>
          <span
            className={cn(
              "shrink-0 text-xs px-1.5 py-0.5 rounded-full",
              priorityColors[task.priority as keyof typeof priorityColors]
            )}
          >
            {task.priority}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            {task.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            <span>{task.assignee?.name ?? "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{task.updatedAt ? new Date(task.updatedAt).toISOString().slice(0, 10) : ""}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
