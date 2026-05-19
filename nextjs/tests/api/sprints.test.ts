/**
 * @jest-environment node
 *
 * Route-handler tests for GET/POST /api/sprints
 *
 * Covers: auth gating (401), input validation (400), not-found (404),
 * ownership scoping (403), and successful responses (200/201).
 *
 * NOTE: task spec listed `src/pages/api/sprints/__tests__/index.test.ts` (Pages
 * Router handler). That path is outside allowed write paths and not covered by
 * the nextjs jest config. The App Router handler at @/app/api/sprints/route.ts
 * is the canonical nextjs implementation and shares identical behavior. Tests
 * are written against the App Router handler and live in nextjs/tests/api/ so
 * they run under `npm test`.
 */

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/sprint-db", () => ({
  getSprintsByProject: jest.fn(),
  createSprint: jest.fn(),
}));

import { GET, POST } from "@/app/api/sprints/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { getSprintsByProject, createSprint } from "@/lib/sprint-db";

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockSession = (getServerSession as jest.Mock);
const mockProjectFind = (prisma.project as any).findUnique as jest.Mock;
const mockGetSprints = getSprintsByProject as jest.Mock;
const mockCreateSprint = createSprint as jest.Mock;

const session = { user: { id: "user-1", email: "user@example.com" } };

const ownerProject = { id: "proj-1", name: "My Project", ownerId: "user-1" };
const otherProject = { id: "proj-2", name: "Other Project", ownerId: "user-2" };

const mockSprint = {
  id: "sprint-1",
  name: "Sprint 1",
  startDate: new Date("2026-06-01"),
  endDate: new Date("2026-06-14"),
  status: "PLANNING",
  projectId: "proj-1",
  createdAt: new Date("2026-05-20"),
  updatedAt: new Date("2026-05-20"),
};

const START_ISO = "2026-06-01T00:00:00.000Z";
const END_ISO = "2026-06-14T00:00:00.000Z";

const validCreateBody = {
  name: "Sprint 1",
  startDate: START_ISO,
  endDate: END_ISO,
  projectId: "proj-1",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/sprints
// ---------------------------------------------------------------------------

describe("GET /api/sprints", () => {
  function makeGetRequest(projectId?: string) {
    const url = projectId
      ? `http://localhost/api/sprints?projectId=${projectId}`
      : "http://localhost/api/sprints";
    return new Request(url);
  }

  it("returns 401 when no session is present", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest("proj-1"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when projectId query param is missing", async () => {
    mockSession.mockResolvedValue(session);
    const res = await GET(makeGetRequest()); // no projectId
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("projectId");
  });

  it("returns 404 when the project does not exist", async () => {
    mockSession.mockResolvedValue(session);
    mockProjectFind.mockResolvedValue(null);
    const res = await GET(makeGetRequest("proj-999"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the project is owned by a different user (ownership scoping)", async () => {
    mockSession.mockResolvedValue(session); // user-1
    mockProjectFind.mockResolvedValue(otherProject); // ownerId = user-2
    const res = await GET(makeGetRequest("proj-2"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 with sprint list when authenticated and owns the project", async () => {
    mockSession.mockResolvedValue(session);
    mockProjectFind.mockResolvedValue(ownerProject);
    mockGetSprints.mockResolvedValue([mockSprint]);
    const res = await GET(makeGetRequest("proj-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("delegates to getSprintsByProject with the correct projectId", async () => {
    mockSession.mockResolvedValue(session);
    mockProjectFind.mockResolvedValue(ownerProject);
    mockGetSprints.mockResolvedValue([]);
    await GET(makeGetRequest("proj-1"));
    expect(mockGetSprints).toHaveBeenCalledWith("proj-1");
  });

  it("does not return sprints for a project owned by a different user", async () => {
    // user-1 tries to GET sprints for proj-2 (owned by user-2)
    mockSession.mockResolvedValue(session); // user-1
    mockProjectFind.mockResolvedValue(otherProject); // ownerId user-2
    const res = await GET(makeGetRequest("proj-2"));
    // Must be 403, not 200 — getSprintsByProject should NOT be called
    expect(res.status).toBe(403);
    expect(mockGetSprints).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/sprints
// ---------------------------------------------------------------------------

describe("POST /api/sprints", () => {
  function makePostRequest(body: object) {
    return new Request("http://localhost/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when no session is present", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makePostRequest(validCreateBody));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 when the request body is missing required fields", async () => {
    mockSession.mockResolvedValue(session);
    const res = await POST(makePostRequest({})); // empty body → ZodError
    expect(res.status).toBe(400);
  });

  it("returns 400 when endDate is before startDate", async () => {
    mockSession.mockResolvedValue(session);
    const res = await POST(
      makePostRequest({
        ...validCreateBody,
        endDate: "2026-05-31T00:00:00.000Z", // before startDate
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the project does not exist", async () => {
    mockSession.mockResolvedValue(session);
    mockProjectFind.mockResolvedValue(null);
    const res = await POST(makePostRequest(validCreateBody));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the project is not owned by the session user", async () => {
    mockSession.mockResolvedValue(session); // user-1
    mockProjectFind.mockResolvedValue(otherProject); // ownerId user-2
    const res = await POST(makePostRequest(validCreateBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 201 with the created sprint on a valid request", async () => {
    mockSession.mockResolvedValue(session);
    mockProjectFind.mockResolvedValue(ownerProject);
    mockCreateSprint.mockResolvedValue(mockSprint);
    const res = await POST(makePostRequest(validCreateBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: "sprint-1", name: "Sprint 1" });
  });

  it("delegates to createSprint with the correct data", async () => {
    mockSession.mockResolvedValue(session);
    mockProjectFind.mockResolvedValue(ownerProject);
    mockCreateSprint.mockResolvedValue(mockSprint);
    await POST(makePostRequest(validCreateBody));
    expect(mockCreateSprint).toHaveBeenCalledWith({
      name: "Sprint 1",
      startDate: new Date(START_ISO),
      endDate: new Date(END_ISO),
      status: undefined, // not supplied in validCreateBody
      projectId: "proj-1",
    });
  });
});
