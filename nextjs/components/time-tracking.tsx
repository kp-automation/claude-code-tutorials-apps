"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Timer, Play, Square, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TimeEntry, User } from "@prisma/client";

interface TimeTrackerProps {
  taskId: string;
}

type TimeEntryWithUser = TimeEntry & {
  user: Pick<User, "id" | "name" | "email">;
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

interface EntryFormValues {
  durationSeconds: string;
  description: string;
}

const EMPTY_FORM: EntryFormValues = { durationSeconds: "", description: "" };

export function TimeTracking({ taskId }: TimeTrackerProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  // ── Timer state ────────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Entry list state ───────────────────────────────────────────────────────
  const [entries, setEntries] = useState<TimeEntryWithUser[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<EntryFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Submit state ───────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Effects ────────────────────────────────────────────────────────────────

  const refreshEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    setEntriesError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries`);
      if (!res.ok) {
        setEntriesError("Failed to load time entries.");
        return;
      }
      const data: TimeEntryWithUser[] = await res.json();
      setEntries(data);
    } catch {
      setEntriesError("Failed to load time entries.");
    } finally {
      setIsLoadingEntries(false);
    }
  }, [taskId]);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  // Timer interval
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

  // Warn before leaving while timer is active
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isRunning]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);
  const isManualFormOpen = activeForm === "manual" || activeForm === "stop";
  const editingEntryId = activeForm?.startsWith("edit:") ? activeForm.slice(5) : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStartTimer = () => {
    setSubmitError(null);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setIsRunning(true);
  };

  const handleStopTimer = () => {
    setIsRunning(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setFormValues({
      durationSeconds: String(elapsedSeconds > 0 ? elapsedSeconds : 1),
      description: "",
    });
    setFormError(null);
    setActiveForm("stop");
  };

  const openManualForm = () => {
    setSubmitError(null);
    setFormValues(EMPTY_FORM);
    setFormError(null);
    setActiveForm("manual");
  };

  const openEditForm = (entry: TimeEntryWithUser) => {
    setSubmitError(null);
    setFormValues({
      durationSeconds: String(entry.durationSeconds),
      description: entry.description ?? "",
    });
    setFormError(null);
    setActiveForm(`edit:${entry.id}`);
  };

  const closeForm = () => {
    setActiveForm(null);
    setFormValues(EMPTY_FORM);
    setFormError(null);
  };

  const validateForm = (): number | null => {
    const seconds = parseInt(formValues.durationSeconds, 10);
    if (isNaN(seconds) || seconds <= 0) {
      setFormError("Duration must be a positive number of seconds.");
      return null;
    }
    return seconds;
  };

  const handleSubmitEntry = async () => {
    const seconds = validateForm();
    if (seconds === null) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationSeconds: seconds,
          description: formValues.description || undefined,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setSubmitError("This task no longer exists.");
        } else if (res.status === 403) {
          setSubmitError("You do not have permission to log time on this task.");
        } else if (res.status === 400) {
          setSubmitError("Invalid duration. Duration must be a positive number.");
        } else {
          setSubmitError("Failed to save time entry.");
        }
        return;
      }
      const newEntry: TimeEntryWithUser = await res.json();
      setEntries((prev) => [newEntry, ...prev]);
      closeForm();
    } catch {
      setSubmitError("Failed to save time entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEntry = async (entryId: string) => {
    const seconds = validateForm();
    if (seconds === null) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationSeconds: seconds,
          description: formValues.description || undefined,
        }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setSubmitError("Time entry not found.");
        } else if (res.status === 403) {
          setSubmitError("You can only edit your own time entries.");
        } else if (res.status === 400) {
          setSubmitError("Invalid duration. Duration must be a positive number.");
        } else {
          setSubmitError("Failed to update time entry.");
        }
        return;
      }
      const updated: TimeEntryWithUser = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
      closeForm();
    } catch {
      setSubmitError("Failed to update time entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Delete this time entry?")) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        if (res.status === 403) {
          setSubmitError("You can only delete your own time entries.");
        } else if (res.status === 404) {
          setSubmitError("Time entry not found.");
        } else {
          setSubmitError("Failed to delete time entry.");
        }
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch {
      setSubmitError("Failed to delete time entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            <CardTitle className="text-base">Time Tracking</CardTitle>
          </div>
          {totalSeconds > 0 && (
            <span className="text-sm text-muted-foreground font-medium">
              Total: {formatDuration(totalSeconds)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer controls */}
        <div className="flex items-center gap-3">
          {isRunning ? (
            <>
              <div className="flex items-center gap-2 text-sm font-mono text-primary">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {formatDuration(elapsedSeconds)}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStopTimer}
                aria-label="Stop timer"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartTimer}
              disabled={isManualFormOpen || !!editingEntryId}
              aria-label="Start timer"
            >
              <Play className="h-4 w-4 mr-1" />
              Start Timer
            </Button>
          )}
          {!isRunning && !isManualFormOpen && !editingEntryId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={openManualForm}
              aria-label="Log time manually"
            >
              Log Time
            </Button>
          )}
        </div>

        {/* Inline entry form */}
        {(isManualFormOpen || editingEntryId) && (
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="duration-input" className="text-sm">
                Duration (seconds)
              </Label>
              <Input
                id="duration-input"
                type="number"
                min={1}
                placeholder="e.g. 3600 for 1 hour"
                value={formValues.durationSeconds}
                onChange={(e) => {
                  setFormError(null);
                  setFormValues((v) => ({ ...v, durationSeconds: e.target.value }));
                }}
                aria-invalid={!!formError}
              />
              {formError && (
                <p className="text-xs text-destructive" role="alert">
                  {formError}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description-input" className="text-sm">
                Description (optional)
              </Label>
              <Input
                id="description-input"
                type="text"
                placeholder="What did you work on?"
                value={formValues.description}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, description: e.target.value }))
                }
              />
            </div>
            {submitError && (
              <p className="text-xs text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  editingEntryId
                    ? handleUpdateEntry(editingEntryId)
                    : handleSubmitEntry()
                }
                disabled={isSubmitting || !formValues.durationSeconds}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={closeForm} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Non-form operation errors (e.g. delete errors) */}
        {submitError && !isManualFormOpen && !editingEntryId && (
          <p className="text-xs text-destructive" role="alert">
            {submitError}
          </p>
        )}

        {/* Entries load error */}
        {entriesError && (
          <p className="text-xs text-destructive" role="alert">
            {entriesError}
          </p>
        )}

        {/* Entry list */}
        {isLoadingEntries ? (
          <p className="text-sm text-muted-foreground">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time entries yet.</p>
        ) : (
          <ul className="space-y-2" aria-label="Time entries">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-2 text-sm border-b pb-2 last:border-b-0 last:pb-0"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-medium">{formatDuration(entry.durationSeconds)}</div>
                  {entry.description && (
                    <div className="text-muted-foreground text-xs truncate">
                      {entry.description}
                    </div>
                  )}
                  <div className="text-muted-foreground text-xs">
                    {entry.user.name} &middot; {formatDate(entry.createdAt)}
                  </div>
                </div>
                {currentUserId && entry.userId === currentUserId && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEditForm(entry)}
                      aria-label="Edit time entry"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteEntry(entry.id)}
                      aria-label="Delete time entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
