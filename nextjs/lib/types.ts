import { User, Project, Task, Comment, Label, TimeEntry, Notification } from "@prisma/client";

export type {
  User,
  Project,
  Task,
  Comment,
  Label,
  TimeEntry,
  Notification,
};

export type TaskWithDetails = Task & {
  assignee: User | null;
  project: Project;
  comments: Comment[];
};

export type ProjectWithTasks = Project & {
  tasks: Task[];
  owner: User;
};

// For use in route handler files only — not in components (components import from @prisma/client directly)
export type TimeEntryWithUser = TimeEntry & {
  user: Pick<User, "id" | "name" | "email">;
};

export type NotificationType = "TASK_ASSIGNED" | "TASK_COMPLETED" | "MENTION";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Role = "ADMIN" | "MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export type NotificationWithRelations = Notification & {
  actor: Pick<User, "id" | "name" | "email">;
  task: Pick<Task, "id" | "title" | "projectId"> | null;
  comment: Pick<Comment, "id" | "content"> | null;
};
