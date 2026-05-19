/**
 * Represents the existing dependency graph as a map from each task ID to the
 * array of task IDs it directly depends on (i.e. must complete first).
 *
 * Example: `{ "A": ["B", "C"], "B": ["D"] }` means A depends on B and C,
 * and B depends on D.
 */
export type DependencyGraph = Record<string, string[]>;

/**
 * Determines whether adding a new dependency edge would introduce a cycle.
 *
 * A dependency `taskId → dependsOnId` means "taskId cannot start until
 * dependsOnId is DONE". Adding this edge creates a cycle when there is
 * already a directed path from `dependsOnId` back to `taskId` through
 * the existing graph — i.e. `dependsOnId` (directly or transitively)
 * already depends on `taskId`.
 *
 * Uses iterative depth-first search (DFS) so it is safe for arbitrarily
 * deep graphs with no risk of a call-stack overflow. Neighbors are pushed
 * unconditionally; the `visited` set at the top of each iteration prevents
 * re-processing and ensures both branches of the visited-check are reachable.
 *
 * @param taskId      - The task that wants to gain a new dependency.
 * @param dependsOnId - The task that `taskId` would depend on.
 * @param allDeps     - The current dependency graph (not mutated).
 * @returns `true` if the proposed edge would create a cycle; `false` otherwise.
 *
 * @example
 * // Direct cycle: A → B already exists, adding B → A is rejected.
 * detectCircularDependency("B", "A", { A: ["B"] }); // true
 *
 * @example
 * // Indirect cycle: A → B → C already exists, adding C → A is rejected.
 * detectCircularDependency("C", "A", { A: ["B"], B: ["C"] }); // true
 *
 * @example
 * // Valid dependency: no path from D back to C exists.
 * detectCircularDependency("C", "D", { A: ["B"], B: ["C"] }); // false
 */
export function detectCircularDependency(
  taskId: string,
  dependsOnId: string,
  allDeps: DependencyGraph
): boolean {
  // A task cannot depend on itself.
  if (taskId === dependsOnId) return true;

  // Iterative DFS: starting from dependsOnId, follow existing dependency edges.
  // If we reach taskId, the proposed edge closes a cycle.
  const visited = new Set<string>();
  const stack: string[] = [dependsOnId];

  while (stack.length > 0) {
    const current = stack.pop()!;

    // Skip nodes already fully explored (handles duplicates in the stack when
    // the same node is reachable via multiple paths).
    if (visited.has(current)) continue;

    if (current === taskId) return true;
    visited.add(current);

    // Push all neighbors unconditionally; the visited check above handles
    // deduplication and prevents re-processing.
    const neighbors = allDeps[current] ?? [];
    for (const neighbor of neighbors) {
      stack.push(neighbor);
    }
  }

  return false;
}
