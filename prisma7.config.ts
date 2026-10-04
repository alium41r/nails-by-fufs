// Prisma 7 CLI configuration — introspection tooling only.
//
// The filename matters: Prisma 7.10 generates `prisma7.config.ts` and treats it
// as the primary candidate, while `prisma.config.ts` is the legacy candidate it
// also accepts. On a future Prisma 8 upgrade this file is expected to become
// `prisma.config.ts`.
//
// Scope: this exists so `npx prisma db pull` can introspect the live Supabase
// schema into prisma/schema.prisma. Prisma is a derived layer; the Supabase SQL
// migrations remain authoritative, so no `migrations` path is configured here
// on purpose — `prisma migrate` must never run in this repository.
//
// prisma/schema.prisma is 100% generated: `db pull` rewrites the whole file and
// silently drops hand-written comments, so never annotate it and never hand-edit
// its models. Derivation notes like this one belong in files Prisma does not own.
// Keeping it fully generated is also what makes the documented CI drift gate
// (`prisma db pull && git diff --exit-code prisma/schema.prisma`) pass.
//
// Prisma 7 does not load .env files automatically, hence the dotenv import.

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    // CLI / introspection connection.
    //
    // Supabase convention: DIRECT_URL is the session pooler (or direct)
    // connection on port 5432, used for schema work; DATABASE_URL is the
    // transaction pooler on port 6543, used by the app at runtime. Schema
    // commands therefore prefer DIRECT_URL and fall back to DATABASE_URL so a
    // single-variable setup still works.
    //
    // Prisma 7 removed `directUrl` from schema files entirely, so this is the
    // only place a connection URL can be configured for CLI commands.
    //
    // Intentionally allowed to be undefined: `prisma validate` needs no
    // credentials, and no connection string is committed to this repository.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
