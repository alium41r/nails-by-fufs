
import { describe, expect, it } from "vitest";

import { CONTENT_FIELD_GROUPS, fieldGroupsFor } from "@/components/studio/content-fields";
import {
  CONTENT_KEYS,
  DEFAULT_SITE_CONTENT,
  POLICY_SLUGS,
  policyKey,
} from "@/lib/site-content-schema";
import { readContentValue } from "@/lib/studio/content";

/**
 * Keeps the Studio content form in step with the content schema.
 *
 * ## The failure this prevents
 *
 * The Studio editor used to render raw JSON, which could never fall out of step
 * with the schema and could never lose a field. Replacing it with a form trades
 * that guarantee for something a person can actually use — so the guarantee has
 * to be re-established by a test.
 *
 * Without this, adding `home.hero.subheading` to the schema would leave it
 * invisible in the editor: the owner would have no way to edit it, and nothing
 * would report that. These assertions turn that into a failing test.
 *
 * The other direction matters too — a label pointing at a path that does not
 * exist would render a permanently empty input, which looks like the field is
 * broken rather than missing.
 */

/** Reads a dotted path out of a value. An empty path is the value itself. */
function readPath(source: unknown, path: string): unknown {
  if (path === "") return source;
  let cursor: unknown = source;
  for (const segment of path.split(".")) {
    if (cursor === null || cursor === undefined || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/** Every leaf path in a value, as dotted paths. Arrays are not descended into. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    paths.push(...leafPaths(child, prefix ? `${prefix}.${key}` : key));
  }
  return paths;
}

/** The document keys the Studio panel can open. */
const DOCUMENT_KEYS = [
  CONTENT_KEYS.announcement,
  CONTENT_KEYS.identity,
  CONTENT_KEYS.contact,
  CONTENT_KEYS.socials,
  CONTENT_KEYS.navMain,
  CONTENT_KEYS.navMobile,
  CONTENT_KEYS.navFooter,
  CONTENT_KEYS.newsletter,
  CONTENT_KEYS.hero,
  CONTENT_KEYS.featuredCollection,
  CONTENT_KEYS.productPreview,
  CONTENT_KEYS.customFeature,
  CONTENT_KEYS.howItWorks,
  CONTENT_KEYS.gallery,
  CONTENT_KEYS.finalCta,
  CONTENT_KEYS.homeNewsletter,
  CONTENT_KEYS.faq,
  ...POLICY_SLUGS.map(policyKey),
];

describe("studio content form covers every document", () => {
  it("describes every document the Studio panel can open", () => {
    for (const key of DOCUMENT_KEYS) {
      expect(fieldGroupsFor(key), `${key} has no field description`).not.toBeNull();
      expect(fieldGroupsFor(key)?.length, `${key} has no groups`).toBeGreaterThan(0);
    }
  });

  it("describes nothing that is not a real document", () => {
    for (const key of Object.keys(CONTENT_FIELD_GROUPS)) {
      expect(DOCUMENT_KEYS, `${key} is described but is not an editable document`).toContain(key);
    }
  });

  it("points every labelled field at a path that exists in the document", () => {
    for (const key of DOCUMENT_KEYS) {
      const value = readContentValue(DEFAULT_SITE_CONTENT, key);
      for (const group of fieldGroupsFor(key) ?? []) {
        for (const field of group.fields) {
          // A repeating block is addressed by its array path, which resolves to
          // an array rather than to a leaf.
          const resolved = readPath(value, field.path);
          expect(
            resolved,
            `${key} → ${field.path} ("${field.label}") does not exist in the document`,
          ).not.toBeUndefined();
        }
      }
    }
  });
});

describe("studio content form exposes every editable value", () => {
  /**
   * Every leaf in the document must be reachable from the form.
   *
   * A leaf is covered when a labelled field names it exactly, or when it sits
   * inside an array addressed by a `records` / `list` field — those render their
   * own per-row inputs.
   */
  it("leaves no value uneditable", () => {
    for (const key of DOCUMENT_KEYS) {
      const value = readContentValue(DEFAULT_SITE_CONTENT, key);
      const specs = (fieldGroupsFor(key) ?? []).flatMap((group) => group.fields);

      const exact = new Set(specs.map((spec) => spec.path));
      const containerPaths = specs
        .filter((spec) => spec.kind === "records" || spec.kind === "list" || spec.kind === "image")
        .map((spec) => spec.path);

      const uncovered = leafPaths(value).filter((path) => {
        if (exact.has(path)) return false;
        if (Array.isArray(readPath(value, path))) return false;
        // Covered by a repeating/array field higher up the path.
        return !containerPaths.some(
          (container) => path === container || path.startsWith(`${container}.`),
        );
      });

      expect(
        uncovered,
        `${key} has values the form cannot edit: ${uncovered.join(", ")}`,
      ).toEqual([]);
    }
  });
});
