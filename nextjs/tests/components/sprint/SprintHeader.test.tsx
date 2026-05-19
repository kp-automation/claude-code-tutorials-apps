import { render, screen } from "@testing-library/react";
import { SprintHeader } from "@/components/sprint/sprint-header";

const baseProps = {
  name: "Sprint 1",
  startDate: "2026-06-01",
  endDate: "2026-06-14",
  status: "ACTIVE" as const,
  totalTasks: 10,
  completedTasks: 4,
};

describe("SprintHeader", () => {
  beforeEach(() => jest.resetAllMocks());

  // ---------------------------------------------------------------------------
  // Name and status badge
  // ---------------------------------------------------------------------------

  it("renders the sprint name", () => {
    render(<SprintHeader {...baseProps} />);
    expect(screen.getByText("Sprint 1")).toBeInTheDocument();
  });

  it("renders the status badge text", () => {
    render(<SprintHeader {...baseProps} />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("renders PLANNING status badge", () => {
    render(<SprintHeader {...baseProps} status="PLANNING" />);
    expect(screen.getByText("PLANNING")).toBeInTheDocument();
  });

  it("renders COMPLETED status badge", () => {
    render(<SprintHeader {...baseProps} status="COMPLETED" />);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Date range
  // ---------------------------------------------------------------------------

  it("renders the start and end dates", () => {
    render(<SprintHeader {...baseProps} />);
    // Both dates appear inside a single span separated by an em-dash
    expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
    expect(screen.getByText(/2026-06-14/)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Progress bar
  // ---------------------------------------------------------------------------

  it("renders the progressbar role", () => {
    render(<SprintHeader {...baseProps} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets aria-valuenow to the correct percentage", () => {
    // 4/10 = 40%
    render(<SprintHeader {...baseProps} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("sets aria-valuemin to 0 and aria-valuemax to 100", () => {
    render(<SprintHeader {...baseProps} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("sets aria-label describing the percentage", () => {
    render(<SprintHeader {...baseProps} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "40% of sprint tasks completed"
    );
  });

  it("shows 0% when there are no tasks", () => {
    render(<SprintHeader {...baseProps} totalTasks={0} completedTasks={0} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows 100% when all tasks are completed", () => {
    render(<SprintHeader {...baseProps} totalTasks={5} completedTasks={5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("rounds fractional percentages", () => {
    // 1/3 = 33.33... → rounds to 33%
    render(<SprintHeader {...baseProps} totalTasks={3} completedTasks={1} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  });

  // ---------------------------------------------------------------------------
  // Task completion text
  // ---------------------------------------------------------------------------

  it("renders the completed / total tasks count", () => {
    render(<SprintHeader {...baseProps} />);
    expect(screen.getByText("4 / 10 tasks completed")).toBeInTheDocument();
  });

  it("renders the percentage label text", () => {
    render(<SprintHeader {...baseProps} />);
    // The text node showing "40%" appears in the header (not in aria-label)
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders '0 / 0 tasks completed' when totals are both 0", () => {
    render(<SprintHeader {...baseProps} totalTasks={0} completedTasks={0} />);
    expect(screen.getByText("0 / 0 tasks completed")).toBeInTheDocument();
  });
});
