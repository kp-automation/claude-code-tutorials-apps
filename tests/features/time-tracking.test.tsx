/**
 * Tests for the TimeTracker component and useTimeTracking hook.
 * Mocks fetch and next-auth/react to avoid real DB or session dependencies.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
const OTHER_USER_ID = "user-2";

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

// ── Initial render ─────────────────────────────────────────────────────────

describe("TimeTracker — initial render", () => {
  it("renders the Time Tracking heading", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    expect(screen.getByText("Time Tracking")).toBeInTheDocument();
  });

  it("renders the Start Timer button when not running", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    expect(screen.getByRole("button", { name: /start timer/i })).toBeInTheDocument();
  });

  it("renders Log Time button when not running", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    expect(screen.getByRole("button", { name: /log time/i })).toBeInTheDocument();
  });

  it("shows 'No time entries yet' when list is empty", async () => {
    mockFetch.mockResolvedValueOnce(okResponse([]));
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/no time entries yet/i)).toBeInTheDocument();
    });
  });

  it("fetches time entries on mount", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/tasks/${TASK_ID}/time-entries`
      );
    });
  });
});

// ── Entry list display ─────────────────────────────────────────────────────

describe("TimeTracker — entry list", () => {
  it("displays entries with formatted duration", async () => {
    mockFetch.mockResolvedValueOnce(okResponse([makeEntry({ durationSeconds: 3600 })]));
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.getByText("1h")).toBeInTheDocument();
    });
  });

  it("displays entry description when present", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse([makeEntry({ description: "Design review" })])
    );
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Design review")).toBeInTheDocument();
    });
  });

  it("displays author name and date", async () => {
    mockFetch.mockResolvedValueOnce(okResponse([makeEntry()]));
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/test user/i)).toBeInTheDocument();
    });
  });

  it("shows total seconds when entries exist", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse([
        makeEntry({ id: "e1", durationSeconds: 3600 }),
        makeEntry({ id: "e2", durationSeconds: 1800 }),
      ])
    );
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      // 3600 + 1800 = 5400s = 1h 30m
      expect(screen.getByText(/total: 1h 30m/i)).toBeInTheDocument();
    });
  });
});

// ── Conditional edit/delete controls ──────────────────────────────────────

describe("TimeTracker — edit/delete visibility", () => {
  it("shows edit and delete buttons for entries owned by current user", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse([makeEntry({ userId: USER_ID })])
    );
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit time entry/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete time entry/i })).toBeInTheDocument();
    });
  });

  it("hides edit and delete buttons for entries owned by other users", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse([
        makeEntry({
          userId: OTHER_USER_ID,
          user: { id: OTHER_USER_ID, name: "Other User", email: "other@example.com" },
        }),
      ])
    );
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /edit time entry/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /delete time entry/i })).not.toBeInTheDocument();
    });
  });
});

// ── Start/Stop timer ───────────────────────────────────────────────────────

describe("TimeTracker — start/stop timer", () => {
  it("shows Stop button after clicking Start Timer", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    const startBtn = screen.getByRole("button", { name: /start timer/i });
    fireEvent.click(startBtn);
    expect(screen.getByRole("button", { name: /stop timer/i })).toBeInTheDocument();
  });

  it("shows the entry form after clicking Stop", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    const startBtn = screen.getByRole("button", { name: /start timer/i });
    fireEvent.click(startBtn);

    const stopBtn = screen.getByRole("button", { name: /stop timer/i });
    fireEvent.click(stopBtn);

    expect(screen.getByLabelText(/duration \(seconds\)/i)).toBeInTheDocument();
  });
});

// ── Manual entry form ──────────────────────────────────────────────────────

describe("TimeTracker — manual entry form", () => {
  it("opens manual entry form when Log Time is clicked", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /log time/i }));
    expect(screen.getByLabelText(/duration \(seconds\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("closes the form when Cancel is clicked", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /log time/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByLabelText(/duration \(seconds\)/i)).not.toBeInTheDocument();
  });

  it("shows validation error when submitting with empty duration", async () => {
    render(<TimeTracker taskId={TASK_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /log time/i }));
    // Save button should be disabled when durationSeconds is empty
    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it("submits a manual entry and closes the form on success", async () => {
    const newEntry = makeEntry({ id: "new-entry", durationSeconds: 1800 });
    // First call: initial GET for entries list
    mockFetch
      .mockResolvedValueOnce(okResponse([]))
      // Second call: POST to create entry
      .mockResolvedValueOnce(okResponse(newEntry, 201));

    render(<TimeTracker taskId={TASK_ID} />);

    await userEvent.click(screen.getByRole("button", { name: /log time/i }));

    const durationInput = screen.getByLabelText(/duration \(seconds\)/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, "1800");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/tasks/${TASK_ID}/time-entries`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("1800"),
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByLabelText(/duration \(seconds\)/i)).not.toBeInTheDocument();
    });
  });

  it("shows error message when POST returns 404 (task deleted)", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(errorResponse(404));

    render(<TimeTracker taskId={TASK_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /log time/i }));

    const durationInput = screen.getByLabelText(/duration \(seconds\)/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, "60");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/task no longer exists/i);
    });
  });

  it("shows error message when POST returns 400 (invalid duration)", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(errorResponse(400));

    render(<TimeTracker taskId={TASK_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /log time/i }));

    const durationInput = screen.getByLabelText(/duration \(seconds\)/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, "60");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid duration/i);
    });
  });
});

// ── Delete entry ───────────────────────────────────────────────────────────

describe("TimeTracker — delete entry", () => {
  beforeEach(() => {
    window.confirm = jest.fn().mockReturnValue(true);
  });

  it("calls DELETE and removes entry from list on success", async () => {
    const entry = makeEntry({ id: "entry-del" });
    mockFetch
      .mockResolvedValueOnce(okResponse([entry]))
      .mockResolvedValueOnce(okResponse({ success: true }));

    render(<TimeTracker taskId={TASK_ID} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete time entry/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /delete time entry/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/time-entries/entry-del`,
        expect.objectContaining({ method: "DELETE" })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/no time entries yet/i)).toBeInTheDocument();
    });
  });

  it("shows error when DELETE returns 403", async () => {
    const entry = makeEntry({ id: "entry-del" });
    mockFetch
      .mockResolvedValueOnce(okResponse([entry]))
      .mockResolvedValueOnce(errorResponse(403));

    render(<TimeTracker taskId={TASK_ID} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete time entry/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /delete time entry/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/only delete your own/i);
    });
  });
});

// ── Edit entry ─────────────────────────────────────────────────────────────

describe("TimeTracker — edit entry", () => {
  it("opens edit form pre-filled with existing values", async () => {
    const entry = makeEntry({ durationSeconds: 7200, description: "Code review" });
    mockFetch.mockResolvedValueOnce(okResponse([entry]));

    render(<TimeTracker taskId={TASK_ID} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit time entry/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /edit time entry/i }));

    const durationInput = screen.getByLabelText(/duration \(seconds\)/i) as HTMLInputElement;
    expect(durationInput.value).toBe("7200");

    const descInput = screen.getByLabelText(/description/i) as HTMLInputElement;
    expect(descInput.value).toBe("Code review");
  });

  it("calls PATCH with updated values on save", async () => {
    const entry = makeEntry({ id: "entry-edit", durationSeconds: 3600 });
    const updatedEntry = makeEntry({ id: "entry-edit", durationSeconds: 7200 });

    mockFetch
      .mockResolvedValueOnce(okResponse([entry]))
      .mockResolvedValueOnce(okResponse(updatedEntry));

    render(<TimeTracker taskId={TASK_ID} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /edit time entry/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /edit time entry/i }));

    const durationInput = screen.getByLabelText(/duration \(seconds\)/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, "7200");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/time-entries/entry-edit`,
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("7200"),
        })
      );
    });
  });
});

// ── Error states ───────────────────────────────────────────────────────────

describe("TimeTracker — error states", () => {
  it("shows error when entries fail to load (401)", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(401));
    render(<TimeTracker taskId={TASK_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows 401 error message on failed POST", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(errorResponse(401));

    render(<TimeTracker taskId={TASK_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /log time/i }));

    const durationInput = screen.getByLabelText(/duration \(seconds\)/i);
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, "60");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/signed in/i);
    });
  });
});
