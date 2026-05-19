/**
 * @jest-environment node
 */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
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

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@example.com" } };

beforeEach(() => jest.clearAllMocks());

describe("GET /api/sprints", () => {
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 200 with sprint list for authenticated user");
});

describe("POST /api/sprints", () => {
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 400 on invalid body");
  it.todo("returns 201 with created sprint on valid body");
});

describe("GET /api/sprints/[id]", () => {
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 404 for unknown sprint");
  it.todo("returns 200 with sprint data for valid id");
});

describe("PATCH /api/sprints/[id]", () => {
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 403 when caller does not own the sprint");
  it.todo("returns 200 with updated sprint on valid patch");
});

describe("DELETE /api/sprints/[id]", () => {
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 403 when caller does not own the sprint");
  it.todo("returns 200 with { success: true } on deletion");
});
