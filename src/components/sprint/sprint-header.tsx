"use client";

import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

interface SprintHeaderProps {
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  totalTasks: number;
  completedTasks: number;
}

const statusBadgeColors: Record<SprintStatus, string> = {
  PLANNING: "bg-slate-100 text-slate-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export function SprintHeader({
  name,
  startDate,
  endDate,
  status,
  totalTasks,
  completedTasks,
}: SprintHeaderProps) {
  const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{name}</h2>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            statusBadgeColors[status]
          )}
        >
          {status}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarRange className="h-4 w-4" />
        <span>
          {startDate} &mdash; {endDate}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completedTasks} / {totalTasks} tasks completed
          </span>
          <span>{progressPct}%</span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-secondary overflow-hidden"
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
    </div>
  );
}
