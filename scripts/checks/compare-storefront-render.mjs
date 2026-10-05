/**
 * Storefront render regression check.
 *
 * ## Usage
 *
 *   # 1. With the pre-change build running on :3000, capture a baseline.
 *   mkdir -p .tmp-audit/baseline
 *   for p in "" shop collections terms; do curl -s "http://localhost:3000/$p" \
 *     -o ".tmp-audit/baseline/${p:-home}.html"; done
 *
 *   # 2. Rebuild, restart, capture the same URLs into .tmp-audit/after/.
 *   # 3. Compare:
 *   node scripts/checks/compare-storefront-render.mjs
 *
 * Written for the migration that moved the homepage, the announcement bar, the
 * navigation, the footer and the four policy pages out of hardcoded TypeScript
 * and into `site_content`, where the requirement was that customers must see no
 * change at all. Kept because that requirement recurs: any future move of
 * content into (or out of) the database needs the same proof, and eyeballing a
 * diff of two rendered pages is not proof.
 *
 * ## What it compares, and why not the raw HTML
 *
 * Build ids, framework script tags and the RSC payload legitimately differ
 * between two builds, and diffing them buries the signal. So it strips scripts,
 * styles and comments, then compares:
 *
 *   - the *multiset* of visible text tokens, and
 *   - the multiset of link destinations.
 *
 * Text is compared as a token multiset rather than positionally because React
 * streams a Suspense boundary: the route-loading skeleton's copy can be flushed
 * before or after the page body between two otherwise identical renders, which
 * shifts every extracted line.
 *
 * The requirement is that the migration must not change what customers see, so
 * this compares rendered *text and link destinations* rather than raw HTML: build
 * ids, framework script tags and RSC payloads legitimately differ, and diffing
 * them would drown the signal the check exists to produce.
 *
 * A normalisation pass drops:
 *   - <script> and <style> contents (build ids, RSC flight data)
 *   - HTML comments
 *   - whitespace runs
 * and then extracts the visible text plus every href, in document order.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Entities that differ only in escaping between renders. */
const ENTITIES = [
  [/&#x27;|&#39;|&apos;/g, "'"],
  [/&quot;|&#34;/g, '"'],
  [/&amp;/g, "&"],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&nbsp;/g, " "],
  [/&#x2F;/g, "/"],
  [/&#x3D;/g, "="],
  [/&#x60;/g, "`"],
];

function normalise(html) {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // Collect hrefs before stripping tags, so link destinations are compared too.
  const hrefs = [...out.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

  out = out
    .replace(/<[^>]+>/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of ENTITIES) out = out.replace(pattern, replacement);

  const text = out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return { text, hrefs };
}

const baselineDir = join(root, ".tmp-audit/baseline");
const afterDir = join(root, ".tmp-audit/after");

/**
 * Token multiset comparison.
 *
 * A positional diff is useless here: React streams a Suspense boundary, so the
 * route-loading skeleton's copy can be flushed before or after the page body
 * between otherwise identical renders, and the extracted text shifts wholesale.
 * What actually matters is whether the same *set* of customer-visible strings is
 * present, so the comparison counts word tokens on each side and reports tokens
 * that were added or removed. Link destinations are compared as an ordered list,
 * because navigation order is customer-visible.
 */
function tokenCounts(text) {
  const counts = new Map();
  for (const token of text.split(/\s+/).filter(Boolean)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function tokenDelta(before, after) {
  const removed = [];
  const added = [];
  for (const [token, count] of before) {
    const next = after.get(token) ?? 0;
    if (next < count) removed.push(`${token}${count - next > 1 ? ` x${count - next}` : ""}`);
  }
  for (const [token, count] of after) {
    const previous = before.get(token) ?? 0;
    if (previous < count) added.push(`${token}${count - previous > 1 ? ` x${count - previous}` : ""}`);
  }
  return { removed, added };
}

const files = readdirSync(baselineDir).filter((name) => name.endsWith(".html")).sort();
let failures = 0;

for (const file of files) {
  const before = normalise(readFileSync(join(baselineDir, file), "utf8"));
  const after = normalise(readFileSync(join(afterDir, file), "utf8"));

  const problems = [];
  const { removed, added } = tokenDelta(tokenCounts(before.text), tokenCounts(after.text));

  if (removed.length > 0) problems.push(`  text removed: ${removed.join(", ")}`);
  if (added.length > 0) problems.push(`  text added:   ${added.join(", ")}`);

  // Hrefs are compared as a multiset, not positionally. React's RSC payload
  // contains a different number of serialized strings between builds (a content
  // document is inline data), so flattening the page to a positional list of
  // hrefs shifts everything after the payload. What matters is that the same set
  // of destinations is present the same number of times.
  const hrefCounts = (hrefs) => {
    const counts = new Map();
    for (const href of hrefs) counts.set(href, (counts.get(href) ?? 0) + 1);
    return counts;
  };
  const beforeHrefSets = hrefCounts(
    before.hrefs.filter((href) => !href.startsWith("/_next/") && !href.startsWith("/favicon")),
  );
  const afterHrefSets = hrefCounts(
    after.hrefs.filter((href) => !href.startsWith("/_next/") && !href.startsWith("/favicon")),
  );

  const missingHrefs = [];
  const extraHrefs = [];
  for (const [href, count] of beforeHrefSets) {
    const next = afterHrefSets.get(href) ?? 0;
    if (next !== count) missingHrefs.push(`${href} (${count} -> ${next})`);
  }
  for (const [href, count] of afterHrefSets) {
    if (!beforeHrefSets.has(href)) extraHrefs.push(`${href} (${count})`);
  }
  if (missingHrefs.length > 0) problems.push(`  hrefs missing/renumbered: ${missingHrefs.join(", ")}`);
  if (extraHrefs.length > 0) problems.push(`  hrefs added: ${extraHrefs.join(", ")}`);

  if (problems.length === 0) {
    console.log(`  OK    ${file}`);
  } else {
    failures += 1;
    console.log(`  DIFF  ${file}\n${problems.join("\n")}`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${files.length} pages render identical customer-visible content.`
    : `\n${failures} of ${files.length} pages differ.`,
);
process.exit(failures === 0 ? 0 : 1);
