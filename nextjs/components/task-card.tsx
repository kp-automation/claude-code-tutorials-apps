"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task, User } from "@prisma/client";
import { Calendar, User as UserIcon } from "lucide-react";

interface TaskCardProps {
  task: Task & {
    assignee: Pick<User, "id" | "name" | "email"> | null;
  };
  onClick?: () => void;
}

const priorityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug">{task.title}</CardTitle>
          <span
            className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
              priorityColors[task.priority as keyof typeof priorityColors]
            }`}
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
            <span>{task.assignee?.name || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {task.dueDate
                ? new Date(task.dueDate).toISOString().slice(0, 10)
                : "No due date"}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(task.updatedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
