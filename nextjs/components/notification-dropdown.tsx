"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/components/notifications-provider";
import { cn } from "@/lib/utils";
import type {
  NotificationType,
  NotificationWithRelations,
} from "@/lib/types";

interface NotificationDropdownProps {
  onClose: () => void;
}

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return RTF.format(diffSec, "second");
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return RTF.format(Math.round(diffSec / 3600), "hour");
  return RTF.format(Math.round(diffSec / 86400), "day");
}

function verbFor(type: NotificationType): string {
  switch (type) {
    case "TASK_ASSIGNED":
      return "assigned you to";
    case "TASK_COMPLETED":
      return "completed";
    case "MENTION":
      return "mentioned you in";
  }
}

function contextFor(n: NotificationWithRelations): string {
  if (n.type === "MENTION" && n.comment) {
    const excerpt = n.comment.content.trim();
    return excerpt.length > 60 ? `${excerpt.slice(0, 60)}…` : excerpt;
  }
  if (n.task) return n.task.title;
  return "(removed)";
}

function NotificationRow({
  notification,
  onNavigate,
  onDismiss,
}: {
  notification: NotificationWithRelations;
  onNavigate: (n: NotificationWithRelations) => void;
  onDismiss: (id: string) => void;
}) {
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate(notification);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(notification)}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full text-left px-3 py-2 flex items-start gap-2 cursor-pointer",
        "hover:bg-accent transition-colors border-l-2",
        notification.read
          ? "border-transparent"
          : "border-blue-500 bg-blue-50/40"
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            !notification.read && "font-medium"
          )}
        >
          <span className="font-semibold">{notification.actor.name}</span>{" "}
          {verbFor(notification.type as NotificationType)}{" "}
          <span className="text-muted-foreground">
            {contextFor(notification)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {relativeTime(notification.createdAt)}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground p-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const { items, unreadCount, loadingList, markRead, markAllRead } =
    useNotifications();

  const handleNavigate = (n: NotificationWithRelations) => {
    if (!n.read) markRead(n.id);
    if (n.task) {
      router.push(`/projects/${n.task.projectId}?task=${n.task.id}`);
      onClose();
    }
  };

  return (
    <div
      role="menu"
      className={cn(
        "w-80 rounded-md border bg-background shadow-lg",
        "max-h-[28rem] flex flex-col overflow-hidden"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-semibold">Notifications</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={unreadCount === 0}
          onClick={() => markAllRead()}
          className="text-xs h-7"
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items === null && loadingList && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {items !== null && items.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        )}
        {items !== null &&
          items.length > 0 &&
          items.slice(0, 20).map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onNavigate={handleNavigate}
              onDismiss={markRead}
            />
          ))}
      </div>
    </div>
  );
}
