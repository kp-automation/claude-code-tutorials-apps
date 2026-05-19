/**
 * @jest-environment node
 *
 * POST /api/comments — error handling regression tests.
 *
 * Verifies that getServerSession being moved inside the try-catch means an
 * exception from getServerSession returns JSON { error: "Internal server error" }
 * with HTTP 500, rather than leaking an unstructured HTML error page.
 */
import { POST } from "@/app/api/comments/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  prisma: {
    comment: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/notifications", () => ({
  notifyMentions: jest.fn().mockResolvedValue(undefined),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

const mockSession = { user: { id: "user-1", email: "test@example.com" } };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Error-boundary regression (Bug 4)
// ---------------------------------------------------------------------------

describe("POST /api/comments — getServerSession error boundary", () => {
  it("returns 500 JSON when getServerSession throws (regression)", async () => {
    // Simulate invalid NEXTAUTH_SECRET / session store failure
    (getServerSession as jest.Mock).mockRejectedValue(
      new Error("JWT secret not set")
    );

    const res = await POST(makeRequest({ content: "Hello", taskId: "task-1" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
  });

  it("returns 401 JSON when session is null (unauthenticated)", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ content: "Hello", taskId: "task-1" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 201 with comment on valid authenticated request", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const mockComment = {
      id: "cmt-1",
      content: "Hello",
      taskId: "task-1",
      authorId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: "user-1", name: "Test User", email: "test@example.com" },
    };
    (prisma.comment.create as jest.Mock).mockResolvedValue(mockComment);

    const res = await POST(makeRequest({ content: "Hello", taskId: "task-1" }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("cmt-1");
    expect(body.content).toBe("Hello");
  });
});
