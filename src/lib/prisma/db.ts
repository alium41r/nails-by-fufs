import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

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

  // Serverless-sized pool. `pg` defaults to `max: 10` per instance, which across
  // many short-lived Vercel functions holds far more Supavisor connections open
  // than this app needs; Supabase's serverless guidance is to shrink Prisma's
  // connection limit, which under the pg driver adapter is the pool `max`.
  // 3 is deliberately below the default: it covers the widest parallel read in
  // the catalogue layer (two queries) plus headroom for a transaction.
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 3 }),
  });
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
