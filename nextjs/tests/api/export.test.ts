/**
 * @jest-environment node
 */
import { GET } from "@/app/api/projects/[id]/export/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  prisma: {
    project: { findUnique: jest.fn() },
    task: { findMany: jest.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

const mockSession = { user: { id: "user-1", email: "test@example.com" } };
const mockProject = { id: "proj-1", ownerId: "user-1", name: "Test Project" };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/projects/[id]/export", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the project owner", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...mockProject,
      ownerId: "other-user",
    });
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    expect(res.status).toBe(403);
  });

  it("returns text/csv with content-disposition on success", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment/);
    expect(res.headers.get("content-disposition")).toMatch(/\.csv/);
  });

  it("returns CSV header row even when project has no tasks", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    const text = await res.text();
    expect(text).toBe(
      "id,title,description,status,priority,assignee,labels,created_at,updated_at"
    );
  });

  it("serializes task fields into CSV rows", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: "task-1",
        title: "Fix the bug",
        description: "Repro steps included",
        status: "TODO",
        priority: "HIGH",
        assignee: { name: "Alice", email: "alice@example.com" },
        taskLabels: [{ label: { name: "bug" } }, { label: { name: "urgent" } }],
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      },
    ]);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    const text = await res.text();
    const lines = text.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Fix the bug");
    expect(lines[1]).toContain("HIGH");
    expect(lines[1]).toContain("Alice");
    expect(lines[1]).toContain("bug;urgent");
  });

  it("uses assignee email when name is absent", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: "task-2",
        title: "No-name task",
        description: null,
        status: "DONE",
        priority: "LOW",
        assignee: { name: null, email: "noname@example.com" },
        taskLabels: [],
        createdAt: new Date("2024-03-01T00:00:00.000Z"),
        updatedAt: new Date("2024-03-01T00:00:00.000Z"),
      },
    ]);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    const text = await res.text();
    expect(text).toContain("noname@example.com");
  });

  it("escapes commas and quotes inside cell values", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: "task-3",
        title: 'Task with "quotes" and, commas',
        description: null,
        status: "TODO",
        priority: "MEDIUM",
        assignee: null,
        taskLabels: [],
        createdAt: new Date("2024-04-01T00:00:00.000Z"),
        updatedAt: new Date("2024-04-01T00:00:00.000Z"),
      },
    ]);
    const res = await GET(new Request("http://localhost"), makeParams("proj-1"));
    const text = await res.text();
    expect(text).toContain('"Task with ""quotes"" and, commas"');
  });
});
