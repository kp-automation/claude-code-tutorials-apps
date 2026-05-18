import { useState, useEffect, useCallback, useRef } from "react";

export interface TimeEntryUser {
  id: string;
  name: string;
  email: string;
}

export interface TimeEntry {
  id: string;
  durationSeconds: number;
  description: string | null;
  taskId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: TimeEntryUser;
}

interface UseTimeTrackingOptions {
  taskId: string;
}

interface UseTimeTrackingResult {
  // Timer state
  isRunning: boolean;
  elapsedSeconds: number;
  startTimer: () => void;
  stopTimer: () => void;

  // Entry management
  entries: TimeEntry[];
  totalSeconds: number;
  isLoadingEntries: boolean;
  entriesError: string | null;

  // Manual entry — returns true on success, false on failure
  logManualEntry: (durationSeconds: number, description?: string) => Promise<boolean>;

  // Entry CRUD — returns true on success, false on failure
  updateEntry: (entryId: string, durationSeconds?: number, description?: string) => Promise<boolean>;
  deleteEntry: (entryId: string) => Promise<boolean>;

  // Shared state
  isSubmitting: boolean;
  submitError: string | null;
  clearSubmitError: () => void;

  // Refresh
  refreshEntries: () => Promise<void>;
}

export function useTimeTracking({ taskId }: UseTimeTrackingOptions): UseTimeTrackingResult {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  const refreshEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    setEntriesError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries`);
      if (!res.ok) {
        if (res.status === 404) {
          setEntriesError("This task no longer exists.");
        } else {
          setEntriesError("Failed to load time entries.");
        }
        return;
      }
      const data: TimeEntry[] = await res.json();
      setEntries(data);
    } catch {
      setEntriesError("Failed to load time entries.");
    } finally {
      setIsLoadingEntries(false);
    }
  }, [taskId]);

  // Load entries on mount
  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setIsRunning(true);
  }, []);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Log a time entry. Returns true on success, false on failure.
   * Sets submitError state on failure.
   */
  const logManualEntry = useCallback(
    async (durationSeconds: number, description?: string): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const res = await fetch(`/api/tasks/${taskId}/time-entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationSeconds, description }),
        });
        if (!res.ok) {
          if (res.status === 401) {
            setSubmitError("You must be signed in to log time.");
          } else if (res.status === 404) {
            setSubmitError("This task no longer exists.");
          } else if (res.status === 403) {
            setSubmitError("You do not have permission to log time on this task.");
          } else if (res.status === 400) {
            setSubmitError("Invalid duration. Duration must be a positive number.");
          } else {
            setSubmitError("Failed to save time entry.");
          }
          return false;
        }
        const newEntry: TimeEntry = await res.json();
        setEntries((prev) => [newEntry, ...prev]);
        setElapsedSeconds(0);
        startTimeRef.current = null;
        return true;
      } catch {
        setSubmitError("Failed to save time entry.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [taskId]
  );

  /**
   * Update an existing time entry. Returns true on success, false on failure.
   */
  const updateEntry = useCallback(
    async (
      entryId: string,
      durationSeconds?: number,
      description?: string
    ): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const body: Record<string, unknown> = {};
        if (durationSeconds !== undefined) body.durationSeconds = durationSeconds;
        if (description !== undefined) body.description = description;

        const res = await fetch(`/api/time-entries/${entryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          if (res.status === 401) {
            setSubmitError("You must be signed in.");
          } else if (res.status === 404) {
            setSubmitError("Time entry not found.");
          } else if (res.status === 403) {
            setSubmitError("You can only edit your own time entries.");
          } else if (res.status === 400) {
            setSubmitError("Invalid duration. Duration must be a positive number.");
          } else {
            setSubmitError("Failed to update time entry.");
          }
          return false;
        }
        const updated: TimeEntry = await res.json();
        setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
        return true;
      } catch {
        setSubmitError("Failed to update time entry.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  /**
   * Delete a time entry. Returns true on success, false on failure.
   */
  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        if (res.status === 401) {
          setSubmitError("You must be signed in.");
        } else if (res.status === 404) {
          setSubmitError("Time entry not found.");
        } else if (res.status === 403) {
          setSubmitError("You can only delete your own time entries.");
        } else {
          setSubmitError("Failed to delete time entry.");
        }
        return false;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      return true;
    } catch {
      setSubmitError("Failed to delete time entry.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);

  return {
    isRunning,
    elapsedSeconds,
    startTimer,
    stopTimer,
    entries,
    totalSeconds,
    isLoadingEntries,
    entriesError,
    logManualEntry,
    updateEntry,
    deleteEntry,
    isSubmitting,
    submitError,
    clearSubmitError,
    refreshEntries,
  };
}
