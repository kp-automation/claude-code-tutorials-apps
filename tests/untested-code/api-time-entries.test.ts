/**
 * @jest-environment node
 *
 * Gap tests for src/api/time-entries/route.ts — 500 catch blocks and the
 * negative-durationSeconds Zod branch that are not covered by the baseline suite.
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
const ENTRY_ID = "entry-1";

const mockSession = {
  user: { id: USER_ID, email: "test@example.com", name: "Test User" },
};

const taskOwnedByUser = {
  id: TASK_ID,
  project: { id: "project-1", ownerId: USER_ID },
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
  (getServerSession as jest.Mock).mockResolvedValue(mockSession);
});

// ── PATCH — negative durationSeconds (Zod positive() branch) ──────────────

describe("PATCH /api/time-entries/[id] — Zod validation", () => {
  it("returns 400 when durationSeconds is negative", async () => {
    const res = await PATCH(makeRequest({ durationSeconds: -1 }), entryParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    // Zod surfaces an array of issues under the "error" key
    expect(body).toHaveProperty("error");
    expect(Array.isArray(body.error)).toBe(true);
  });
});

// ── GET — 500 catch blocks ─────────────────────────────────────────────────

describe("GET /api/tasks/[taskId]/time-entries — 500 paths", () => {
  it("returns 500 when task.findUnique throws unexpectedly", async () => {
    mockTask.findUnique.mockRejectedValue(new Error("DB connection lost"));

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });

  it("returns 500 when timeEntry.findMany throws after ownership check passes", async () => {
    mockTask.findUnique.mockResolvedValue(taskOwnedByUser);
    mockTimeEntry.findMany.mockRejectedValue(new Error("Query failed"));

    const res = await GET(makeRequest(), taskParams());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });
});

// ── POST — 500 catch block ─────────────────────────────────────────────────

describe("POST /api/tasks/[taskId]/time-entries — 500 path", () => {
  it("returns 500 when timeEntry.create throws after ownership check passes", async () => {
    mockTask.findUnique.mockResolvedValue(taskOwnedByUser);
    mockTimeEntry.create.mockRejectedValue(new Error("Write failed"));

    const res = await POST(
      makeRequest({ durationSeconds: 3600 }),
      taskParams()
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });
});

// ── PATCH — 500 catch block ────────────────────────────────────────────────

describe("PATCH /api/time-entries/[id] — 500 path", () => {
  it("returns 500 when timeEntry.update throws after ownership check passes", async () => {
    mockTimeEntry.findUnique.mockResolvedValue(sampleEntry);
    mockTimeEntry.update.mockRejectedValue(new Error("Write failed"));

    const res = await PATCH(
      makeRequest({ durationSeconds: 7200 }),
      entryParams()
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });
});

// ── DELETE — 500 catch block ───────────────────────────────────────────────

describe("DELETE /api/time-entries/[id] — 500 path", () => {
  it("returns 500 when timeEntry.delete throws after ownership check passes", async () => {
    mockTimeEntry.findUnique.mockResolvedValue(sampleEntry);
    mockTimeEntry.delete.mockRejectedValue(new Error("Delete failed"));

    const res = await DELETE(makeRequest(), entryParams());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });
});
