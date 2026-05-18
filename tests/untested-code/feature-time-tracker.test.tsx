/**
 * Gap tests for src/components/features/TimeTracker.tsx — edit-form 403/404
 * responses, Stop-timer pre-fill, and timer-running UI state not covered by
 * the baseline suite.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeTracker } from "../../src/components/features/TimeTracker";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { useSession } from "next-auth/react";

// ── Helpers ────────────────────────────────────────────────────────────────

const TASK_ID = "task-1";
const USER_ID = "user-1";

const mockSession = {
  data: { user: { id: USER_ID, email: "test@example.com", name: "Test User" } },
  status: "authenticated",
};

function makeEntry(overrides: Partial<{
  id: string;
  durationSeconds: number;
  description: string | null;
  userId: string;
  user: { id: string; name: string; email: string };
}> = {}) {
  return {
    id: "entry-1",
    durationSeconds: 3600,
    description: null,
    taskId: TASK_ID,
    userId: USER_ID,
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
    user: { id: USER_ID, name: "Test User", email: "test@example.com" },
    ...overrides,
  };
}

function okResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

function errorResponse(status: number, body = { error: "error" }) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
  (useSession as jest.Mock).mockReturnValue(mockSession);
  // Default: GET /api/tasks/:id/time-entries returns empty list
  mockFetch.mockResolvedValue(okResponse([]));
});

// ── Edit-form error responses ──────────────────────────────────────────────

describe("TimeTracker — edit entry error responses", () => {
  it("shows alert matching /only edit your own/i when PATCH returns 403", async () => {
    const entry = makeEntry({ id: "entry-edit", durationSeconds: 3600 });
    mockFetch
      .mockResolvedValueOnce(okResponse([entry]))   // initial GET
      .mockResolvedValueOnce(errorResponse(403));    // PATCH → 403

    render(<TimeTracker taskId={TASK_ID} />);

    // Wait for entry to appear and click Edit
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit time entry/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /edit time entry/i }));

    // The form is open — click Save (duration is already pre-filled)
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/only edit your own/i);
    });
  });

  it("shows alert matching /not found/i when PATCH returns 404", async () => {
    const entry = makeEntry({ id: "entry-edit", durationSeconds: 3600 });
    mockFetch
      .mockResolvedValueOnce(okResponse([entry]))   // initial GET
      .mockResolvedValueOnce(errorResponse(404));    // PATCH → 404

    render(<TimeTracker taskId={TASK_ID} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit time entry/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /edit time entry/i }));

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/not found/i);
    });
  });
});

// ── Stop-timer pre-fill ────────────────────────────────────────────────────

describe("TimeTracker — stop timer opens duration form with pre-filled value", () => {
  it("opens the duration form with a pre-filled numeric value >= 1 after clicking Stop", () => {
    render(<TimeTracker taskId={TASK_ID} />);

    // Start the timer
    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));
    // Immediately stop the timer (elapsed time will be 0, so pre-fill is 1)
    fireEvent.click(screen.getByRole("button", { name: /stop timer/i }));

    // The duration input should now be visible
    const durationInput = screen.getByLabelText(/duration \(seconds\)/i) as HTMLInputElement;
    const prefilled = parseInt(durationInput.value, 10);
    expect(prefilled).toBeGreaterThanOrEqual(1);
  });

  it("shows Save and Cancel buttons in the stop form", () => {
    render(<TimeTracker taskId={TASK_ID} />);

    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));
    fireEvent.click(screen.getByRole("button", { name: /stop timer/i }));

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

// ── Timer-running UI state ─────────────────────────────────────────────────

describe("TimeTracker — UI while timer is running", () => {
  it("does not show the Log Time button while the timer is running", () => {
    render(<TimeTracker taskId={TASK_ID} />);

    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));

    expect(screen.queryByRole("button", { name: /log time/i })).not.toBeInTheDocument();
  });

  it("does not show the Start Timer button while the timer is running", () => {
    render(<TimeTracker taskId={TASK_ID} />);

    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));

    expect(screen.queryByRole("button", { name: /start timer/i })).not.toBeInTheDocument();
  });
});
