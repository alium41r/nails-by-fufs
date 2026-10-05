import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Stage timing for the public catalogue read.
 *
 * ## The question this answers
 *
 * A catalogue **cache miss** was measured to add ~190–700 ms to a production
 * response, yet `pg_stat_statements` shows the three catalogue queries executing
 * in 0.03–0.10 ms each on the database. So the time is not query execution. It
 * has to be attributed inside the function: waiting for a pooled connection,
 * opening a connection (TCP + TLS + Supavisor authentication), deserializing a
 * cache hit, and the in-process transformation. This records exactly those.
 *
 * ## Safety
 *
 * Collection is **opt-in per request** via the `x-nbf-timing: 1` request header,
 * so an ordinary visitor's request does no timing work and no sample exists.
 * Completed samples are held in a bounded in-process ring buffer.
 *
 * Only durations and small counters are ever stored. *No* SQL text, bound
 * parameters, row values, error messages, connection strings or user identifiers
 * are captured, so a sample contains nothing sensitive. `DATABASE_URL` and every
 * other secret are never read here.
 *
 * The readout endpoint (`src/app/api/timing/route.ts`) can additionally be
 * disabled entirely — see `TIMING_ENDPOINT_ENV`.
 */

/** A request must carry this header, set to `1`, for a sample to be collected. */
export const TIMING_REQUEST_HEADER = "x-nbf-timing";

/**
 * Set this to `1` to make the readout endpoint available.
 *
 * It is off unless explicitly enabled, so a deployed build exposes nothing by
 * default and the endpoint cannot be discovered and read uninvited.
 */
export const TIMING_ENDPOINT_ENV = "NBF_CATALOGUE_TIMING";

/** How many completed samples to retain in the process. */
const RING_SIZE = 200;

interface Sample {
  stages: Map<string, number>;
  counters: Map<string, number>;
  startedAt: number;
}

/** The sample for the request currently being served. */
const storage = new AsyncLocalStorage<Sample>();

/**
 * Recent completed samples, oldest first. Bounded.
 *
 * Held on `globalThis` rather than in a module-level binding: Next.js compiles
 * route handlers and page components into separate bundles, so a module-scoped
 * array gives each its own copy and the readout endpoint would always see an
 * empty buffer even while the page was recording. `globalThis` is per Node
 * process, so both bundles observe the same buffer. This is the same reason the
 * Prisma client is cached there in `@/lib/prisma/db`.
 */
const globalForTiming = globalThis as unknown as {
  __nbfCatalogueTiming?: Array<Record<string, number | string>>;
};
const completed: Array<Record<string, number | string>> =
  (globalForTiming.__nbfCatalogueTiming ??= []);

/**
 * True when the timing harness is switched on.
 *
 * Collection requires *both* `NBF_CATALOGUE_TIMING=1` in the environment and the
 * `x-nbf-timing: 1` request header. A deployed build therefore does no timing
 * work at all unless it was deliberately enabled, and even then only for requests
 * that ask for it — instrumentation cannot be left running by accident.
 */
export function timingEnabled(): boolean {
  return process.env[TIMING_ENDPOINT_ENV] === "1";
}

/** Begins a sample for this request. No-op when one is already active. */
export function beginTiming(): void {
  if (storage.getStore()) return;
  storage.enterWith({ stages: new Map(), counters: new Map(), startedAt: performance.now() });
}

/** True when the current request is being sampled. */
export function isTiming(): boolean {
  return storage.getStore() !== undefined;
}

/** Records or accumulates a stage duration, in milliseconds, to 0.1 ms. */
export function recordStage(name: string, ms: number): void {
  const sample = storage.getStore();
  if (!sample) return;
  const previous = sample.stages.get(name) ?? 0;
  sample.stages.set(name, Math.round((previous + ms) * 10) / 10);
}

/** Increments an event counter. */
export function recordCount(name: string, delta = 1): void {
  const sample = storage.getStore();
  if (!sample) return;
  sample.counters.set(name, (sample.counters.get(name) ?? 0) + delta);
}

