import { act, render, screen, waitFor } from "@testing-library/react";
import {
  NotificationsProvider,
  useNotifications,
} from "@/components/notifications-provider";

function Probe() {
  const { unreadCount, items, markRead, markAllRead, loadList } =
    useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <span data-testid="items">{items === null ? "null" : items.length}</span>
      <button onClick={() => loadList()}>load</button>
      <button onClick={() => markRead("n1")}>read-n1</button>
      <button onClick={() => markAllRead()}>read-all</button>
    </div>
  );
}

describe("NotificationsProvider", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  function mockJson(body: unknown, ok = true) {
    return { ok, json: async () => body } as unknown as Response;
  }

  it("polls unread-count on mount and exposes the value", async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ count: 4 }));
    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("4")
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notifications/unread-count",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("loadList fetches the full list and stores it", async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ count: 0 }));
    fetchMock.mockResolvedValueOnce(
      mockJson([
        { id: "n1", read: false, type: "TASK_ASSIGNED" },
        { id: "n2", read: true, type: "MENTION" },
      ])
    );

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("0")
    );

    await act(async () => {
      screen.getByText("load").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("items").textContent).toBe("2")
    );
  });

  it("markRead optimistically decrements unread and rolls back on failure", async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ count: 2 }));
    fetchMock.mockResolvedValueOnce(
      mockJson([
        { id: "n1", read: false, type: "TASK_ASSIGNED" },
        { id: "n2", read: false, type: "MENTION" },
      ])
    );
    fetchMock.mockResolvedValueOnce(mockJson({}, false));

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );

    await act(async () => {
      screen.getByText("load").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("items").textContent).toBe("2")
    );

    await act(async () => {
      screen.getByText("read-n1").click();
    });
    // After rollback the count should be back to 2.
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2")
    );
  });

  it("markAllRead zeroes the count immediately", async () => {
    fetchMock.mockResolvedValueOnce(mockJson({ count: 3 }));
    fetchMock.mockResolvedValueOnce(mockJson({ updated: 3 }));

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("3")
    );

    await act(async () => {
      screen.getByText("read-all").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("0")
    );
  });
});
