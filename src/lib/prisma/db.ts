import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";
import {
  connectionStringWithoutSslParams,
  databaseSslConfig,
  reportDatabaseTlsMode,
} from "@/lib/prisma/tls";
import { recordCount, recordStage } from "@/lib/perf/catalogue-timing";

/**
 * Privileged, server-only Prisma access to the Supabase catalogue.
 *
 * ## This connection BYPASSES the catalogue's Row Level Security
 *
 * It authenticates as the database owner through the Supabase pooler, so none
 * of the policies created in
 * `supabase/migrations/20261004114546_catalog_rls.sql` apply. The public
 * visibility rules those policies enforce — `is_active` on the row *and* on its
 * parent collection — must be re-applied explicitly in every public query.
 * Never treat an RLS-less result as "already filtered".
 *
 * `server-only` makes importing this module from a Client Component a build
 * error, so the privileged client cannot leak into a browser bundle.
 *
 * ## Why the client is created lazily
 *
 * Next.js evaluates server modules during `next build` (static generation). A
 * module-scope configuration check would fail a build that merely *imports*
 * this file while `DATABASE_URL` exists only at runtime, so the client is built
 * on first use and only then reports missing configuration.
 *
 * ## Runtime vs CLI connections
 *
 * - `DATABASE_URL` (here): Supavisor transaction pooler, port 6543 — the right
 *   mode for Vercel's short-lived serverless functions.
 * - `DIRECT_URL` (prisma7.config.ts): session pooler on port 5432, used by the
 *   Prisma CLI for introspection only.
 */

/** Refuse to queue for a pooled connection for longer than this. */
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * How long an unused connection may sit in this instance's pool.
 *
 * Short on purpose: a serverless instance is frequently frozen between requests,
 * and a connection held across a freeze is a Supavisor slot used for nothing.
 */
const IDLE_TIMEOUT_MS = 5_000;

/** Abandon a single query rather than let a stuck one consume the invocation. */
const STATEMENT_TIMEOUT_MS = 15_000;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Missing required environment variable DATABASE_URL. Server-side database " +
        "access needs the Supabase runtime connection string (Supavisor " +
        "transaction pooler, port 6543). Copy .env.example to .env and fill it in; " +
        "never commit real credentials.",
    );
  }

  // Verified TLS: the Supabase root CA is pinned and the chain is actually
  // validated, rather than `sslmode=require`'s "encrypt without verifying".
  const ssl = databaseSslConfig(connectionString);
  reportDatabaseTlsMode(ssl.rejectUnauthorized === true);

  // Serverless-sized pool. `pg` defaults to `max: 10` per instance, which across
  // many short-lived Vercel functions holds far more Supavisor connections open
  // than this app needs; Supabase's serverless guidance is to shrink Prisma's
  // connection limit, which under the pg driver adapter is the pool `max`.
  // 3 is deliberately below the default: it covers the widest parallel read in
  // the catalogue layer (two queries) plus headroom for a transaction.
  //
  // The timeouts matter as much as the ceiling. A connection that cannot be
  // acquired must fail fast rather than hold a serverless invocation open until
  // the platform kills it, and an idle connection should return to the pooler
  // quickly instead of being kept for the driver's 10-second default — a
  // serverless instance is frozen between requests, and a connection held across
  // a freeze is a Supavisor slot used for nothing.
  const pool = new Pool({
    connectionString: connectionStringWithoutSslParams(connectionString),
    max: 3,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    // Per-connection, so a runaway query cannot hold a pooler slot or a
    // serverless invocation indefinitely.
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS,
    ssl,
  });

  // The pool is built here rather than from a config object so it can be
  // observed; `PrismaPg` uses a pool it is handed as-is, so behaviour is
  // unchanged. See `instrumentPool`.
  instrumentPool(pool);

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

/**
 * Attaches sampling hooks to the connection pool.
 *
 * A no-op unless the request is being sampled (see
 * `@/lib/perf/catalogue-timing`), so the ordinary production path is untouched.
 *
 * Two things are recorded, kept distinct so the two causes stay separable:
 *
 * - `pool-acquire` — cumulative wall time spent in `pool.connect()`. This is the
 *   outer bound: it covers both queueing for an existing client and the full
 *   TCP + TLS + Supavisor-authentication path when none is available.
 * - `conn` (count) — how many times the pool actually opened a new connection
 *   during the request, read from the driver's own `connect` event rather than
 *   inferred.
 *
 * Dividing the acquire time by the connection count distinguishes "the pool was
 * contended" from "opening a connection is expensive"; a request that acquires
 * once and opens one connection is pure setup cost, not queueing.
 */
function instrumentPool(pool: Pool): void {
  // Counted from the driver's own `connect` event, which fires only for a real
  // new connection, so the count cannot be inflated by pool reuse.
  pool.on("connect", () => recordCount("conn"));

  const originalConnect = pool.connect.bind(pool);
  pool.connect = ((...args: unknown[]) => {
    const started = performance.now();
    const pending = originalConnect(...(args as []));
    // Record on settle either way: a failed acquisition is still time spent.
    void Promise.resolve(pending).then(
      () => recordStage("pool-acquire", performance.now() - started),
      () => recordStage("pool-acquire", performance.now() - started),
    );
    return pending;
  }) as typeof pool.connect;
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

/**
 * Cached on `globalThis` so Next.js development hot reloads reuse one client
 * (and one connection pool) instead of opening a new pool per module reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

/**
 * Returns the shared Prisma client, creating it on first use.
 *
 * @throws if `DATABASE_URL` is not configured.
 */
export function getPrisma(): PrismaClientSingleton {
  globalForPrisma.prisma ??= createPrismaClient();

  return globalForPrisma.prisma;
}
