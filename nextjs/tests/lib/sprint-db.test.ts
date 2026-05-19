/**
 * Unit tests for @/lib/sprint-db
 *
 * All five exported functions are covered:
 *   getSprintsByProject, getSprintById, createSprint, updateSprint, deleteSprint
 *
 * Prisma is mocked via @/lib/db so no real database is needed.
 *
 * NOTE: task spec listed `src/lib/__tests__/sprint-db.test.ts` but that path is
 * outside allowed write paths and not covered by the nextjs jest config.
 * `nextjs/lib/sprint-db.ts` and `src/lib/sprint-db.ts` are identical; this file
 * targets `nextjs/tests/lib/` and runs under `npm test`.
 */

/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    sprint: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  getSprintsByProject,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
} from "@/lib/sprint-db";

const mockSprint = {
  id: "sprint-1",
  name: "Sprint 1",
  startDate: new Date("2026-06-01"),
  endDate: new Date("2026-06-14"),
  status: "PLANNING",
  projectId: "proj-a",
  createdAt: new Date("2026-05-20"),
  updatedAt: new Date("2026-05-20"),
};

const sprintMock = prisma.sprint as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getSprintsByProject
// ---------------------------------------------------------------------------

describe("getSprintsByProject", () => {
  it("calls findMany with the correct where and orderBy", async () => {
    sprintMock.findMany.mockResolvedValue([mockSprint]);
    await getSprintsByProject("proj-a");
    expect(sprintMock.findMany).toHaveBeenCalledWith({
      where: { projectId: "proj-a" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns the sprints from the db result", async () => {
    sprintMock.findMany.mockResolvedValue([mockSprint]);
    const result = await getSprintsByProject("proj-a");
    expect(result).toEqual([mockSprint]);
  });

  it("returns an empty array when no sprints exist for the project", async () => {
    sprintMock.findMany.mockResolvedValue([]);
    const result = await getSprintsByProject("proj-a");
    expect(result).toEqual([]);
  });

  it("ownership scoping — queries proj-a, does NOT query proj-b", async () => {
    // The db layer filters by projectId. A call for proj-a must use
    // where: { projectId: 'proj-a' } — ensuring proj-b sprints are excluded.
    sprintMock.findMany.mockResolvedValue([]);
    await getSprintsByProject("proj-a");
    const callArgs = sprintMock.findMany.mock.calls[0][0];
    expect(callArgs.where.projectId).toBe("proj-a");
    expect(callArgs.where.projectId).not.toBe("proj-b");
  });

  it("ownership scoping — separate calls for proj-a and proj-b use distinct filters", async () => {
    const sprintA = { ...mockSprint, id: "sprint-a", projectId: "proj-a" };
    const sprintB = { ...mockSprint, id: "sprint-b", projectId: "proj-b" };

    sprintMock.findMany
      .mockResolvedValueOnce([sprintA]) // first call → proj-a
      .mockResolvedValueOnce([sprintB]); // second call → proj-b

    const resultA = await getSprintsByProject("proj-a");
    const resultB = await getSprintsByProject("proj-b");

    // Each result is scoped to its own project
    expect(resultA).toEqual([sprintA]);
    expect(resultB).toEqual([sprintB]);

    // The db was called with the correct projectId each time
    expect(sprintMock.findMany.mock.calls[0][0].where.projectId).toBe("proj-a");
    expect(sprintMock.findMany.mock.calls[1][0].where.projectId).toBe("proj-b");
  });
});

// ---------------------------------------------------------------------------
// getSprintById
// ---------------------------------------------------------------------------

describe("getSprintById", () => {
  it("calls findUnique with the correct id and includes project + tasks", async () => {
    sprintMock.findUnique.mockResolvedValue(mockSprint);
    await getSprintById("sprint-1");
    expect(sprintMock.findUnique).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      include: {
        project: {
          select: { id: true, name: true, ownerId: true },
        },
        tasks: true,
      },
    });
  });

  it("returns the sprint when found", async () => {
    sprintMock.findUnique.mockResolvedValue(mockSprint);
    const result = await getSprintById("sprint-1");
    expect(result).toEqual(mockSprint);
  });

  it("returns null when the sprint does not exist (error path)", async () => {
    sprintMock.findUnique.mockResolvedValue(null);
    const result = await getSprintById("nonexistent-id");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createSprint
// ---------------------------------------------------------------------------

describe("createSprint", () => {
  it("calls create with the supplied fields", async () => {
    sprintMock.create.mockResolvedValue(mockSprint);
    await createSprint({
      name: "Sprint 1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-14"),
      projectId: "proj-a",
    });
    expect(sprintMock.create).toHaveBeenCalledWith({
      data: {
        name: "Sprint 1",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-14"),
        status: "PLANNING",
        projectId: "proj-a",
      },
    });
  });

  it("defaults status to PLANNING when not supplied", async () => {
    sprintMock.create.mockResolvedValue(mockSprint);
    await createSprint({
      name: "Sprint 1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-14"),
      projectId: "proj-a",
    });
    const callData = sprintMock.create.mock.calls[0][0].data;
    expect(callData.status).toBe("PLANNING");
  });

  it("uses the supplied status when provided", async () => {
    sprintMock.create.mockResolvedValue({ ...mockSprint, status: "ACTIVE" });
    await createSprint({
      name: "Sprint 1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-14"),
      projectId: "proj-a",
      status: "ACTIVE",
    });
    const callData = sprintMock.create.mock.calls[0][0].data;
    expect(callData.status).toBe("ACTIVE");
  });

  it("returns the created sprint", async () => {
    sprintMock.create.mockResolvedValue(mockSprint);
    const result = await createSprint({
      name: "Sprint 1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-14"),
      projectId: "proj-a",
    });
    expect(result).toEqual(mockSprint);
  });
});

// ---------------------------------------------------------------------------
// updateSprint
// ---------------------------------------------------------------------------

describe("updateSprint", () => {
  it("calls update with the correct id and data", async () => {
    const updated = { ...mockSprint, name: "Updated Sprint" };
    sprintMock.update.mockResolvedValue(updated);
    await updateSprint("sprint-1", { name: "Updated Sprint" });
    expect(sprintMock.update).toHaveBeenCalledWith({
      where: { id: "sprint-1" },
      data: { name: "Updated Sprint" },
    });
  });

  it("returns the updated sprint", async () => {
    const updated = { ...mockSprint, status: "ACTIVE" };
    sprintMock.update.mockResolvedValue(updated);
    const result = await updateSprint("sprint-1", { status: "ACTIVE" });
    expect(result).toEqual(updated);
  });

  it("accepts partial updates (only supplied fields are passed)", async () => {
    sprintMock.update.mockResolvedValue(mockSprint);
    await updateSprint("sprint-1", { status: "COMPLETED" });
    const callData = sprintMock.update.mock.calls[0][0].data;
    // Only 'status' should be in the data object — no extra fields
    expect(callData).toEqual({ status: "COMPLETED" });
    expect(callData).not.toHaveProperty("name");
    expect(callData).not.toHaveProperty("startDate");
  });
});

// ---------------------------------------------------------------------------
// deleteSprint
// ---------------------------------------------------------------------------

describe("deleteSprint", () => {
  it("calls delete with the correct id", async () => {
    sprintMock.delete.mockResolvedValue(mockSprint);
    await deleteSprint("sprint-1");
    expect(sprintMock.delete).toHaveBeenCalledWith({ where: { id: "sprint-1" } });
  });

  it("returns the deleted sprint record", async () => {
    sprintMock.delete.mockResolvedValue(mockSprint);
    const result = await deleteSprint("sprint-1");
    expect(result).toEqual(mockSprint);
  });
});
