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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{task.title}</CardTitle>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              priorityColors[task.priority]
            }`}
          >
            {task.priority}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
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
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
