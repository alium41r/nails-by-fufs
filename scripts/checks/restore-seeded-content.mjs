#!/usr/bin/env node
/**
 * Repairs a `site_content` row back to the value the migration seeded.
 *
 * ## Why this exists
 *
 * The live E2E suites write real content and restore it from a snapshot taken at
 * the start of the run. That is correct — including restoring a *bad* starting
 * state, which is what makes the suites non-destructive. The consequence is that
 * if a run is killed mid-flight (a timeout, Ctrl-C, a crashed DB connection), the
 * snapshot it restores on the next run is the damaged state, so the damage
 * becomes sticky: each later run faithfully preserves it.
 *
 * That is exactly what happened to `site.announcement`, which was left with empty
 * `text`. The storefront falls back to the code default, so nothing was visibly
 * broken, but the stored row had drifted from the seed and the fidelity test
 * correctly reported it.
 *
 * ## Why the seed is the source of truth here
 *
 * The migration seed is the canonical record of what the storefront shipped with,
 * and it is already what a fresh database gets. Repairing from it cannot invent
 * content — the values are the ones already in the repository.
 *
 * `supabase db query -f <migration>` does NOT fix this: the seed uses
 * `on conflict (key) do nothing`, so an existing row with a damaged value is left
 * alone. That is deliberate (a re-applied migration must never revert the owner's
 * edits), which is why repairing a single row needs an explicit tool.
 *
 * ## Usage
 *
 *   node scripts/checks/restore-seeded-content.mjs site.announcement
 *   node scripts/checks/restore-seeded-content.mjs --all
 *   node scripts/checks/restore-seeded-content.mjs --check
 *
 * `--check` reports which rows differ from the seed and exits non-zero without
 * writing anything.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEED = join(root, "supabase/migrations/20261005120100_site_content.sql");

/**
 * Order-independent deep equality.
 *
 * `JSON.stringify` comparison reports every row as drifted, because `jsonb` does
 * not preserve key order: the seed's parsed object and the value read back from
 * Postgres differ only in which key comes first. Comparing by value is the only
 * check that means anything here.
 */
function sameJson(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => sameJson(item, b[index]));
  }
  if (typeof a === "object") {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    if (!aKeys.every((key, index) => key === bKeys[index])) return false;
    return aKeys.every((key) => sameJson(a[key], b[key]));
  }
  return false;
}

/**
 * Compares a value after removing fields the parser legitimately normalises.
 *
 * `site.socials` is the case: `parseSiteContent` gives every social link a stable
 * `key` and an explicit `enabled`, so a document that has been *read and written
 * back* through the app carries two fields the seed did not list. That is not
 * drift — the app normalising its own data is the point — so comparing without
 * them is what makes this check worth reading. Everything else must match exactly.
 */
function comparableNormalised(key, value) {
  if (key !== "site.socials" || !Array.isArray(value)) return value;
  // Built explicitly rather than by destructuring-and-discarding, so the
  // "ignore these two" intent is visible without unused-variable suppressions.
  return value.map((entry) => ({
    label: entry.label,
    href: entry.href,
  }));
}

/** Parses the `(key, 'jsonb', '{...}')` tuples out of the seed's INSERT. */
function readSeed() {
  const sql = readFileSync(SEED, "utf8");
  const rows = new Map();
  // Each tuple:  ('key', 'jsonb', '{"json":true}'::jsonb),
  const tuple = /^\s*\('([^']+)',\s*'jsonb',\s*'((?:[^']|'')*)'::jsonb\)/gm;
  for (const match of sql.matchAll(tuple)) {
    rows.set(match[1], JSON.parse(match[2].split("''").join("'")));
  }
  if (rows.size === 0) throw new Error(`no seed rows parsed from ${SEED}`);
  return rows;
}

function readEnv() {
  const text = readFileSync(join(root, ".env"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index).trim()] = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return env;
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const keys = args.filter((arg) => !arg.startsWith("--"));
// `--check` with no keys checks everything, which is the useful default.
const all = args.includes("--all") || (checkOnly && keys.length === 0);

if (!all && keys.length === 0) {
  console.error("usage: restore-seeded-content.mjs <key…> | [--all] [--check]");
  process.exit(2);
}

const seed = readSeed();
const env = readEnv();
const url = new URL(env.DIRECT_URL ?? env.DATABASE_URL);
url.searchParams.delete("sslmode");
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { ca: readFileSync(join(root, "certs/supabase-root-2021.crt"), "utf8"), rejectUnauthorized: true },
});

/**
 * Names the fields that differ, so the report says *what* drifted.
 *
 * A whole-document dump is unreadable for the policy pages, and it buries the one
 * field that actually changed.
 */
function describeDifference(expected, actual) {
  const lines = [];
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      lines.push(`length: seed ${expected.length}, live ${actual.length}`);
    }
    for (let i = 0; i < Math.max(expected.length, actual.length); i += 1) {
      if (!sameJson(expected[i], actual[i])) {
        lines.push(
          `[${i}]: seed=${JSON.stringify(expected[i])?.slice(0, 70) ?? "(absent)"} live=${JSON.stringify(actual[i])?.slice(0, 70) ?? "(absent)"}`,
        );
      }
    }
    return lines;
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    for (const key of [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort()) {
      if (!sameJson(expected[key], actual[key])) {
        lines.push(
          `${key}: seed=${JSON.stringify(expected[key])?.slice(0, 60) ?? "(absent)"} live=${JSON.stringify(actual[key])?.slice(0, 60) ?? "(absent)"}`,
        );
      }
    }
    return lines;
  }
  lines.push(`seed=${JSON.stringify(expected)} live=${JSON.stringify(actual)}`);
  return lines;
}

await client.connect();
const live = await client.query(`select key, value from site_content`);
const liveByKey = new Map(live.rows.map((row) => [row.key, row.value]));

const targets = all ? [...seed.keys()] : keys;
const drifted = [];

for (const key of targets) {
  if (!seed.has(key)) {
    console.error(`  unknown key (not in the seed): ${key}`);
    process.exitCode = 2;
    continue;
  }
  const expected = seed.get(key);
  const actual = liveByKey.get(key);

  if (sameJson(comparableNormalised(key, actual), comparableNormalised(key, expected))) {
    console.log(`  ok       ${key}`);
    continue;
  }

  drifted.push(key);
  if (checkOnly) {
    console.log(`  DRIFTED  ${key}`);
    if (actual === undefined) {
      console.log("             the row is missing entirely");
    } else {
      for (const field of describeDifference(expected, actual)) {
        console.log(`             ${field}`);
      }
    }
    continue;
  }

  await client.query(
    `insert into site_content (key, value_type, value)
     values ($1, 'jsonb', $2::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [key, JSON.stringify(expected)],
  );
  console.log(
    `  restored ${key}` +
      (key === "site.socials" ? " (stable keys are re-added on the next read)" : ""),
  );
}

await client.end();

if (checkOnly && drifted.length > 0) {
  console.error(`\n${drifted.length} row(s) differ from the seed.`);
  process.exit(1);
}
console.log(
  drifted.length === 0 ? "\nNothing to do." : `\nRestored ${drifted.length} row(s) from the seed.`,
);
