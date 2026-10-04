#!/usr/bin/env node
/**
 * Drift gate: fails when prisma/schema.prisma no longer matches the live database.
 *
 * `prisma/schema.prisma` is a derived artifact — `prisma db pull` rewrites the
 * whole file — so the only thing worth checking is whether it is still current.
 * A stale derived schema is how a hand-edit or an out-of-band SQL change goes
 * unnoticed, and it would make the generated client disagree with the database.
 *
 * The introspection runs through `prisma-verified.mjs`, so the connection that
 * reads the schema is TLS-verified.
 *
 * Exit codes: 0 in sync, 1 drift detected, 2 could not introspect.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Drops blank lines and comment-only lines so formatting churn is not drift. */
function normalise(source) {
  return source
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("//");
    })
    .join("\n");
}

const workDir = mkdtempSync(join(tmpdir(), "prisma-drift-"));
const pulledPath = join(workDir, "pulled.prisma");

try {
  const pulled = execFileSync(
    process.execPath,
    [join(root, "scripts", "prisma-verified.mjs"), "db", "pull", "--print"],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  writeFileSync(pulledPath, pulled);
} catch {
  console.error("Could not introspect the database; drift is unknown.");
  rmSync(workDir, { recursive: true, force: true });
  process.exit(2);
}

const committed = normalise(readFileSync(join(root, "prisma", "schema.prisma"), "utf8"));
const live = normalise(readFileSync(pulledPath, "utf8"));
rmSync(workDir, { recursive: true, force: true });

if (committed === live) {
  console.log("No drift: prisma/schema.prisma matches the live database.");
  process.exit(0);
}

const committedLines = committed.split("\n");
const liveLines = live.split("\n");
const differing = [];
for (let i = 0; i < Math.max(committedLines.length, liveLines.length); i += 1) {
  if (committedLines[i] !== liveLines[i]) {
    differing.push(
      `  line ${i + 1}\n    committed: ${committedLines[i] ?? "(end of file)"}\n    live     : ${liveLines[i] ?? "(end of file)"}`,
    );
  }
}

console.error(
  `Drift detected between prisma/schema.prisma and the live database.\n\n` +
    `${differing.slice(0, 20).join("\n")}\n\n` +
    (differing.length > 20 ? `…and ${differing.length - 20} more difference(s).\n\n` : "") +
    "Run `npm run db:sync` and commit the result.",
);
process.exit(1);
