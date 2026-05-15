import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TimeTracking } from "@/components/time-tracking";

// Mock next-auth so useSession can be controlled per test
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Stub lucide-react icons to simple elements to avoid SVG render complexity
jest.mock("lucide-react", () => ({
  Timer: () => <span data-testid="icon-timer" />,
  Play: () => <span data-testid="icon-play" />,
  Square: () => <span data-testid="icon-square" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Trash2: () => <span data-testid="icon-trash" />,
}));

// Stub shadcn/ui primitives to avoid complex import chains
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

import { useSession } from "next-auth/react";

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Default session: authenticated as user-1
function setSession(userId: string | null) {
  if (userId === null) {
    mockedUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: jest.fn(),
    });
  } else {
    mockedUseSession.mockReturnValue({
      data: { user: { id: userId, name: "Test User", email: "test@example.com" } } as any,
      status: "authenticated",
      update: jest.fn(),
    });
  }
}

// A sample entry owned by user-1
const ownEntry = {
  id: "entry-1",
  durationSeconds: 3600,
  description: "My work session",
  taskId: "task-1",
  userId: "user-1",
  createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
  user: { id: "user-1", name: "Test User", email: "test@example.com" },
};

// A sample entry owned by a different user
const otherEntry = {
  id: "entry-2",
  durationSeconds: 1800,
  description: "Other person's work",
  taskId: "task-1",
  userId: "user-2",
  createdAt: new Date("2026-01-01T09:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T09:00:00.000Z").toISOString(),
  user: { id: "user-2", name: "Other User", email: "other@example.com" },
};

function mockFetchEntries(entries: typeof ownEntry[]) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => entries,
  } as Response);
}

describe("TimeTracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession("user-1");
  });

  // ── 1. Start Timer button visible when not running ─────────────────────────

  it("renders 'Start Timer' button when timer is not running", async () => {
    mockFetchEntries([]);
    render(<TimeTracking taskId="task-1" />);
    await waitFor(() => {
      expect(screen.getByLabelText("Start timer")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Stop timer")).toBeNull();
  });

  // ── 2. Elapsed display and Stop button appear after clicking Start ─────────

  it("shows elapsed display and 'Stop' button after clicking Start", async () => {
    mockFetchEntries([]);
    render(<TimeTracking taskId="task-1" />);

    const startBtn = await screen.findByLabelText("Start timer");
    fireEvent.click(startBtn);

    expect(screen.getByLabelText("Stop timer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start timer")).toBeNull();
  });

  // ── 3. Edit/delete controls appear only for the current user's own entries ─

  it("shows edit and delete controls only for entries owned by the current user", async () => {
    mockFetchEntries([ownEntry, otherEntry]);
    render(<TimeTracking taskId="task-1" />);

    await waitFor(() => {
      expect(screen.getByText("1h")).toBeInTheDocument(); // ownEntry duration
    });

    const editButtons = screen.getAllByLabelText("Edit time entry");
    const deleteButtons = screen.getAllByLabelText("Delete time entry");

    // Only one set of controls — for the owned entry
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  // ── 4. Edit/delete controls absent for other users' entries ───────────────

  it("does not show edit/delete controls for entries owned by other users", async () => {
    // Render with only the other user's entry; current user is user-1
    mockFetchEntries([otherEntry]);
    render(<TimeTracking taskId="task-1" />);

    await waitFor(() => {
      expect(screen.getByText("30m")).toBeInTheDocument(); // otherEntry duration
    });

    expect(screen.queryByLabelText("Edit time entry")).toBeNull();
    expect(screen.queryByLabelText("Delete time entry")).toBeNull();
  });

  // ── 5. 'Log Time' button opens the manual entry form ─────────────────────

  it("opens the manual entry form when 'Log Time' is clicked", async () => {
    mockFetchEntries([]);
    render(<TimeTracking taskId="task-1" />);

    const logTimeBtn = await screen.findByLabelText("Log time manually");
    fireEvent.click(logTimeBtn);

    expect(screen.getByLabelText("Duration (seconds)")).toBeInTheDocument();
  });

  // ── 6. Submit disabled when duration is empty ─────────────────────────────

  it("disables the Save button when duration input is empty", async () => {
    mockFetchEntries([]);
    render(<TimeTracking taskId="task-1" />);

    const logTimeBtn = await screen.findByLabelText("Log time manually");
    fireEvent.click(logTimeBtn);

    const saveBtn = screen.getByText("Save");
    expect(saveBtn).toBeDisabled();
  });
});
