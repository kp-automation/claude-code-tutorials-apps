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
  sortOrder: "priority" | "none";
  onStatusChange: (value: TaskStatus | "ALL") => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: "priority" | "none") => void;
  onClear: () => void;
}

export function TaskFilters({
  statusFilter,
  searchQuery,
  sortOrder,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onClear,
}: TaskFiltersProps) {
  const isFiltering = statusFilter !== "ALL" || searchQuery !== "" || sortOrder !== "none";

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

      <Select
        value={sortOrder}
        onValueChange={(v) => onSortChange(v as "priority" | "none")}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sort: Default</SelectItem>
          <SelectItem value="priority">Sort: Priority</SelectItem>
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
