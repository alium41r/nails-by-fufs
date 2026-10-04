#!/usr/bin/env node
/**
 * Runs a Prisma CLI command with the database connection verified over TLS.
 *
 * ## Why this wrapper exists
 *
 * `prisma db pull` reads its connection string straight from the environment and
 * the schema is the source of truth for drift checks, so this path must be as
 * trustworthy as the runtime one — it authenticates with the same database
 * password. The connection strings in `.env` carry `sslmode=require`, which
 * libpq (and therefore Prisma's connector) interprets as "encrypt, do not
 * verify".
 *
 * This script rewrites the URL to `sslmode=verify-full` and points Node's trust
 * store at the committed Supabase root CA via `NODE_EXTRA_CA_CERTS`, so the
 * certificate chain is actually validated. If verification fails the command
 * fails, rather than silently falling back.
 *
 * ## Usage
 *
 *   node scripts/prisma-verified.mjs db pull --print
 *   node scripts/prisma-verified.mjs validate
 *
 * `npm run db:pull` and `npm run db:validate` use it. `prisma migrate` remains
 * forbidden in this repository: Supabase SQL migrations are the schema authority.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import "dotenv/config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const caPath = join(root, "certs", "supabase-root-2021.crt");

const [command, ...rest] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/prisma-verified.mjs <prisma command> [args...]");
  process.exit(2);
}

if (command === "migrate" || command === "db" ) {
  // `db` is allowed (db pull/execute are read/introspection oriented), but
  // migrations are not: Supabase SQL migrations own the schema.
  if (rest[0] === "push" || rest[0] === "seed") {
    console.error(
      `Refusing to run "prisma ${command} ${rest[0]}". Supabase SQL migrations under ` +
        "supabase/migrations are the schema authority; never use prisma migrate or db push.",
    );
    process.exit(1);
  }
}
if (command === "migrate") {
  console.error(
    "Refusing to run prisma migrate. Supabase SQL migrations under supabase/migrations " +
      "are the schema authority.",
  );
  process.exit(1);
}

if (!existsSync(caPath)) {
  console.error(`Refusing to run: Supabase root CA missing at ${caPath}.`);
  process.exit(1);
}

/** Rewrites a libpq URL so the provider verifies the server certificate. */
function withVerifiedTls(url) {
  if (!url) return url;
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.delete("uselibpqcompat");
  params.set("sslmode", "verify-full");

  // Absolute path: the connector does not expand `~`.
  params.set("sslrootcert", caPath);
  return `${base}?${params.toString()}`;
}

const env = { ...process.env, NODE_EXTRA_CA_CERTS: caPath };
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  if (process.env[key]) env[key] = withVerifiedTls(process.env[key]);
}

const cli = join(root, "node_modules", ".bin", "prisma");

try {
  execFileSync(cli, [command, ...rest], { stdio: "inherit", env, cwd: root });
} catch (error) {
  if (error?.status) process.exit(error.status);
  console.error(error?.message ?? String(error));
  process.exit(1);
}
