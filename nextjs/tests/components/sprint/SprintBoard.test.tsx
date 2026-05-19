import { render, screen, fireEvent } from "@testing-library/react";
import { SprintBoard } from "@/components/sprint/SprintBoard";
import type { SprintTask } from "@/components/sprint/sprint-task-card";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeTask(overrides: Partial<SprintTask> & { id: string; status: string }): SprintTask {
  return {
    title: `Task ${overrides.id}`,
    description: null,
    priority: "MEDIUM",
    projectId: "proj-1",
    assigneeId: null,
    dueDate: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-10T00:00:00.000Z"),
    assignee: null,
    ...overrides,
  } as SprintTask;
}

const todoTask = makeTask({ id: "t1", status: "TODO", title: "Build login" });
const inProgressTask = makeTask({ id: "t2", status: "IN_PROGRESS", title: "Write tests" });
const doneTask = makeTask({ id: "t3", status: "DONE", title: "Deploy API" });

describe("SprintBoard", () => {
  beforeEach(() => jest.resetAllMocks());

  // ---------------------------------------------------------------------------
  // Column headings
  // ---------------------------------------------------------------------------

  it("renders three column headings", () => {
    render(<SprintBoard tasks={[]} projectId="proj-1" />);
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Task rendering per column
  // ---------------------------------------------------------------------------

  it("renders a TODO task in the To Do column", () => {
    render(<SprintBoard tasks={[todoTask]} projectId="proj-1" />);
    expect(screen.getByText("Build login")).toBeInTheDocument();
  });

  it("renders an IN_PROGRESS task in the In Progress column", () => {
    render(<SprintBoard tasks={[inProgressTask]} projectId="proj-1" />);
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("renders a DONE task in the Done column", () => {
    render(<SprintBoard tasks={[doneTask]} projectId="proj-1" />);
    expect(screen.getByText("Deploy API")).toBeInTheDocument();
  });

  it("places each task in the correct column", () => {
    render(<SprintBoard tasks={[todoTask, inProgressTask, doneTask]} projectId="proj-1" />);
    expect(screen.getByText("Build login")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
    expect(screen.getByText("Deploy API")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Task counts per column
  // ---------------------------------------------------------------------------

  it("shows the correct task count in each column header", () => {
    render(<SprintBoard tasks={[todoTask, inProgressTask, doneTask]} projectId="proj-1" />);
    // Each column shows "<n> tasks"
    const countTexts = screen.getAllByText(/\d+ tasks?/);
    expect(countTexts.length).toBeGreaterThanOrEqual(3);
  });

  it("shows '1 tasks' for a single task column", () => {
    render(<SprintBoard tasks={[todoTask]} projectId="proj-1" />);
    expect(screen.getByText("1 tasks")).toBeInTheDocument();
  });

  it("shows '0 tasks' for all columns when no tasks provided", () => {
    render(<SprintBoard tasks={[]} projectId="proj-1" />);
    const zeros = screen.getAllByText("0 tasks");
    expect(zeros).toHaveLength(3);
  });

  // ---------------------------------------------------------------------------
  // Empty state messages
  // ---------------------------------------------------------------------------

  it("shows 'No tasks yet' in the To Do column when empty", () => {
    render(<SprintBoard tasks={[inProgressTask, doneTask]} projectId="proj-1" />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("shows 'No tasks in progress' in the In Progress column when empty", () => {
    render(<SprintBoard tasks={[todoTask, doneTask]} projectId="proj-1" />);
    expect(screen.getByText("No tasks in progress")).toBeInTheDocument();
  });

  it("shows 'No completed tasks' in the Done column when empty", () => {
    render(<SprintBoard tasks={[todoTask, inProgressTask]} projectId="proj-1" />);
    expect(screen.getByText("No completed tasks")).toBeInTheDocument();
  });

  it("shows all three empty messages when task list is empty", () => {
    render(<SprintBoard tasks={[]} projectId="proj-1" />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("No tasks in progress")).toBeInTheDocument();
    expect(screen.getByText("No completed tasks")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Click → router.push
  // ---------------------------------------------------------------------------

  it("navigates to the task detail page when a task card is clicked", () => {
    render(<SprintBoard tasks={[todoTask]} projectId="proj-42" />);
    fireEvent.click(screen.getByText("Build login"));
    expect(mockPush).toHaveBeenCalledWith("/projects/proj-42/tasks/t1");
  });

  it("uses the correct projectId in the navigation path", () => {
    render(<SprintBoard tasks={[doneTask]} projectId="proj-99" />);
    fireEvent.click(screen.getByText("Deploy API"));
    expect(mockPush).toHaveBeenCalledWith("/projects/proj-99/tasks/t3");
  });

  it("navigates with the clicked task's own id, not another task's", () => {
    render(
      <SprintBoard tasks={[todoTask, inProgressTask]} projectId="proj-1" />
    );
    fireEvent.click(screen.getByText("Write tests"));
    expect(mockPush).toHaveBeenCalledWith("/projects/proj-1/tasks/t2");
  });

  // ---------------------------------------------------------------------------
  // Multiple tasks in the same column
  // ---------------------------------------------------------------------------

  it("renders multiple tasks in the same column", () => {
    const todo2 = makeTask({ id: "t4", status: "TODO", title: "Update README" });
    render(<SprintBoard tasks={[todoTask, todo2]} projectId="proj-1" />);
    expect(screen.getByText("Build login")).toBeInTheDocument();
    expect(screen.getByText("Update README")).toBeInTheDocument();
  });
});
