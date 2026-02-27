import { User, Project, Task, Comment, Label, Role, ProjectStatus, TaskStatus, Priority } from "@prisma/client";

export type {
  User,
  Project,
  Task,
  Comment,
  Label,
  Role,
  ProjectStatus,
  TaskStatus,
  Priority,
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
