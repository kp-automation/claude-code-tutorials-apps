import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationBell } from "@/components/notification-bell";

jest.mock("@/components/notifications-provider", () => ({
  __esModule: true,
  useNotifications: jest.fn(),
}));

jest.mock("@/components/notification-dropdown", () => ({
  __esModule: true,
  NotificationDropdown: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="dropdown-stub">
      <button onClick={onClose}>close-stub</button>
    </div>
  ),
}));

import { useNotifications } from "@/components/notifications-provider";

const mockedUseNotifications = useNotifications as jest.MockedFunction<
  typeof useNotifications
>;

function setHookValue(overrides: Partial<ReturnType<typeof useNotifications>>) {
  mockedUseNotifications.mockReturnValue({
    unreadCount: 0,
    items: null,
    loadingList: false,
    refreshCount: jest.fn(),
    loadList: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    ...overrides,
  });
}

describe("NotificationBell", () => {
  beforeEach(() => {
    mockedUseNotifications.mockReset();
  });

  it("hides the badge when unreadCount is 0", () => {
    setHookValue({ unreadCount: 0 });
    render(<NotificationBell />);
    expect(screen.queryByTestId("notification-badge")).toBeNull();
  });

  it("renders the badge with the unread count", () => {
    setHookValue({ unreadCount: 3 });
    render(<NotificationBell />);
    expect(screen.getByTestId("notification-badge").textContent).toBe("3");
  });

  it("caps the badge at 9+", () => {
    setHookValue({ unreadCount: 12 });
    render(<NotificationBell />);
    expect(screen.getByTestId("notification-badge").textContent).toBe("9+");
  });

  it("opens the dropdown on click and fires loadList", () => {
    const loadList = jest.fn();
    setHookValue({ unreadCount: 1, loadList });
    render(<NotificationBell />);

    expect(screen.queryByTestId("dropdown-stub")).toBeNull();
    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(screen.getByTestId("dropdown-stub")).toBeInTheDocument();
    expect(loadList).toHaveBeenCalledTimes(1);
  });

  it("closes the dropdown when the stub fires onClose", () => {
    setHookValue({ unreadCount: 1 });
    render(<NotificationBell />);

    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(screen.getByTestId("dropdown-stub")).toBeInTheDocument();

    fireEvent.click(screen.getByText("close-stub"));
    expect(screen.queryByTestId("dropdown-stub")).toBeNull();
  });
});
