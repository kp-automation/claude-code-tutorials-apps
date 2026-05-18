/**
 * Gap tests for src/hooks/useTimeTracking.ts — isSubmitting lifecycle for
 * updateEntry/deleteEntry and fetch-throws catch branches not covered by the
 * baseline suite.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimeTracking } from "../../src/hooks/useTimeTracking";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ────────────────────────────────────────────────────────────────

const TASK_ID = "task-1";
const USER_ID = "user-1";
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
  // Default: initial GET returns empty list
  mockFetch.mockResolvedValue(okJson([]));
});

// ── isSubmitting lifecycle — updateEntry ───────────────────────────────────

describe("useTimeTracking — isSubmitting for updateEntry", () => {
  it("is true during an in-flight updateEntry call and false after success", async () => {
    let resolvePatch!: (v: unknown) => void;
    const patchPromise = new Promise((r) => { resolvePatch = r; });

    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))  // initial GET
      .mockReturnValueOnce(patchPromise);              // PATCH — held open

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    // Start the update without awaiting — isSubmitting should flip to true
    act(() => { result.current.updateEntry(ENTRY_ID, 7200); });
    expect(result.current.isSubmitting).toBe(true);

    // Resolve the in-flight request — isSubmitting should flip back to false
    await act(async () => {
      resolvePatch(okJson(makeEntry({ durationSeconds: 7200 })));
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("is true during an in-flight updateEntry call and false after failure", async () => {
    let resolvePatch!: (v: unknown) => void;
    const patchPromise = new Promise((r) => { resolvePatch = r; });

    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))  // initial GET
      .mockReturnValueOnce(patchPromise);              // PATCH — held open

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    act(() => { result.current.updateEntry(ENTRY_ID, 7200); });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolvePatch(errorJson(500));
    });
    expect(result.current.isSubmitting).toBe(false);
  });
});

// ── isSubmitting lifecycle — deleteEntry ───────────────────────────────────

describe("useTimeTracking — isSubmitting for deleteEntry", () => {
  it("is true during an in-flight deleteEntry call and false after success", async () => {
    let resolveDelete!: (v: unknown) => void;
    const deletePromise = new Promise((r) => { resolveDelete = r; });

    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))  // initial GET
      .mockReturnValueOnce(deletePromise);             // DELETE — held open

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    act(() => { result.current.deleteEntry(ENTRY_ID); });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveDelete(okJson({ success: true }));
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("is true during an in-flight deleteEntry call and false after failure", async () => {
    let resolveDelete!: (v: unknown) => void;
    const deletePromise = new Promise((r) => { resolveDelete = r; });

    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))  // initial GET
      .mockReturnValueOnce(deletePromise);             // DELETE — held open

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    act(() => { result.current.deleteEntry(ENTRY_ID); });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveDelete(errorJson(403));
    });
    expect(result.current.isSubmitting).toBe(false);
  });
});

// ── fetch-throws catch branches ────────────────────────────────────────────

describe("useTimeTracking — logManualEntry fetch throws", () => {
  it("returns false and sets submitError matching /failed to save/i when fetch throws", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([]))              // initial GET
      .mockRejectedValueOnce(new Error("Network error")); // POST throws

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.isLoadingEntries).toBe(false));

    let success!: boolean;
    await act(async () => {
      success = await result.current.logManualEntry(3600);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/failed to save/i);
  });
});

describe("useTimeTracking — updateEntry fetch throws", () => {
  it("returns false and sets submitError matching /failed to update/i when fetch throws", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))   // initial GET
      .mockRejectedValueOnce(new Error("Network error")); // PATCH throws

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.updateEntry(ENTRY_ID, 7200);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/failed to update/i);
  });
});

describe("useTimeTracking — deleteEntry fetch throws", () => {
  it("returns false and sets submitError matching /failed to delete/i when fetch throws", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([makeEntry()]))   // initial GET
      .mockRejectedValueOnce(new Error("Network error")); // DELETE throws

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    let success!: boolean;
    await act(async () => {
      success = await result.current.deleteEntry(ENTRY_ID);
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toMatch(/failed to delete/i);
  });
});

describe("useTimeTracking — refreshEntries fetch throws", () => {
  it("sets entriesError matching /failed to load/i when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useTimeTracking({ taskId: TASK_ID }));
    await waitFor(() => {
      expect(result.current.entriesError).toMatch(/failed to load/i);
    });
  });
});
