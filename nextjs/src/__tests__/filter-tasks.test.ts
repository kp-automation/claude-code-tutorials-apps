import { filterTasks } from "@/src/utils/filter-tasks";

// Fixed dates — avoids test drift when re-run in the future
const JAN_01 = new Date("2026-01-01");
const JAN_10 = new Date("2026-01-10");
const JAN_20 = new Date("2026-01-20");
const JAN_25 = new Date("2026-01-25");
const JAN_31 = new Date("2026-01-31");
const FEB_05 = new Date("2026-02-05");

const tasks = [
  { id: "task-1", title: "Write tests",  status: "TODO",        assigneeId: "user-1", dueDate: JAN_10 },
  { id: "task-2", title: "Review PR",    status: "IN_PROGRESS", assigneeId: "user-2", dueDate: JAN_20 },
  { id: "task-3", title: "Deploy",       status: "DONE",        assigneeId: "user-1", dueDate: FEB_05 },
  { id: "task-4", title: "Write docs",   status: "TODO",        assigneeId: null,     dueDate: JAN_25 },
  { id: "task-5", title: "Code review",  status: "IN_PROGRESS", assigneeId: null,     dueDate: null   },
];

describe("filterTasks", () => {
  describe("Status filtering", () => {
    it("filters by single status", () => {
      const result = filterTasks(tasks, { status: "TODO" });
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.status === "TODO")).toBe(true);
      expect(result.map((t) => t.id)).toEqual(["task-1", "task-4"]);
    });

    it("filters by multiple statuses", () => {
      const result = filterTasks(tasks, { status: ["TODO", "IN_PROGRESS"] });
      expect(result).toHaveLength(4);
      expect(result.every((t) => t.status !== "DONE")).toBe(true);
      expect(result.map((t) => t.id)).toEqual(["task-1", "task-2", "task-4", "task-5"]);
    });

    it("returns all tasks when status filter is empty", () => {
      const result = filterTasks(tasks, { status: [] });
      expect(result).toHaveLength(tasks.length);
    });
  });

  describe("Assignee filtering", () => {
    it("filters by exact assignee match", () => {
      const result = filterTasks(tasks, { assigneeId: "user-1" });
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.assigneeId === "user-1")).toBe(true);
      expect(result.map((t) => t.id)).toEqual(["task-1", "task-3"]);
    });

    it("handles null assignee gracefully", () => {
      const result = filterTasks(tasks, { assigneeId: null });
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.assigneeId === null)).toBe(true);
      expect(result.map((t) => t.id)).toEqual(["task-4", "task-5"]);
    });
  });

  describe("Date filtering", () => {
    it("filters tasks due within range", () => {
      const result = filterTasks(tasks, { dueAfter: JAN_01, dueBefore: JAN_31 });
      // task-1 (Jan 10), task-2 (Jan 20), task-4 (Jan 25) — task-3 is Feb, task-5 has no dueDate
      expect(result).toHaveLength(3);
      expect(result.map((t) => t.id)).toEqual(["task-1", "task-2", "task-4"]);
    });

    it("handles open-ended date ranges", () => {
      const result = filterTasks(tasks, { dueAfter: JAN_20 });
      // task-2 (Jan 20 — boundary), task-3 (Feb 05), task-4 (Jan 25) — task-5 (null dueDate excluded)
      expect(result.every((t) => t.dueDate !== null)).toBe(true);
      expect(result.map((t) => t.id)).toContain("task-3");
      expect(result.map((t) => t.id)).toContain("task-4");
      expect(result.map((t) => t.id)).not.toContain("task-1"); // Jan 10 is before cutoff
      expect(result.map((t) => t.id)).not.toContain("task-5"); // null dueDate
    });
  });

  describe("Combined filters", () => {
    it("applies multiple filters with AND logic", () => {
      const result = filterTasks(tasks, { status: "TODO", assigneeId: "user-1" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("task-1");
    });

    it("returns empty array when no tasks match", () => {
      const result = filterTasks(tasks, { status: "DONE", assigneeId: "user-2" });
      expect(result).toEqual([]);
    });
  });
});
