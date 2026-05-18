"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { SprintStatus } from "@/components/sprint/sprint-header";

interface SprintCardProps {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: SprintStatus;
    tasks: { status: string }[];
  };
  onClick?: () => void;
}

const statusBadgeColors: Record<SprintStatus, string> = {
  PLANNING: "bg-slate-100 text-slate-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export function SprintCard({ sprint, onClick }: SprintCardProps) {
  const completedTasks = sprint.tasks.filter((t) => t.status === "DONE").length;
  const totalTasks = sprint.tasks.length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">
            {sprint.name}
          </CardTitle>
          <span
            className={cn(
              "shrink-0 text-xs px-2 py-0.5 rounded-full font-medium",
              statusBadgeColors[sprint.status]
            )}
          >
            {sprint.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarRange className="h-4 w-4 shrink-0" />
          <span>
            {sprint.startDate} &mdash; {sprint.endDate}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedTasks} / {totalTasks} tasks
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-secondary overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressPct}% of sprint tasks completed`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progressPct === 100 ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
