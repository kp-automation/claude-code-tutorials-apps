import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskDependencySelector } from "@/components/task-dependency-selector";
import { type DependencyGraph } from "@/lib/utils/task-dependencies";

// Radix UI Select uses portals that don't render in jsdom. Replace with a
// plain <select> so fireEvent.change can simulate user selections.
jest.mock("@/components/ui/select", () => ({
  Select: ({
    onValueChange,
    disabled,
    children,
  }: {
    onValueChange?: (v: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="dependency-select"
      disabled={disabled}
      defaultValue=""
      onChange={(e) => {
        onValueChange?.(e.target.value);
        // Reset to placeholder after selection (mirrors key-remount in the real component).
        e.target.value = "";
      }}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    disabled,
    children,
  }: {
    value: string;
    disabled?: boolean;
    children: React.ReactNode;
  }) => {
    // <option> can only contain text; flatten to string to avoid nesting warnings.
    const text = React.Children.toArray(children)
      .filter((c) => typeof c === "string")
      .join("");
    return (
      <option value={value} disabled={disabled} data-testid={`option-${value}`}>
        {text}
      </option>
    );
  },
}));

const TASKS = [
  { id: "t1", title: "Task One" },
  { id: "t2", title: "Task Two" },
  { id: "t3", title: "Task Three" },
];

function select(value: string) {
  fireEvent.change(screen.getByTestId("dependency-select"), {
    target: { value },
  });
}

// ── chip rendering ────────────────────────────────────────────────────────────

describe("chip rendering", () => {
  it("renders no chips when selectedIds is empty", () => {
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId("dependency-chips")).toBeNull();
  });

  it("renders a chip for each selected task", () => {
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1", "t2"]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("chip-t1")).toBeInTheDocument();
    expect(screen.getByTestId("chip-t2")).toBeInTheDocument();
    expect(screen.getByText("Task One")).toBeInTheDocument();
    expect(screen.getByText("Task Two")).toBeInTheDocument();
  });

  it("silently skips stale IDs that no longer exist in availableTasks", () => {
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1", "deleted-id"]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("chip-t1")).toBeInTheDocument();
    expect(screen.queryByTestId("chip-deleted-id")).toBeNull();
  });
});

// ── chip removal ─────────────────────────────────────────────────────────────

describe("chip removal", () => {
  it("calls onChange without the removed ID when the remove button is clicked", () => {
    const onChange = jest.fn();
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1", "t2"]}
        allDeps={{}}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText("Remove dependency Task One"));
    expect(onChange).toHaveBeenCalledWith(["t2"]);
  });

  it("removes the last chip, leaving an empty list", () => {
    const onChange = jest.fn();
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1"]}
        allDeps={{}}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText("Remove dependency Task One"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("remove buttons are disabled when the disabled prop is true", () => {
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1"]}
        allDeps={{}}
        onChange={jest.fn()}
        disabled
      />
    );
    expect(screen.getByLabelText("Remove dependency Task One")).toBeDisabled();
  });
});

// ── candidate filtering ───────────────────────────────────────────────────────

describe("candidate filtering", () => {
  it("excludes the current task from the dropdown", () => {
    render(
      <TaskDependencySelector
        taskId="t1"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId("option-t1")).toBeNull();
    expect(screen.getByTestId("option-t2")).toBeInTheDocument();
    expect(screen.getByTestId("option-t3")).toBeInTheDocument();
  });

  it("excludes already-selected tasks from the dropdown", () => {
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1"]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId("option-t1")).toBeNull();
    expect(screen.getByTestId("option-t2")).toBeInTheDocument();
  });

  it("disables the select when no candidates remain", () => {
    // All tasks are either the current task or already selected.
    render(
      <TaskDependencySelector
        taskId="t1"
        availableTasks={[{ id: "t1", title: "Only task" }]}
        selectedIds={[]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("dependency-select")).toBeDisabled();
  });
});

// ── adding a dependency ───────────────────────────────────────────────────────

describe("adding a dependency", () => {
  it("calls onChange with the new ID appended when a valid task is selected", () => {
    const onChange = jest.fn();
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t1"]}
        allDeps={{}}
        onChange={onChange}
      />
    );
    select("t2");
    expect(onChange).toHaveBeenCalledWith(["t1", "t2"]);
  });

  it("does not call onChange when the selected task would create a cycle", () => {
    const onChange = jest.fn();
    // t2 already depends on current; adding current → t2 would cycle.
    const deps: DependencyGraph = { t2: ["current"] };
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={deps}
        onChange={onChange}
      />
    );
    select("t2");
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── circular dependency warning ───────────────────────────────────────────────

describe("circular dependency warning", () => {
  it("shows no warning when there are no circular candidates", () => {
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={{}}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId("circular-warning")).toBeNull();
  });

  it("shows a singular warning when exactly one task is blocked", () => {
    const deps: DependencyGraph = { t1: ["current"] };
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={deps}
        onChange={jest.fn()}
      />
    );
    const warning = screen.getByTestId("circular-warning");
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toMatch(/^1 task is disabled/);
  });

  it("shows a plural warning when multiple tasks are blocked", () => {
    // Both t1 and t2 depend on current, so adding current → t1 or t2 cycles.
    const deps: DependencyGraph = { t1: ["current"], t2: ["current"] };
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={deps}
        onChange={jest.fn()}
      />
    );
    const warning = screen.getByTestId("circular-warning");
    expect(warning.textContent).toMatch(/^2 tasks are disabled/);
  });

  it("marks the circular candidate as disabled in the dropdown", () => {
    const deps: DependencyGraph = { t1: ["current"] };
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={deps}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("option-t1")).toBeDisabled();
    expect(screen.getByTestId("option-t2")).not.toBeDisabled();
  });

  it("skips cycle detection when taskId is undefined (new task)", () => {
    // With taskId=undefined, nothing should be blocked.
    const deps: DependencyGraph = { t1: ["t2"] };
    render(
      <TaskDependencySelector
        taskId={undefined}
        availableTasks={TASKS}
        selectedIds={[]}
        allDeps={deps}
        onChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId("circular-warning")).toBeNull();
    TASKS.forEach((t) =>
      expect(screen.getByTestId(`option-${t.id}`)).not.toBeDisabled()
    );
  });

  it("accounts for already-selected deps when checking for cycles", () => {
    // current already has t2 selected. t3 depends on current.
    // Adding current → t3 would cycle via t3 → current → t2 (if t2→t3 later),
    // but more directly: t3 depends on current, so current cannot depend on t3.
    const deps: DependencyGraph = { t3: ["current"] };
    render(
      <TaskDependencySelector
        taskId="current"
        availableTasks={TASKS}
        selectedIds={["t2"]}
        allDeps={deps}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByTestId("option-t3")).toBeDisabled();
  });
});
