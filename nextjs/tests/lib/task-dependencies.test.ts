import { detectCircularDependency, DependencyGraph } from "@/lib/utils/task-dependencies";

describe("detectCircularDependency", () => {
  // ── self-dependency ─────────────────────────────────────────────────────────

  it("returns true when a task tries to depend on itself", () => {
    expect(detectCircularDependency("A", "A", {})).toBe(true);
  });

  it("returns true for self-dependency even when allDeps is populated", () => {
    const deps: DependencyGraph = { A: ["B"], B: ["C"] };
    expect(detectCircularDependency("A", "A", deps)).toBe(true);
  });

  // ── direct cycles ───────────────────────────────────────────────────────────

  it("detects a direct cycle: A → B exists, reject B → A", () => {
    // A depends on B; adding B depends on A would create A → B → A.
    const deps: DependencyGraph = { A: ["B"] };
    expect(detectCircularDependency("B", "A", deps)).toBe(true);
  });

  it("detects a direct mutual cycle between two tasks", () => {
    const deps: DependencyGraph = { X: ["Y"] };
    expect(detectCircularDependency("Y", "X", deps)).toBe(true);
  });

  // ── indirect cycles ─────────────────────────────────────────────────────────

  it("detects an indirect cycle: A → B → C exists, reject C → A", () => {
    // Proposed: C depends on A.  Existing path: A → B → C → A.
    const deps: DependencyGraph = { A: ["B"], B: ["C"] };
    expect(detectCircularDependency("C", "A", deps)).toBe(true);
  });

  it("detects a deep indirect cycle across four nodes", () => {
    // Chain: A → B → C → D. Adding D → A closes the cycle.
    const deps: DependencyGraph = { A: ["B"], B: ["C"], C: ["D"] };
    expect(detectCircularDependency("D", "A", deps)).toBe(true);
  });

  it("detects a cycle in a branching graph (diamond)", () => {
    // A → B, A → C, B → D, C → D. Adding D → A closes two paths back.
    const deps: DependencyGraph = { A: ["B", "C"], B: ["D"], C: ["D"] };
    expect(detectCircularDependency("D", "A", deps)).toBe(true);
  });

  it("detects an indirect cycle when the path branches mid-way", () => {
    // A depends on B and C; B depends on D; D depends on E.
    // Adding E → A creates A → B → D → E → A.
    const deps: DependencyGraph = { A: ["B", "C"], B: ["D"], D: ["E"] };
    expect(detectCircularDependency("E", "A", deps)).toBe(true);
  });

  // ── valid dependencies (no cycle) ───────────────────────────────────────────

  it("returns false when allDeps is empty", () => {
    expect(detectCircularDependency("A", "B", {})).toBe(false);
  });

  it("returns false for a simple valid edge with no prior deps", () => {
    const deps: DependencyGraph = { A: ["B"] };
    // C → A is safe; A does not depend on C.
    expect(detectCircularDependency("C", "A", deps)).toBe(false);
  });

  it("returns false for a completely disjoint second chain", () => {
    // Existing: A → B. New edge C → D is in a separate subgraph.
    const deps: DependencyGraph = { A: ["B"] };
    expect(detectCircularDependency("C", "D", deps)).toBe(false);
  });

  it("returns false when dependsOnId is a leaf with no outgoing edges", () => {
    // B has no dependencies; adding A → B is always safe.
    const deps: DependencyGraph = { A: ["C"] };
    expect(detectCircularDependency("A", "B", deps)).toBe(false);
  });

  it("returns false for extending a valid chain (A → B → C, add D → C)", () => {
    const deps: DependencyGraph = { A: ["B"], B: ["C"] };
    expect(detectCircularDependency("D", "C", deps)).toBe(false);
  });

  it("returns false for a diamond where no cycle is introduced", () => {
    // A → B, A → C, B → D, C → D. Adding E → D is valid.
    const deps: DependencyGraph = { A: ["B", "C"], B: ["D"], C: ["D"] };
    expect(detectCircularDependency("E", "D", deps)).toBe(false);
  });

  // ── graph traversal robustness ───────────────────────────────────────────────

  it("does not revisit nodes (handles shared ancestors without infinite loop)", () => {
    // Both B and C point to D; ensure visited set prevents re-traversal.
    const deps: DependencyGraph = { A: ["B", "C"], B: ["D"], C: ["D"], D: [] };
    // Adding E → A: A doesn't reach E, so safe.
    expect(detectCircularDependency("E", "A", deps)).toBe(false);
  });

  it("handles a task whose entry in allDeps is an empty array", () => {
    const deps: DependencyGraph = { A: [] };
    expect(detectCircularDependency("B", "A", deps)).toBe(false);
  });

  it("handles a task entirely absent from allDeps as dependsOnId", () => {
    const deps: DependencyGraph = { A: ["B"] };
    // Z is not in allDeps at all; treated as having no dependencies.
    expect(detectCircularDependency("A", "Z", deps)).toBe(false);
  });

  it("does not mutate allDeps", () => {
    const deps: DependencyGraph = { A: ["B"] };
    const before = JSON.stringify(deps);
    detectCircularDependency("B", "A", deps);
    expect(JSON.stringify(deps)).toBe(before);
  });
});
