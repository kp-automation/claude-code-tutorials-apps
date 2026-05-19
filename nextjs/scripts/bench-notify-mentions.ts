/**
 * Benchmark: notifyMentions insert strategy
 *
 * Compares the old sequential approach (for...await loop) against the new
 * parallel approach (Promise.all) using a simulated DB round-trip latency.
 *
 * Run with:  npx tsx scripts/bench-notify-mentions.ts
 */

const DB_LATENCY_MS = 20; // realistic single-query round trip (local SQLite ~5ms, remote Postgres ~20ms)
const ITERATIONS = 5;     // repeat each scenario to reduce noise

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateUserQuery(mentionCount: number): Promise<void> {
  // Old: fetches entire user table; new: fetches only ~mentionCount rows.
  // We model both as a single query (same round trip cost) — the difference
  // is data transfer volume, not latency, for small teams.
  await delay(DB_LATENCY_MS);
}

async function sequentialInserts(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await delay(DB_LATENCY_MS);
  }
}

async function parallelInserts(count: number): Promise<void> {
  await Promise.all(Array.from({ length: count }, () => delay(DB_LATENCY_MS)));
}

async function bench(
  label: string,
  fn: () => Promise<void>,
): Promise<number> {
  // Warm up
  await fn();

  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  console.log(`  ${label.padEnd(40)} avg=${avg.toFixed(1)}ms  min=${min.toFixed(1)}ms  max=${max.toFixed(1)}ms`);
  return avg;
}

async function run(): Promise<void> {
  console.log(`\nnotifyMentions — insert strategy benchmark`);
  console.log(`Simulated DB latency per call: ${DB_LATENCY_MS}ms | Iterations: ${ITERATIONS}\n`);

  for (const mentions of [1, 3, 5, 10]) {
    console.log(`── ${mentions} mention${mentions === 1 ? "" : "s"} ──`);

    const oldAvg = await bench(
      `OLD  (query all users + serial inserts)`,
      async () => {
        await simulateUserQuery(mentions);      // 1 query, returns all N users
        await sequentialInserts(mentions);      // N sequential inserts
      },
    );

    const newAvg = await bench(
      `NEW  (filtered query + parallel inserts)`,
      async () => {
        await simulateUserQuery(mentions);      // 1 query, returns ~mentions rows
        await parallelInserts(mentions);        // 1 parallel "round" of N inserts
      },
    );

    const saved = oldAvg - newAvg;
    const pct = ((saved / oldAvg) * 100).toFixed(0);
    console.log(`  Savings: ${saved.toFixed(1)}ms (${pct}% faster)\n`);
  }

  console.log(`Notes:`);
  console.log(`  - Query savings (fetching fewer rows) are not modelled — they reduce`);
  console.log(`    data transfer but add negligible latency for small teams.`);
  console.log(`  - Parallel insert savings scale linearly with mention count.`);
  console.log(`  - Real-world improvement depends on DB round-trip time; remote DBs`);
  console.log(`    (20-100ms per call) benefit most from parallelisation.\n`);
}

run().catch(console.error);
