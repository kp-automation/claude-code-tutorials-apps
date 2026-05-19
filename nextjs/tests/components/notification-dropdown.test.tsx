import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationDropdown } from "@/components/notification-dropdown";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/components/notifications-provider", () => ({
  __esModule: true,
  useNotifications: jest.fn(),
}));

import { useNotifications } from "@/components/notifications-provider";

const mockedUseNotifications = useNotifications as jest.MockedFunction<
  typeof useNotifications
>;

function setHookValue(overrides: Partial<ReturnType<typeof useNotifications>>) {
  mockedUseNotifications.mockReturnValue({
    unreadCount: 0,
    items: [],
    loadingList: false,
    refreshCount: jest.fn(),
    loadList: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    ...overrides,
  });
}

const ITEM_ASSIGNED = {
  id: "n1",
  type: "TASK_ASSIGNED",
  read: false,
  createdAt: new Date().toISOString(),
  userId: "u1",
  actorId: "u2",
  taskId: "t1",
  commentId: null,
  actor: { id: "u2", name: "Alice", email: "a@x.com" },
  task: { id: "t1", title: "Fix the bug", projectId: "p1" },
  comment: null,
};

const ITEM_MENTION = {
  id: "n2",
  type: "MENTION",
  read: true,
  createdAt: new Date().toISOString(),
  userId: "u1",
  actorId: "u3",
  taskId: "t2",
  commentId: "c1",
  actor: { id: "u3", name: "Bob", email: "b@x.com" },
  task: { id: "t2", title: "Review PR", projectId: "p1" },
  comment: { id: "c1", content: "@kelly please look" },
};

describe("NotificationDropdown", () => {
  beforeEach(() => {
    mockedUseNotifications.mockReset();
    pushMock.mockReset();
  });

  it("shows the empty state when items is an empty array", () => {
    setHookValue({ items: [] });
    render(<NotificationDropdown onClose={() => {}} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("renders rows for each notification", () => {
    setHookValue({ items: [ITEM_ASSIGNED, ITEM_MENTION] as any });
    render(<NotificationDropdown onClose={() => {}} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("clicking a row navigates and calls markRead", () => {
    const markRead = jest.fn();
    const onClose = jest.fn();
    setHookValue({
      items: [ITEM_ASSIGNED] as any,
      unreadCount: 1,
      markRead,
    });
    render(<NotificationDropdown onClose={onClose} />);

    fireEvent.click(screen.getByText("Alice"));
    expect(markRead).toHaveBeenCalledWith("n1");
    expect(pushMock).toHaveBeenCalledWith("/projects/p1?task=t1");
    expect(onClose).toHaveBeenCalled();
  });

  it("dismiss button calls markRead but does not navigate", () => {
    const markRead = jest.fn();
    const onClose = jest.fn();
    setHookValue({
      items: [ITEM_ASSIGNED] as any,
      unreadCount: 1,
      markRead,
    });
    render(<NotificationDropdown onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(markRead).toHaveBeenCalledWith("n1");
    expect(pushMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("mark all as read fires markAllRead and is disabled when unreadCount is 0", () => {
    const markAllRead = jest.fn();
    setHookValue({
      items: [ITEM_MENTION] as any,
      unreadCount: 0,
      markAllRead,
    });
    const { rerender } = render(
      <NotificationDropdown onClose={() => {}} />
    );

    const button = screen.getByText(/Mark all as read/i);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(markAllRead).not.toHaveBeenCalled();

    setHookValue({
      items: [ITEM_ASSIGNED] as any,
      unreadCount: 1,
      markAllRead,
    });
    rerender(<NotificationDropdown onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Mark all as read/i));
    expect(markAllRead).toHaveBeenCalled();
  });
});
