/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/widgets/route";
import { GET as GET_ONE, PATCH, DELETE } from "@/app/api/widgets/[id]/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
jest.mock("@/lib/db", () => ({
  prisma: {
    widget: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

const mockSession = { user: { id: "user-1", email: "test@example.com" } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/widgets", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns items for authenticated user", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.widget.findMany as jest.Mock).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/widgets", () => {
  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const req = new Request("http://localhost/api/widgets", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
