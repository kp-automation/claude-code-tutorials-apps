/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/tasks/route";
import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/tasks/[id]/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("@/lib/notifications", () => ({
  notifyTaskAssigned: jest.fn(),
  notifyTaskCompleted: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { notifyTaskAssigned, notifyTaskCompleted } from "@/lib/notifications";

const mockSession = { user: { id: "user-1", email: "test@example.com" } };

const mockTask = {
  id: "task-1",
  title: "Fix bug",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  projectId: "proj-1",
  assigneeId: null,
  dueDate: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignee: null,
  project: { id: "proj-1", name: "Alpha" },
  comments: [],
};

const params = { params: Promise.resolve({ id: "task-1" }) };

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue(mockSession);
});

// ─── GET /api/tasks ──────────────────────────────────────────────────────────

describe("GET /api/tasks", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/tasks"));
    expect(res.status).toBe(401);
  });

  it("returns task list for authenticated user", async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
    const res = await GET(new Request("http://localhost/api/tasks"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("task-1");
  });
});

// ─── POST /api/tasks ─────────────────────────────────────────────────────────

describe("POST /api/tasks", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "New task", projectId: "proj-1" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ projectId: "proj-1" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when projectId is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "New task" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates a task and returns 201", async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);
    const res = await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Fix bug", projectId: "proj-1" }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("task-1");
  });

  it("fires notifyTaskAssigned when assigneeId is set", async () => {
    const taskWithAssignee = { ...mockTask, assigneeId: "user-2" };
    (prisma.task.create as jest.Mock).mockResolvedValue(taskWithAssignee);
    await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "Fix bug",
          projectId: "proj-1",
          assigneeId: "user-2",
        }),
      })
    );
    expect(notifyTaskAssigned).toHaveBeenCalledWith({
      actorId: "user-1",
      taskId: "task-1",
      assigneeId: "user-2",
    });
  });

  it("fires notifyTaskCompleted when created with status DONE", async () => {
    const doneTask = { ...mockTask, status: "DONE" };
    (prisma.task.create as jest.Mock).mockResolvedValue(doneTask);
    await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: "Fix bug",
          projectId: "proj-1",
          status: "DONE",
        }),
      })
    );
    expect(notifyTaskCompleted).toHaveBeenCalledWith({
      actorId: "user-1",
      taskId: "task-1",
    });
  });

  it("does not fire notifications when no assignee and status is not DONE", async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue(mockTask);
    await POST(
      new Request("http://localhost/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Fix bug", projectId: "proj-1" }),
      })
    );
    expect(notifyTaskAssigned).not.toHaveBeenCalled();
    expect(notifyTaskCompleted).not.toHaveBeenCalled();
  });
});

// ─── GET /api/tasks/:id ──────────────────────────────────────────────────────

describe("GET /api/tasks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET_ONE(new Request("http://localhost/api/tasks/task-1"), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when task does not exist", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await GET_ONE(new Request("http://localhost/api/tasks/task-1"), params);
    expect(res.status).toBe(404);
  });

  it("returns the task when found", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
    const res = await GET_ONE(new Request("http://localhost/api/tasks/task-1"), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("task-1");
  });
});

// ─── PATCH /api/tasks/:id ────────────────────────────────────────────────────

describe("PATCH /api/tasks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      params
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when task does not exist", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      params
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid body", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
    const res = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID_STATUS" }),
      }),
      params
    );
    expect(res.status).toBe(400);
  });

  it("updates the task and returns it", async () => {
    const updated = { ...mockTask, title: "Updated" };
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (prisma.task.update as jest.Mock).mockResolvedValue(updated);
    const res = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      params
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Updated");
  });

  it("fires notifyTaskAssigned when assigneeId changes to a new user", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask); // assigneeId: null
    const updated = { ...mockTask, assigneeId: "user-2" };
    (prisma.task.update as jest.Mock).mockResolvedValue(updated);
    await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ assigneeId: "user-2" }),
      }),
      params
    );
    expect(notifyTaskAssigned).toHaveBeenCalledWith({
      actorId: "user-1",
      taskId: "task-1",
      assigneeId: "user-2",
    });
  });

  it("does not fire notifyTaskAssigned when assigneeId is unchanged", async () => {
    const taskWithAssignee = { ...mockTask, assigneeId: "user-2" };
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(taskWithAssignee);
    (prisma.task.update as jest.Mock).mockResolvedValue(taskWithAssignee);
    await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ assigneeId: "user-2" }),
      }),
      params
    );
    expect(notifyTaskAssigned).not.toHaveBeenCalled();
  });

  it("fires notifyTaskCompleted when status transitions to DONE", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask); // status: "TODO"
    const updated = { ...mockTask, status: "DONE" };
    (prisma.task.update as jest.Mock).mockResolvedValue(updated);
    await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      }),
      params
    );
    expect(notifyTaskCompleted).toHaveBeenCalledWith({
      actorId: "user-1",
      taskId: "task-1",
    });
  });

  it("does not fire notifyTaskCompleted when status was already DONE", async () => {
    const alreadyDone = { ...mockTask, status: "DONE" };
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(alreadyDone);
    (prisma.task.update as jest.Mock).mockResolvedValue(alreadyDone);
    await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      }),
      params
    );
    expect(notifyTaskCompleted).not.toHaveBeenCalled();
  });
});

// ─── DELETE /api/tasks/:id ───────────────────────────────────────────────────

describe("DELETE /api/tasks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://localhost/api/tasks/task-1", { method: "DELETE" }),
      params
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when task does not exist", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://localhost/api/tasks/task-1", { method: "DELETE" }),
      params
    );
    expect(res.status).toBe(404);
  });

  it("deletes the task and returns { success: true }", async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (prisma.task.delete as jest.Mock).mockResolvedValue(mockTask);
    const res = await DELETE(
      new Request("http://localhost/api/tasks/task-1", { method: "DELETE" }),
      params
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });
});