/**
 * True when a query stage has been recorded in this sample.
 *
 * The query stages run only when the data cache did not satisfy the read, so
 * their presence *is* the miss signal — no separate flag or second clock needed.
 */
export function queryStagesRecorded(): boolean {
  const sample = storage.getStore();
  if (!sample) return false;
  for (const name of sample.stages.keys()) {
    if (name.startsWith("q-")) return true;
  }
  return false;
}

/** Times an operation as a named stage and returns its result. */
export async function timeStage<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (!isTiming()) return fn();
  const started = performance.now();
  try {
    return await fn();
  } finally {
    recordStage(name, performance.now() - started);
  }
}

/**
 * Files the current sample for readout. Returns false when nothing was sampled.
 *
 * Called as soon as the measured read completes, deliberately **not** from a
 * Next.js `after()` callback: `after()` runs in a detached async context, so the
 * request-scoped store is no longer visible and the sample would be dropped
 * silently. Finishing inline also means the reported `total` is the catalogue
 * read itself rather than the whole response — which is the quantity being
 * attributed.
 */
export function finishTiming(): boolean {
  const sample = storage.getStore();
  if (!sample) return false;

  const row: Record<string, number | string> = {
    outcome: queryStagesRecorded() ? "miss" : "hit",
    total: Math.round((performance.now() - sample.startedAt) * 10) / 10,
  };
  for (const [name, ms] of sample.stages) row[name] = ms;
  for (const [name, count] of sample.counters) row[name] = count;

  completed.push(row);
  if (completed.length > RING_SIZE) completed.shift();

  sample.stages.clear();
  sample.counters.clear();
  return true;
}

/** Recent samples, newest last. */
export function recentSamples(): Array<Record<string, number | string>> {
  return [...completed];
}

/** Empties the buffer, so a measurement run can start from a known state. */
export function clearSamples(): void {
  completed.length = 0;
}

export interface StageStats {
  count: number;
  min: number;
  median: number;
  max: number;
  /** Share of the mean `total`, as a percentage, for stages that are durations. */
}

/** Aggregates one numeric field across samples. */
function statsFor(samples: Array<Record<string, number | string>>, key: string): StageStats | null {
  const values = samples
    .map((s) => s[key])
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Per-stage aggregate over the buffered samples, split by cache outcome.
 *
 * Duration stages are reported **per outcome**, because a hit and a miss have
 * completely different shapes: on a hit no query or pool stage runs at all, so
 * pooling the two would drag every median toward zero and hide the cost being
 * investigated. `pctOfTotal` is therefore a stage's share of the median total for
 * the same outcome.
 */
export function timingReport(): {
  samples: number;
  hits: number;
  misses: number;
  byOutcome: Record<"hit" | "miss", { samples: number; total: StageStats | null; stages: Record<string, StageStats & { pctOfTotal?: number }> }>;
} {
  const hits = completed.filter((s) => s.outcome === "hit");
  const misses = completed.filter((s) => s.outcome === "miss");

  const build = (pool: Array<Record<string, number | string>>) => {
    const keys: string[] = [];
    for (const sample of pool) {
      for (const key of Object.keys(sample)) {
        if (key !== "outcome" && !keys.includes(key)) keys.push(key);
      }
    }
    const totalMedian = statsFor(pool, "total")?.median ?? 0;
    const stages: Record<string, StageStats & { pctOfTotal?: number }> = {};
    for (const key of keys) {
      const st = statsFor(pool, key);
      if (!st) continue;
      stages[key] = st;
      if (totalMedian > 0 && key !== "total") {
        stages[key].pctOfTotal = Math.round((st.median / totalMedian) * 1000) / 10;
      }
    }
    return { samples: pool.length, total: statsFor(pool, "total"), stages };
  };

  return {
    samples: completed.length,
    hits: hits.length,
    misses: misses.length,
    byOutcome: { hit: build(hits), miss: build(misses) },
  };
}
