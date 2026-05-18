/**
 * @jest-environment node
 */

// jest.mock calls are hoisted — factories must be self-contained (no outer vars).
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/db", () => ({
  prisma: {
    task: { findUnique: jest.fn() },
    timeEntry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { GET, POST, PATCH, DELETE } from "../../src/api/time-entries/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

// Typed references to the auto-mocked fns
const mockTask = prisma.task as { findUnique: jest.Mock };
const mockTimeEntry = prisma.timeEntry as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const TASK_ID = "task-1";
const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const ENTRY_ID = "entry-1";

const mockSession = {
  user: { id: USER_ID, email: "test@example.com", name: "Test User" },
};

const taskOwnedByUser = {
  id: TASK_ID,
  project: { id: "project-1", ownerId: USER_ID },
};

const taskOwnedByOther = {
  id: TASK_ID,
  project: { id: "project-1", ownerId: OTHER_USER_ID },
};

const sampleEntry = {
  id: ENTRY_ID,
  durationSeconds: 3600,
  description: null,
  taskId: TASK_ID,
  userId: USER_ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: { id: USER_ID, name: "Test User", email: "test@example.com" },
};

function makeRequest(body?: unknown): Request {
  return { json: () => Promise.resolve(body) } as unknown as Request;
}

function taskParams() {
  return { params: Promise.resolve({ taskId: TASK_ID }) };
}

function entryParams() {
  return { params: Promise.resolve({ id: ENTRY_ID }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/tasks/[taskId]/time-entries ───────────────────────────────────

describe("GET /api/tasks/[taskId]/time-entries", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Unauthorized" });
  });

  it("returns 404 when task does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Task not found" });
  });

  it("returns 403 when caller does not own the project", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(taskOwnedByOther);

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns 200 with the entries list on success", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(taskOwnedByUser);
    mockTimeEntry.findMany.mockResolvedValue([sampleEntry]);

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(ENTRY_ID);
  });

  it("returns 200 with empty array when task has no entries", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(taskOwnedByUser);
    mockTimeEntry.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

// ── POST /api/tasks/[taskId]/time-entries ──────────────────────────────────

describe("POST /api/tasks/[taskId]/time-entries", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ durationSeconds: 3600 }), taskParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when task does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ durationSeconds: 3600 }), taskParams());
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller does not own the project", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(taskOwnedByOther);

    const res = await POST(makeRequest({ durationSeconds: 3600 }), taskParams());
    expect(res.status).toBe(403);
  });

  it("returns 400 when durationSeconds is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const res = await POST(makeRequest({}), taskParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when durationSeconds is zero", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ durationSeconds: 0 }), taskParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when durationSeconds is negative", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ durationSeconds: -1 }), taskParams());
    expect(res.status).toBe(400);
  });

  it("returns 201 with the created entry on success", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(taskOwnedByUser);
    mockTimeEntry.create.mockResolvedValue(sampleEntry);

    const res = await POST(
      makeRequest({ durationSeconds: 3600, description: "Bug fix" }),
      taskParams()
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(ENTRY_ID);
  });

  it("passes description to prisma.create when provided", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTask.findUnique.mockResolvedValue(taskOwnedByUser);
    mockTimeEntry.create.mockResolvedValue({ ...sampleEntry, description: "Design review" });

    await POST(
      makeRequest({ durationSeconds: 1800, description: "Design review" }),
      taskParams()
    );

    expect(mockTimeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Design review",
          durationSeconds: 1800,
        }),
      })
    );
  });
});

// ── PATCH /api/time-entries/[id] ───────────────────────────────────────────

describe("PATCH /api/time-entries/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ durationSeconds: 7200 }), entryParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when entry does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ durationSeconds: 7200 }), entryParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Time entry not found" });
  });

  it("returns 403 when caller does not own the entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue({ ...sampleEntry, userId: OTHER_USER_ID });

    const res = await PATCH(makeRequest({ durationSeconds: 7200 }), entryParams());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns 400 when durationSeconds is zero", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);

    const res = await PATCH(makeRequest({ durationSeconds: 0 }), entryParams());
    expect(res.status).toBe(400);
  });

  it("returns 200 with the updated entry on success", async () => {
    const updated = { ...sampleEntry, durationSeconds: 7200 };
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue(sampleEntry);
    mockTimeEntry.update.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ durationSeconds: 7200 }), entryParams());
    expect(res.status).toBe(200);
    expect((await res.json()).durationSeconds).toBe(7200);
  });

  it("allows partial update with only description", async () => {
    const updated = { ...sampleEntry, description: "Updated desc" };
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue(sampleEntry);
    mockTimeEntry.update.mockResolvedValue(updated);

    const res = await PATCH(makeRequest({ description: "Updated desc" }), entryParams());
    expect(res.status).toBe(200);
  });
});

// ── DELETE /api/time-entries/[id] ──────────────────────────────────────────

describe("DELETE /api/time-entries/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await DELETE(makeRequest(), entryParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when entry does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue(null);

    const res = await DELETE(makeRequest(), entryParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Time entry not found" });
  });

  it("returns 403 when caller does not own the entry", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue({ ...sampleEntry, userId: OTHER_USER_ID });

    const res = await DELETE(makeRequest(), entryParams());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns { success: true } and calls prisma.delete on success", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    mockTimeEntry.findUnique.mockResolvedValue(sampleEntry);
    mockTimeEntry.delete.mockResolvedValue(sampleEntry);

    const res = await DELETE(makeRequest(), entryParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockTimeEntry.delete).toHaveBeenCalledWith({ where: { id: ENTRY_ID } });
  });
});
