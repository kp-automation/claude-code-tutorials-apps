"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DependencyGraph,
  detectCircularDependency,
} from "@/lib/utils/task-dependencies";

interface AvailableTask {
  id: string;
  title: string;
}

interface TaskDependencySelectorProps {
  /** ID of the task being edited. `undefined` for a new task — disables cycle detection. */
  taskId: string | undefined;
  /** All tasks in the project that could be candidates. */
  availableTasks: AvailableTask[];
  /** IDs of tasks this task currently depends on. */
  selectedIds: string[];
  /** The project-wide dependency graph, used for cycle detection. */
  allDeps: DependencyGraph;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TaskDependencySelector({
  taskId,
  availableTasks,
  selectedIds,
  allDeps,
  onChange,
  disabled = false,
}: TaskDependencySelectorProps) {
  // Remounting the Select resets it to the placeholder after each selection.
  const [selectKey, setSelectKey] = useState(0);

  // Merge the in-progress selections into the graph so cycle detection accounts
  // for dependencies the user has already chosen but not yet persisted.
  const effectiveDeps: DependencyGraph = taskId
    ? { ...allDeps, [taskId]: selectedIds }
    : allDeps;

  const isCircular = (candidateId: string): boolean =>
    taskId !== undefined &&
    detectCircularDependency(taskId, candidateId, effectiveDeps);

  // Exclude the task itself and tasks that are already selected.
  const candidates = availableTasks.filter(
    (t) => t.id !== taskId && !selectedIds.includes(t.id)
  );

  const blockedCount = candidates.filter((t) => isCircular(t.id)).length;

  const handleAdd = (candidateId: string) => {
    if (!isCircular(candidateId)) {
      onChange([...selectedIds, candidateId]);
      setSelectKey((k) => k + 1);
    }
  };

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter((s) => s !== id));
  };

  // Resolve IDs to task objects, dropping any stale IDs (deleted tasks).
  const selectedTasks = selectedIds
    .map((id) => availableTasks.find((t) => t.id === id))
    .filter((t): t is AvailableTask => t !== undefined);

  return (
    <div className="space-y-2">
      {selectedTasks.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="dependency-chips">
          {selectedTasks.map((t) => (
            <span
              key={t.id}
              data-testid={`chip-${t.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {t.title}
              <button
                type="button"
                aria-label={`Remove dependency ${t.title}`}
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => handleRemove(t.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Select
        key={selectKey}
        onValueChange={handleAdd}
        disabled={disabled || candidates.length === 0}
      >
        <SelectTrigger data-testid="dependency-select-trigger">
          <SelectValue
            placeholder={
              candidates.length === 0
                ? "No tasks available"
                : "Add a dependency…"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((t) => {
            const blocked = isCircular(t.id);
            return (
              <SelectItem
                key={t.id}
                value={t.id}
                disabled={blocked}
                data-testid={`candidate-${t.id}`}
              >
                {t.title}
                {blocked && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (circular)
                  </span>
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {blockedCount > 0 && (
        <p
          className="flex items-center gap-1 text-xs text-amber-600"
          data-testid="circular-warning"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {blockedCount === 1
            ? "1 task is disabled because adding it would create a circular dependency."
            : `${blockedCount} tasks are disabled because adding them would create circular dependencies.`}
        </p>
      )}
    </div>
  );
}
