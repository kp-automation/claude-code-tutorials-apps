import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimeTracking } from "../../src/hooks/useTimeTracking";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ────────────────────────────────────────────────────────────────

const TASK_ID = "task-1";
const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const ENTRY_ID = "entry-1";

function makeEntry(overrides: Partial<{
  id: string;
  durationSeconds: number;
  description: string | null;
  userId: string;
  user: { id: string; name: string; email: string };
}> = {}) {
  return {
    id: ENTRY_ID,
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

function okJson(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function errorJson(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "error" }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue(okJson([]));
});

// ── Initialization ─────────────────────────────────────────────────────────

describe("useTimeTracking — initialization", () => {
  it("starts with timer not running and zero elapsed seconds", () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("starts with empty entries and loading true", () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoadingEntries).toBe(true);
  });

  it("fetches entries on mount with correct URL", async () => {
    renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`/api/tasks/${TASK_ID}/time-entries`);
    });
  });

  it("populates entries from successful fetch", async () => {
    const entry = makeEntry();
    mockFetch.mockResolvedValue(okJson([entry]));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].id).toBe(ENTRY_ID);
  });

  it("sets isLoadingEntries to false after fetch completes", async () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));
  });

  it("starts with null submitError and null entriesError", async () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    expect(result.current.submitError).toBeNull();
    await waitFor(() => expect(result.current.entriesError).toBeNull());
  });
});

// ── totalSeconds ───────────────────────────────────────────────────────────

describe("useTimeTracking — totalSeconds", () => {
  it("is 0 when no entries exist", async () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));
    expect(result.current.totalSeconds).toBe(0);
  });

  it("sums durations across all entries", async () => {
    mockFetch.mockResolvedValue(
      okJson([
        makeEntry({ id: "e1", durationSeconds: 3600 }),
        makeEntry({ id: "e2", durationSeconds: 1800 }),
        makeEntry({ id: "e3", durationSeconds: 600 }),
      ])
    );

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.totalSeconds).toBe(6000));
  });
});

// ── Timer controls ─────────────────────────────────────────────────────────

describe("useTimeTracking — timer", () => {
  it("sets isRunning to true on startTimer", () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    act(() => result.current.startTimer());
    expect(result.current.isRunning).toBe(true);
  });

  it("sets isRunning to false on stopTimer", () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    act(() => result.current.startTimer());
    act(() => result.current.stopTimer());
    expect(result.current.isRunning).toBe(false);
  });

  it("resets elapsedSeconds to 0 on startTimer", () => {
    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    act(() => result.current.startTimer());
    expect(result.current.elapsedSeconds).toBe(0);
  });
});

// ── logManualEntry ─────────────────────────────────────────────────────────

describe("useTimeTracking — logManualEntry", () => {
  it("POSTs to the correct endpoint with durationSeconds and description", async () => {
    const entry = makeEntry({ durationSeconds: 1800 });
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(okJson(entry, 201));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    await act(async () => {
      await result.current.logManualEntry(1800, "Bug fix");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/tasks/${TASK_ID}/time-entries`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: 1800, description: "Bug fix" }),
      })
    );
  });

  it("returns true and prepends entry to list on success", async () => {
    const entry = makeEntry({ id: "new-entry", durationSeconds: 1800 });
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(okJson(entry, 201));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    let success!: boolean;
    await act(async () => {
      success = await result.current.logManualEntry(1800);
    });

    expect(success).toBe(true);
    expect(result.current.entries[0].id).toBe("new-entry");
  });

  it("returns false and sets submitError on 401", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(errorJson(401));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    let success!: boolean;
    await act(async () => {
      success = await result.current.logManualEntry(60);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/signed in/i);
  });

  it("returns false and sets submitError on 404", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(errorJson(404));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    let success!: boolean;
    await act(async () => {
      success = await result.current.logManualEntry(60);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/task no longer exists/i);
  });

  it("returns false and sets submitError on 403", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(errorJson(403));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    let success!: boolean;
    await act(async () => {
      success = await result.current.logManualEntry(60);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/permission/i);
  });

  it("returns false and sets submitError on 400", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(errorJson(400));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    let success!: boolean;
    await act(async () => {
      success = await result.current.logManualEntry(60);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/invalid duration/i);
  });

  it("sets isSubmitting true during the request and false after", async () => {
    let resolvePost!: (v: unknown) => void;
    const postPromise = new Promise((r) => { resolvePost = r; });

    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockReturnValueOnce(postPromise);

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    act(() => { result.current.logManualEntry(60); });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolvePost(okJson(makeEntry(), 201));
    });
    expect(result.current.isSubmitting).toBe(false);
  });
});

// ── updateEntry ────────────────────────────────────────────────────────────

describe("useTimeTracking — updateEntry", () => {
  it("PATCHes the correct endpoint with updated duration", async () => {
    const entry = makeEntry();
    const updated = makeEntry({ durationSeconds: 7200 });
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson(updated));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      await result.current.updateEntry(ENTRY_ID, 7200);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/time-entries/${ENTRY_ID}`,
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("replaces the entry in the list with the updated version", async () => {
    const entry = makeEntry();
    const updated = makeEntry({ durationSeconds: 7200 });
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson(updated));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      await result.current.updateEntry(ENTRY_ID, 7200);
    });

    expect(result.current.entries[0].durationSeconds).toBe(7200);
  });

  it("returns true on success", async () => {
    const entry = makeEntry();
    const updated = makeEntry({ durationSeconds: 7200 });
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson(updated));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.updateEntry(ENTRY_ID, 7200);
    });

    expect(success).toBe(true);
  });

  it("returns false and sets submitError on 403", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))
      .mockResolvedValueOnce(errorJson(403));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.updateEntry(ENTRY_ID, 7200);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/only edit your own/i);
  });

  it("returns false and sets submitError on 404", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))
      .mockResolvedValueOnce(errorJson(404));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.updateEntry(ENTRY_ID, 7200);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/not found/i);
  });

  it("omits description key from body when not provided", async () => {
    const entry = makeEntry();
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson(entry));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      await result.current.updateEntry(ENTRY_ID, 3600);
    });

    const [, options] = mockFetch.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body).not.toHaveProperty("description");
  });
});

