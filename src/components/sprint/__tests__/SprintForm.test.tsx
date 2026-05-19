import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SprintForm, CreateSprintDialog } from "@/components/sprint/SprintForm";

jest.mock("@/components/ui/dialog", () => {
  const React = require("react");

  function Dialog({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) {
    return (
      <div data-testid="dialog-root" data-open={open}>
        {React.Children.map(children, (child: React.ReactElement) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child as React.ReactElement<any>, { open, onOpenChange });
        })}
      </div>
    );
  }

  function DialogTrigger({
    asChild,
    children,
    onOpenChange,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
    onOpenChange?: (v: boolean) => void;
  }) {
    const child = React.Children.only(children) as React.ReactElement<any>;
    return React.cloneElement(child, {
      onClick: (...args: unknown[]) => {
        child.props.onClick?.(...args);
        onOpenChange?.(true);
      },
    });
  }

  function DialogContent({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) {
    if (!open) return null;
    return <div data-testid="dialog-content">{children}</div>;
  }

  function DialogHeader({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function DialogTitle({ children }: { children: React.ReactNode }) {
    return <h2>{children}</h2>;
  }

  function DialogFooter({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  return { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter };
});

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    variant?: string;
  }) => (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

function openDialog(onSubmit = jest.fn()) {
  render(<SprintForm onSubmit={onSubmit} />);
  fireEvent.click(screen.getByText("New Sprint"));
}

function fillForm({
  name = "Sprint 1",
  startDate = "2026-06-01",
  endDate = "2026-06-14",
} = {}) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: startDate } });
  fireEvent.change(screen.getByLabelText("End Date"), { target: { value: endDate } });
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: "Create Sprint" }));
}

describe("SprintForm", () => {
  beforeEach(() => jest.resetAllMocks());

  it("exports CreateSprintDialog as an alias for SprintForm", () => {
    expect(CreateSprintDialog).toBe(SprintForm);
  });

  it("renders a 'New Sprint' trigger button by default", () => {
    render(<SprintForm onSubmit={jest.fn()} />);
    expect(screen.getByText("New Sprint")).toBeInTheDocument();
  });

  it("renders a custom trigger when the trigger prop is provided", () => {
    render(
      <SprintForm
        onSubmit={jest.fn()}
        trigger={<button>Custom Trigger</button>}
      />
    );
    expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
    expect(screen.queryByText("New Sprint")).toBeNull();
  });

  it("does not show dialog content before the trigger is clicked", () => {
    render(<SprintForm onSubmit={jest.fn()} />);
    expect(screen.queryByTestId("dialog-content")).toBeNull();
  });

  it("opens the dialog when the trigger is clicked", () => {
    openDialog();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
  });

  it("renders the 'Create Sprint' heading", () => {
    openDialog();
    expect(screen.getByRole("heading", { name: "Create Sprint" })).toBeInTheDocument();
  });

  it("renders the Name input", () => {
    openDialog();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("renders the Start Date input", () => {
    openDialog();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
  });

  it("renders the End Date input", () => {
    openDialog();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
  });

  it("renders the Create Sprint submit button", () => {
    openDialog();
    expect(screen.getByRole("button", { name: "Create Sprint" })).toBeInTheDocument();
  });

  it("renders the Cancel button", () => {
    openDialog();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows an error when endDate is before startDate", async () => {
    openDialog();
    fillForm({ startDate: "2026-06-14", endDate: "2026-06-01" });
    clickSubmit();
    await waitFor(() => {
      expect(
        screen.getByText("End date must be on or after the start date.")
      ).toBeInTheDocument();
    });
  });

  it("does not call onSubmit when endDate is before startDate", async () => {
    const onSubmit = jest.fn();
    openDialog(onSubmit);
    fillForm({ startDate: "2026-06-14", endDate: "2026-06-01" });
    clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("End date must be on or after the start date.")
      ).toBeInTheDocument()
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts endDate equal to startDate (same-day sprint)", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    openDialog(onSubmit);
    fillForm({ startDate: "2026-06-01", endDate: "2026-06-01" });
    clickSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText("End date must be on or after the start date.")
    ).toBeNull();
  });

  it("calls onSubmit with the correct data on a valid submission", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    openDialog(onSubmit);
    fillForm({ name: "Sprint Alpha", startDate: "2026-06-01", endDate: "2026-06-14" });
    clickSubmit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sprint Alpha",
      startDate: "2026-06-01",
      endDate: "2026-06-14",
    });
  });

  it("closes the dialog after a successful submission", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    openDialog(onSubmit);
    fillForm();
    clickSubmit();
    await waitFor(() => expect(screen.queryByTestId("dialog-content")).toBeNull());
  });

  it("shows an error message when onSubmit rejects", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Server error"));
    openDialog(onSubmit);
    fillForm();
    clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Failed to create sprint. Please try again.")
      ).toBeInTheDocument()
    );
  });

  it("keeps the dialog open after a failed submission", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Boom"));
    openDialog(onSubmit);
    fillForm();
    clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("Failed to create sprint. Please try again.")
      ).toBeInTheDocument()
    );
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
  });

  it("closes the dialog when Cancel is clicked", () => {
    openDialog();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("dialog-content")).toBeNull();
  });

  it("resets the form fields when the dialog is closed via Cancel", () => {
    openDialog();
    fillForm({ name: "Discard Me" });
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("New Sprint"));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  });

  it("clears the validation error when the dialog is closed and reopened", async () => {
    openDialog();
    fillForm({ startDate: "2026-06-14", endDate: "2026-06-01" });
    clickSubmit();
    await waitFor(() =>
      expect(
        screen.getByText("End date must be on or after the start date.")
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("New Sprint"));
    expect(
      screen.queryByText("End date must be on or after the start date.")
    ).toBeNull();
  });

  it("shows 'Creating...' on the submit button while submitting", async () => {
    let resolve: (v: unknown) => void;
    const onSubmit = jest.fn(
      () => new Promise((res) => { resolve = res; })
    );
    openDialog(onSubmit);
    fillForm();
    clickSubmit();
    await waitFor(() =>
      expect(screen.getByText("Creating...")).toBeInTheDocument()
    );
    resolve!(undefined);
    await waitFor(() => expect(screen.queryByTestId("dialog-content")).toBeNull());
  });

  it("disables the Cancel button while submitting", async () => {
    let resolve: (v: unknown) => void;
    const onSubmit = jest.fn(
      () => new Promise((res) => { resolve = res; })
    );
    openDialog(onSubmit);
    fillForm();
    clickSubmit();
    await waitFor(() =>
      expect(screen.getByText("Creating...")).toBeInTheDocument()
    );
    expect(screen.getByText("Cancel")).toBeDisabled();
    resolve!(undefined);
  });
});
