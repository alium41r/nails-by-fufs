import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Verified TLS for the database connection.
 *
 * ## The problem with `sslmode=require`
 *
 * Supabase's connection strings use `sslmode=require`, which in libpq semantics
 * means "encrypt, but do not verify the certificate". `node-postgres` resolves it
 * to `ssl: { rejectUnauthorized: false }`, so the connection is protected against
 * passive eavesdropping but NOT against an active man-in-the-middle presenting
 * its own certificate. That is a real gap for a connection carrying the database
 * password and every customer record.
 *
 * ## What this does instead
 *
 * The Supabase root CA is pinned and passed as `ca` with
 * `rejectUnauthorized: true`, so the chain is actually validated: the pooler must
 * present a certificate issued by Supabase Root 2021 (`*.pooler.supabase.com`)
 * and the handshake fails otherwise.
 *
 * The certificate is committed on purpose — it is a public trust anchor, not a
 * secret. Its fingerprint is recorded in the file's header, and Supabase publishes
 * the same certificate in the dashboard under SSL configuration.
 *
 * ## Verified behaviour
 *
 * `sslmode=verify-full` is what Supabase documents for psql; passing the CA
 * explicitly is the equivalent for a driver that does not read `sslrootcert`.
 * Both poolers were confirmed to accept and complete a verified handshake.
 */

const CA_PATH = join(process.cwd(), "certs", "supabase-root-2021.crt");

let cachedCa: string | undefined;

function loadRootCa(): string | undefined {
  if (cachedCa !== undefined) return cachedCa;

  try {
    cachedCa = readFileSync(CA_PATH, "utf8");
  } catch {
    // A missing file must not take the site down; the caller decides what to do.
    cachedCa = undefined;
  }

  return cachedCa;
}

/**
 * Strips libpq-style ssl parameters from a connection string.
 *
 * They would otherwise conflict with the explicit `ssl` object: `pg` parses
 * `sslmode` itself and a leftover `uselibpqcompat` changes how it interprets
 * `require`, so the URL is reduced to host/credentials and TLS is configured
 * solely by the object below.
 */
export function connectionStringWithoutSslParams(connectionString: string): string {
  const [base, query] = connectionString.split("?");
  if (!query) return connectionString;

  const params = new URLSearchParams(query);
  for (const key of ["sslmode", "ssl", "uselibpqcompat", "sslrootcert", "sslcert", "sslkey"]) {
    params.delete(key);
  }

  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

export interface DatabaseSslConfig {
  ca?: string;
  rejectUnauthorized: boolean;
  /** Sent in the TLS SNI extension; keeps the certificate hostname match honest. */
  servername?: string;
}

/**
 * Returns the TLS configuration for a database connection string.
 *
 * Export so both the runtime client and the Prisma CLI path can share it, and so
 * the behaviour is unit-testable without a database.
 *
 * When the CA cannot be read the connection still uses TLS with
 * `rejectUnauthorized: false`, which is the previous behaviour — noisily, because
 * silently downgrading verification is how a hardening regression goes unnoticed.
 * `assertDatabaseTlsIsVerified()` is what turns that into a startup failure in
 * production.
 */
export function databaseSslConfig(connectionString: string): DatabaseSslConfig {
  const ca = loadRootCa();
  const host = safeHostname(connectionString);

  if (!ca) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[db] Supabase root CA not readable at ${CA_PATH}; falling back to unverified TLS. ` +
          "Restore certs/supabase-root-2021.crt.",
      );
    }
    return { rejectUnauthorized: false, ...(host ? { servername: host } : {}) };
  }

  return { ca, rejectUnauthorized: true, ...(host ? { servername: host } : {}) };
}

function safeHostname(connectionString: string): string | undefined {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return undefined;
  }
}

let reported = false;

/**
 * Records, once per process, whether the database connection is verified.
 *
 * Called while building the client. It does not throw: a build-time import in an
 * environment without the certificate must not break `next build`, and the
 * explicit production error above already makes the downgrade visible in logs.
 */
export function reportDatabaseTlsMode(verified: boolean) {
  if (reported) return;
  reported = true;

  if (verified) {
    console.info("[db] TLS verification enabled (Supabase Root 2021 CA pinned).");
  } else if (process.env.NODE_ENV === "production") {
    console.error("[db] TLS verification DISABLED — the connection is encrypted but unverified.");
  }
}
