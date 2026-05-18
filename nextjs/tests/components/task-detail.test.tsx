/**
 * Task detail page — timestamp formatting regression tests.
 *
 * Verifies that createdAt/updatedAt are displayed in the user's local timezone
 * (toLocaleString) rather than hardcoded as UTC (the previous bug).
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks (all must be declared before the component import)
// ---------------------------------------------------------------------------

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "proj-1", taskId: "task-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

const mockGetTask = jest.fn();
jest.mock("@/src/lib/api/tasks", () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

// Stub complex child components that fetch their own data or use portals
jest.mock("@/components/comment-thread", () => ({
  CommentThread: () => <div data-testid="comment-thread-stub" />,
}));

jest.mock("@/components/time-tracking", () => ({
  TimeTracking: () => <div data-testid="time-tracking-stub" />,
}));

// Stub Radix Select (uses portals that don't render in jsdom)
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import TaskDetailPage from "@/app/projects/[id]/tasks/[taskId]/page";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CREATED_AT = "2024-06-15T14:30:00.000Z";
const UPDATED_AT = "2024-06-16T09:00:00.000Z";

const mockTask = {
  id: "task-1",
  title: "Test Task",
  description: "A test description",
  status: "TODO",
  priority: "MEDIUM",
  projectId: "proj-1",
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  project: { id: "proj-1", name: "Test Project" },
  assignee: null,
  comments: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TaskDetailPage timestamp formatting", () => {
  beforeEach(() => {
    mockGetTask.mockResolvedValue(mockTask);
  });

  afterEach(() => {
    mockGetTask.mockReset();
  });

  it("displays createdAt in local time format", async () => {
    render(<TaskDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    const expected = new Date(CREATED_AT).toLocaleString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("displays updatedAt in local time format", async () => {
    render(<TaskDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    const expected = new Date(UPDATED_AT).toLocaleString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("does not display a hardcoded UTC suffix", async () => {
    render(<TaskDetailPage />);
    await waitFor(() => {
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    // No element should contain the literal string "UTC" in its text content
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\bUTC\b/);
  });
});
