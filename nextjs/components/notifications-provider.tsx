"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NotificationWithRelations } from "@/lib/types";

type NotificationsContextValue = {
  unreadCount: number;
  items: NotificationWithRelations[] | null;
  loadingList: boolean;
  refreshCount: () => Promise<void>;
  loadList: (force?: boolean) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;
const LIST_REFETCH_AFTER_MS = 60_000;

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationWithRelations[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const lastListFetchRef = useRef<number>(0);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const { count } = await res.json();
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch {
      // best-effort poll
    }
  }, []);

  const loadList = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (
        !force &&
        items !== null &&
        now - lastListFetchRef.current < LIST_REFETCH_AFTER_MS
      ) {
        return;
      }
      setLoadingList(true);
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data: NotificationWithRelations[] = await res.json();
        setItems(data);
        lastListFetchRef.current = Date.now();
      } catch {
        // best-effort
      } finally {
        setLoadingList(false);
      }
    },
    [items]
  );

  const markRead = useCallback(
    async (id: string) => {
      const prevItems = items;
      const prevCount = unreadCount;
      const target = items?.find((n) => n.id === id);
      if (target && !target.read) {
        setItems(
          items!.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
      try {
        const res = await fetch(`/api/notifications/${id}/read`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("mark read failed");
      } catch {
        setItems(prevItems);
        setUnreadCount(prevCount);
      }
    },
    [items, unreadCount]
  );

  const markAllRead = useCallback(async () => {
    const prevItems = items;
    const prevCount = unreadCount;
    setItems(items?.map((n) => ({ ...n, read: true })) ?? null);
    setUnreadCount(0);
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error("mark all read failed");
    } catch {
      setItems(prevItems);
      setUnreadCount(prevCount);
    }
  }, [items, unreadCount]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      refreshCount();
      interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshCount]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        items,
        loadingList,
        refreshCount,
        loadList,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
