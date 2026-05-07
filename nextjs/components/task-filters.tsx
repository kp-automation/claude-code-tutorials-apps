"use client";

import { TaskStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
  statusFilter: TaskStatus | "ALL";
  searchQuery: string;
  onStatusChange: (value: TaskStatus | "ALL") => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export function TaskFilters({
  statusFilter,
  searchQuery,
  onStatusChange,
  onSearchChange,
  onClear,
}: TaskFiltersProps) {
  const isFiltering = statusFilter !== "ALL" || searchQuery !== "";

  return (
    <div className="flex items-center gap-3 mb-6">
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as TaskStatus | "ALL")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="TODO">To Do</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="search"
        placeholder="Search tasks…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />

      {isFiltering && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
