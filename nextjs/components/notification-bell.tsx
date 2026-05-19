"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/components/notifications-provider";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { unreadCount, loadList } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadList();
    }
  };

  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md",
          "hover:bg-accent hover:text-accent-foreground transition-colors"
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className={cn(
              "absolute -top-0.5 -right-0.5 inline-flex min-w-[1.1rem] h-[1.1rem]",
              "items-center justify-center rounded-full bg-red-500 text-white",
              "text-[10px] font-semibold px-1"
            )}
          >
            {badgeText}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-50">
          <NotificationDropdown onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