// ── deleteEntry ────────────────────────────────────────────────────────────

describe("useTimeTracking — deleteEntry", () => {
  it("sends DELETE to the correct endpoint", async () => {
    const entry = makeEntry();
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson({ success: true }));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      await result.current.deleteEntry(ENTRY_ID);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/time-entries/${ENTRY_ID}`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("removes the entry from the list on success", async () => {
    const entry = makeEntry();
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson({ success: true }));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    await act(async () => {
      await result.current.deleteEntry(ENTRY_ID);
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it("returns true on success", async () => {
    const entry = makeEntry();
    mockFetch
      .mockResolvedValueOnce(okJson([entry]))
      .mockResolvedValueOnce(okJson({ success: true }));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.deleteEntry(ENTRY_ID);
    });

    expect(success).toBe(true);
  });

  it("returns false and sets submitError on 404", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))
      .mockResolvedValueOnce(errorJson(404));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.deleteEntry(ENTRY_ID);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/not found/i);
  });

  it("returns false and sets submitError on 403", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))
      .mockResolvedValueOnce(errorJson(403));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.deleteEntry(ENTRY_ID);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/only delete your own/i);
  });

  it("does not remove other entries from the list on targeted delete", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson([
          makeEntry({ id: "entry-a" }),
          makeEntry({ id: "entry-b" }),
        ])
      )
      .mockResolvedValueOnce(okJson({ success: true }));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));

    await act(async () => {
      await result.current.deleteEntry("entry-a");
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe("entry-b");
  });
});

// ── refreshEntries ─────────────────────────────────────────────────────────

describe("useTimeTracking — refreshEntries", () => {
  it("sets entriesError when task returns 404", async () => {
    mockFetch.mockResolvedValue(errorJson(404));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => {
      expect(result.current.entriesError).toMatch(/task no longer exists/i);
    });
  });

  it("sets generic error message on non-404 failure", async () => {
    mockFetch.mockResolvedValue(errorJson(500));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => {
      expect(result.current.entriesError).toMatch(/failed to load/i);
    });
  });

  it("manually refreshes and updates entries", async () => {
    const entry = makeEntry();
    mockFetch
      .mockResolvedValueOnce(okJson([]))          // initial load
      .mockResolvedValueOnce(okJson([entry]));     // manual refresh

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));
    expect(result.current.entries).toHaveLength(0);

    await act(async () => {
      await result.current.refreshEntries();
    });

    expect(result.current.entries).toHaveLength(1);
  });
});

// ── clearSubmitError ───────────────────────────────────────────────────────

describe("useTimeTracking — clearSubmitError", () => {
  it("clears submitError after a failed logManualEntry", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([]))
      .mockResolvedValueOnce(errorJson(401));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    await act(async () => {
      await result.current.logManualEntry(60);
    });

    expect(result.current.submitError).not.toBeNull();

    act(() => result.current.clearSubmitError());

    expect(result.current.submitError).toBeNull();
  });
});
