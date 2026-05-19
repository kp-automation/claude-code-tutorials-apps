import type { TaskStatus, Priority } from "@/lib/types";

// ---------------------------------------------------------------------------
// Wire-format types (dates are ISO strings after JSON serialization)
// ---------------------------------------------------------------------------

type UserSummary = {
  id: string;
  name: string | null;
  email: string;
};

type ProjectSummary = {
  id: string;
  name: string;
};

type CommentWithAuthor = {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: UserSummary;
};

export type TaskResponse = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: UserSummary | null;
  project: ProjectSummary;
  comments?: CommentWithAuthor[];
};

export type CreateTaskInput = {
  title: string;
  projectId: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  dueDate?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type GetTasksParams = {
  projectId?: string;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body?.error === "string"
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Task API functions
// ---------------------------------------------------------------------------

export function getTasks(params?: GetTasksParams): Promise<TaskResponse[]> {
  const qs = params?.projectId
    ? `?projectId=${encodeURIComponent(params.projectId)}`
    : "";
  return request<TaskResponse[]>(`/api/tasks${qs}`);
}

export function getTask(id: string): Promise<TaskResponse> {
  return request<TaskResponse>(`/api/tasks/${id}`);
}

export function createTask(data: CreateTaskInput): Promise<TaskResponse> {
  return request<TaskResponse>("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateTask(
  id: string,
  data: UpdateTaskInput,
): Promise<TaskResponse> {
  return request<TaskResponse>(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteTask(id: string): Promise<{ success: true }> {
  return request<{ success: true }>(`/api/tasks/${id}`, {
    method: "DELETE",
  });
}
