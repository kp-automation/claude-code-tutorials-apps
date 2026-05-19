"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDependencySelector } from "@/components/task-dependency-selector";
import { type DependencyGraph } from "@/lib/utils/task-dependencies";

export interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  dependencyIds: string[];
  dueDate?: string | null;
}

interface AvailableTask {
  id: string;
  title: string;
}

interface TaskFormProps {
  /** ID of the task being edited. Omit when creating a new task. */
  taskId?: string;
  projectId: string;
  /** Other tasks in the project, shown as dependency candidates. */
  availableTasks: AvailableTask[];
  /** Current project-wide dependency graph for cycle detection. */
  allDeps: DependencyGraph;
  initialValues?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  error?: string | null;
}

export function TaskForm({
  taskId,
  availableTasks,
  allDeps,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Create Task",
  error,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? ""
  );
  const [priority, setPriority] = useState(
    initialValues?.priority ?? "MEDIUM"
  );
  const [dependencyIds, setDependencyIds] = useState<string[]>(
    initialValues?.dependencyIds ?? []
  );
  const [dueDateValue, setDueDateValue] = useState(
    initialValues?.dueDate
      ? String(initialValues.dueDate).slice(0, 10)
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const rawInput = dueDateValue;
    // Store as noon UTC: avoids the midnight boundary for UTC-11 to UTC+11 timezones.
    // Slicing the ISO string at display time makes the time component irrelevant anyway.
    const isoString = dueDateValue ? dueDateValue + "T12:00:00.000Z" : null;
    // [DATE-DEBUG] Point 1: Form submission — runs in browser
    console.log("[date-debug] 1. Form submission", {
      rawInput,                        // "2026-01-15" — plain string from <input type="date">
      rawInputType: typeof rawInput,   // always "string"
      isoString,                       // "2026-01-15T12:00:00.000Z" — noon UTC
      parsedDate: isoString ? new Date(isoString) : null,
      parsedTimestamp: isoString ? new Date(isoString).getTime() : null,
      browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserUTCOffset: new Date().getTimezoneOffset(), // minutes behind UTC; positive = west of UTC
    });

    try {
      await onSubmit({
        title,
        description,
        priority,
        dependencyIds,
        dueDate: isoString,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Task Title</Label>
        <Input
          id="task-title"
          placeholder="Task title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          placeholder="Task description…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-due-date">Due Date</Label>
        <Input
          id="task-due-date"
          type="date"
          value={dueDateValue}
          onChange={(e) => setDueDateValue(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-priority">Priority</Label>
        <Select
          value={priority}
          onValueChange={setPriority}
          disabled={isSubmitting}
        >
          <SelectTrigger id="task-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {availableTasks.length > 0 && (
        <div className="space-y-2">
          <Label>Dependencies</Label>
          <p className="text-xs text-muted-foreground">
            This task will not start until all selected dependencies are done.
          </p>
          <TaskDependencySelector
            taskId={taskId}
            availableTasks={availableTasks}
            selectedIds={dependencyIds}
            allDeps={allDeps}
            onChange={setDependencyIds}
            disabled={isSubmitting}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" data-testid="form-error">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className={onCancel ? "" : "w-full"}
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
