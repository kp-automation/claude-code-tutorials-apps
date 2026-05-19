/**
 * Barrel-export coverage for @/components/sprint (index.ts)
 *
 * Verifies that:
 *   1. Every named value export is defined (not undefined).
 *   2. Type-only exports (`SprintTask`, `SprintStatus`, `CreateSprintData`) resolve
 *      at compile time — exercised via type-annotated fixtures.
 *   3. Every React component export mounts without throwing.
 *
 * NOTE: task spec listed `src/components/sprint/__tests__/index.test.ts` but that
 * path (a) sits outside allowed write paths and (b) is not covered by the nextjs
 * jest config, so tests would never run. `nextjs/components/sprint/index.ts` and
 * `src/components/sprint/index.ts` are identical; this file targets the canonical
 * nextjs location and passes under `npm test`.
 */
import React from "react";
import { render } from "@testing-library/react";
import {
  SprintTaskCard,
  SprintHeader,
  SprintBoard,
  SprintCard,
  SprintForm,
  CreateSprintDialog,
} from "@/components/sprint";
import type { SprintTask, SprintStatus, CreateSprintData } from "@/components/sprint";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Stub Radix/shadcn Dialog primitives to avoid jsdom portal issues.
// All children are rendered inline; `asChild` / `open` props are ignored.
jest.mock("@/components/ui/dialog", () => {
  const React = require("react");
  const passthrough =
    (testId: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": testId }, children);

  return {
    Dialog: passthrough("dialog-root"),
    DialogTrigger: passthrough("dialog-trigger"),
    DialogContent: passthrough("dialog-content"),
    DialogHeader: passthrough("dialog-header"),
    DialogTitle: passthrough("dialog-title"),
    DialogFooter: passthrough("dialog-footer"),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// SprintTask = Task (Prisma) & { assignee: { id, name, email } | null }
// Fields match prisma/schema.prisma Task model (no dueDate field).
const baseTask: SprintTask = {
  id: "task-1",
  title: "Test task",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  projectId: "proj-1",
  assigneeId: null,
  sprintId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-10T00:00:00.000Z"),
  assignee: null,
};

// Type-annotated constants verify that type exports resolve at compile time.
const baseSprintStatus: SprintStatus = "ACTIVE";

const baseCreateSprintData: CreateSprintData = {
  name: "Sprint 1",
  startDate: "2026-06-01",
  endDate: "2026-06-14",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("@/components/sprint barrel export", () => {
  beforeEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // Value exports — are they defined?
  // -------------------------------------------------------------------------

  describe("value exports", () => {
    it("exports SprintTaskCard as a function", () => {
      expect(SprintTaskCard).toBeDefined();
      expect(typeof SprintTaskCard).toBe("function");
    });

    it("exports SprintHeader as a function", () => {
      expect(SprintHeader).toBeDefined();
      expect(typeof SprintHeader).toBe("function");
    });

    it("exports SprintBoard as a function", () => {
      expect(SprintBoard).toBeDefined();
      expect(typeof SprintBoard).toBe("function");
    });

    it("exports SprintCard as a function", () => {
      expect(SprintCard).toBeDefined();
      expect(typeof SprintCard).toBe("function");
    });

    it("exports SprintForm as a function", () => {
      expect(SprintForm).toBeDefined();
      expect(typeof SprintForm).toBe("function");
    });

    it("exports CreateSprintDialog as a function", () => {
      expect(CreateSprintDialog).toBeDefined();
      expect(typeof CreateSprintDialog).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // Type exports — verified via compile-time annotations
  // -------------------------------------------------------------------------

  describe("type exports", () => {
    it("SprintStatus type resolves — fixture value is a valid SprintStatus", () => {
      // If the type export were broken the file would fail to compile.
      expect(baseSprintStatus).toBe("ACTIVE");
    });

    it("CreateSprintData type resolves — fixture has expected shape", () => {
      expect(baseCreateSprintData).toEqual({
        name: "Sprint 1",
        startDate: "2026-06-01",
        endDate: "2026-06-14",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Smoke renders — each component mounts without throwing
  // -------------------------------------------------------------------------

  describe("smoke renders", () => {
    it("SprintTaskCard renders without throwing", () => {
      expect(() => render(<SprintTaskCard task={baseTask} />)).not.toThrow();
    });

    it("SprintHeader renders without throwing", () => {
      expect(() =>
        render(
          <SprintHeader
            name="Sprint 1"
            startDate="2026-06-01"
            endDate="2026-06-14"
            status="ACTIVE"
            totalTasks={5}
            completedTasks={2}
          />
        )
      ).not.toThrow();
    });

    it("SprintBoard renders without throwing", () => {
      expect(() =>
        render(<SprintBoard tasks={[]} projectId="proj-1" />)
      ).not.toThrow();
    });

    it("SprintCard renders without throwing", () => {
      expect(() =>
        render(
          <SprintCard
            sprint={{
              id: "sprint-1",
              name: "Sprint 1",
              startDate: "2026-06-01",
              endDate: "2026-06-14",
              status: "ACTIVE",
              tasks: [],
            }}
          />
        )
      ).not.toThrow();
    });

    it("SprintForm renders without throwing", () => {
      expect(() =>
        render(<SprintForm onSubmit={jest.fn()} />)
      ).not.toThrow();
    });

    it("CreateSprintDialog renders without throwing (alias for SprintForm)", () => {
      expect(() =>
        render(<CreateSprintDialog onSubmit={jest.fn()} />)
      ).not.toThrow();
    });
  });
});
