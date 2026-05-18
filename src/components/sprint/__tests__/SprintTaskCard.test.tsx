import { render, screen, fireEvent } from "@testing-library/react";
import { SprintTaskCard } from "@/components/sprint/sprint-task-card";
import type { SprintTask } from "@/components/sprint/sprint-task-card";

const baseTask: SprintTask = {
  id: "task-1",
  title: "Fix login bug",
  description: "The login page crashes on submit",
  status: "TODO",
  priority: "HIGH",
  projectId: "proj-1",
  assigneeId: "user-1",
  dueDate: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-10T00:00:00.000Z"),
  assignee: { id: "user-1", name: "Alice Smith", email: "alice@example.com" },
};

describe("SprintTaskCard", () => {
  beforeEach(() => jest.resetAllMocks());

  it("renders the task title", () => {
    render(<SprintTaskCard task={baseTask} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("renders the description when present", () => {
    render(<SprintTaskCard task={baseTask} />);
    expect(screen.getByText("The login page crashes on submit")).toBeInTheDocument();
  });

  it("does not render a description element when description is null", () => {
    const task = { ...baseTask, description: null };
    render(<SprintTaskCard task={task} />);
    expect(screen.queryByText("The login page crashes on submit")).toBeNull();
  });

  it("renders the priority badge", () => {
    render(<SprintTaskCard task={baseTask} />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders LOW priority badge", () => {
    render(<SprintTaskCard task={{ ...baseTask, priority: "LOW" }} />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("renders MEDIUM priority badge", () => {
    render(<SprintTaskCard task={{ ...baseTask, priority: "MEDIUM" }} />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("renders URGENT priority badge", () => {
    render(<SprintTaskCard task={{ ...baseTask, priority: "URGENT" }} />);
    expect(screen.getByText("URGENT")).toBeInTheDocument();
  });

  it("renders the assignee name", () => {
    render(<SprintTaskCard task={baseTask} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("renders 'Unassigned' when assignee is null", () => {
    const task = { ...baseTask, assignee: null };
    render(<SprintTaskCard task={task} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("renders without throwing for TODO status", () => {
    expect(() =>
      render(<SprintTaskCard task={{ ...baseTask, status: "TODO" }} />)
    ).not.toThrow();
  });

  it("renders without throwing for IN_PROGRESS status", () => {
    expect(() =>
      render(<SprintTaskCard task={{ ...baseTask, status: "IN_PROGRESS" }} />)
    ).not.toThrow();
  });

  it("renders without throwing for DONE status", () => {
    expect(() =>
      render(<SprintTaskCard task={{ ...baseTask, status: "DONE" }} />)
    ).not.toThrow();
  });

  it("displays the updatedAt date in YYYY-MM-DD format", () => {
    render(<SprintTaskCard task={baseTask} />);
    expect(screen.getByText("2026-01-10")).toBeInTheDocument();
  });

  it("renders empty string when updatedAt is falsy", () => {
    const task = { ...baseTask, updatedAt: null as unknown as Date };
    expect(() => render(<SprintTaskCard task={task} />)).not.toThrow();
  });

  it("calls onClick when the card is clicked", () => {
    const handleClick = jest.fn();
    render(<SprintTaskCard task={baseTask} onClick={handleClick} />);
    fireEvent.click(screen.getByText("Fix login bug"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onClick is not provided and the card is clicked", () => {
    render(<SprintTaskCard task={baseTask} />);
    expect(() => fireEvent.click(screen.getByText("Fix login bug"))).not.toThrow();
  });
});
