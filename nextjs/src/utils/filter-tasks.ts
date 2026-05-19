export type FilterOptions = {
  status?: string | string[];
  assigneeId?: string | null;
  dueAfter?: Date;
  dueBefore?: Date;
};

type FilterableTask = {
  status: string;
  assigneeId: string | null;
  dueDate: Date | null;
  [key: string]: unknown;
};

export function filterTasks<T extends FilterableTask>(
  tasks: T[],
  filters: FilterOptions
): T[] {
  return tasks.filter((task) => {
    if (filters.status !== undefined) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      if (statuses.length > 0 && !statuses.includes(task.status)) {
        return false;
      }
    }

    if (filters.assigneeId !== undefined) {
      if (task.assigneeId !== filters.assigneeId) {
        return false;
      }
    }

    if (filters.dueAfter !== undefined) {
      if (task.dueDate === null || task.dueDate < filters.dueAfter) {
        return false;
      }
    }

    if (filters.dueBefore !== undefined) {
      if (task.dueDate === null || task.dueDate > filters.dueBefore) {
        return false;
      }
    }

    return true;
  });
}
