import { beforeAll, afterAll, describe, expect, it } from "vitest";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

import {
  actions,
  setCookieJar,
  clearRevalidated,
  revalidatedUpdates,
} from "./support/driver";
import { authCookie } from "./support/cookie";
import { sessionFor, encodeSessionCookie, adminEmails, assertLiveWritesAllowed } from "./session.mjs";
import {
  CONTENT_KEYS,
  DEFAULT_IDENTITY,
  DEFAULT_POLICIES,
  DEFAULT_SITE_CONTENT,
  POLICY_SLUGS,
  policyKey,
} from "@/lib/site-content-schema";

/**
 * Reversible end-to-end tests for owner-managed content and the catalogue
 * lifecycle.
 *
 * Every write goes through the REAL server action, against the REAL Supabase
 * project, with a REAL admin session in the same cookie the app reads. Nothing
 * about authorisation, validation, link safety or Storage scoping is stubbed —
 * see `driver.ts` for exactly what is substituted (request plumbing only).
 *
 * ## Reversibility
 *
 * The whole `site_content` table and the whole catalogue are captured before the
 * first write and restored in `afterAll`, before *and* after the run, so a
 * previously interrupted run cannot poison the next one. Every row this suite
 * creates is deleted by slug, so nothing it made is left behind.
 */

// Refuses unless E2E_ALLOW_LIVE_WRITES=1.
assertLiveWritesAllowed();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

type Row = Record<string, unknown>;

let baseline: { content: Row[]; products: Row[]; collections: Row[]; images: Row[] };
let adminCookie: string;

const sql = async (text: string, values: unknown[] = []): Promise<Row[]> =>
  (await client.query(text, values)).rows;

/**
 * Reads one content document as stored, typed as an object.
 *
 * `pg` returns `jsonb` already parsed, but the driver's `Row` alias types every
 * column as `unknown`, so the shape is narrowed here once rather than cast at
 * every assertion.
 */
type StoredDocument = Record<string, unknown>;
const contentRow = async (key: string): Promise<{ value: StoredDocument } | undefined> => {
  const row = (await sql(`select key, value from site_content where key = $1`, [key]))[0];
  return row ? { value: row.value as StoredDocument } : undefined;
};

/** Every product/collection slug this suite creates, so cleanup is exact. */
const createdSlugs = new Set<string>();
const createdCollectionSlugs = new Set<string>();
const uploadedPaths = new Set<string>();

/** Captures everything the suite can touch. */
async function capture(): Promise<typeof baseline> {
  return {
    // created_at/updated_at must be captured too: rows are restored by an
    // INSERT, and both columns are NOT NULL, so omitting them fails the restore
    // (and would lose the provenance of the seed rows).
    content: await sql(
      `select key, value, value_type, created_at, updated_at from site_content order by key`,
    ),
    products: await sql(`select * from products order by slug`),
    collections: await sql(`select * from collections order by slug`),
    images: await sql(`select * from product_images order by id`),
  };
}

/** Writes a capture back. */
async function restore(snapshot: typeof baseline): Promise<void> {
  // Rows this suite created are removed by slug first, so the restore cannot
  // collide with a unique index on a slug the baseline also holds.
  for (const slug of createdSlugs) {
    await sql(`delete from products where slug = $1`, [slug]);
  }
  for (const slug of createdCollectionSlugs) {
    await sql(`delete from collections where slug = $1`, [slug]);
  }

  await sql(`delete from product_images`);
  for (const row of snapshot.images) {
    await sql(
      `insert into product_images (id, product_id, storage_path, alt_text, sort_order, is_primary, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [row.id, row.product_id, row.storage_path, row.alt_text, row.sort_order, row.is_primary, row.created_at],
    );
  }

  for (const row of snapshot.collections) {
    await sql(
      `insert into collections (id, slug, title, subtitle, description, tag, featured, display_order, is_active, cover_image_path, created_at, updated_at, archived_at, archive_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (id) do update set
         slug = excluded.slug, title = excluded.title, subtitle = excluded.subtitle,
         description = excluded.description, tag = excluded.tag, featured = excluded.featured,
         display_order = excluded.display_order, is_active = excluded.is_active,
         cover_image_path = excluded.cover_image_path, archived_at = excluded.archived_at,
         archive_note = excluded.archive_note`,
      [
        row.id, row.slug, row.title, row.subtitle, row.description, row.tag, row.featured,
        row.display_order, row.is_active, row.cover_image_path, row.created_at, row.updated_at,
        row.archived_at, row.archive_note,
      ],
    );
  }

  for (const row of snapshot.products) {
    await sql(
      `insert into products (id, collection_id, slug, name, descriptor, description, shape, default_length,
                             finish, tag, featured, display_order, is_active, included, price_minor, currency,
                             created_at, updated_at, archived_at, archive_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       on conflict (id) do update set
         collection_id = excluded.collection_id, slug = excluded.slug, name = excluded.name,
         descriptor = excluded.descriptor, description = excluded.description, shape = excluded.shape,
         default_length = excluded.default_length, finish = excluded.finish, tag = excluded.tag,
         featured = excluded.featured, display_order = excluded.display_order, is_active = excluded.is_active,
         included = excluded.included, price_minor = excluded.price_minor, currency = excluded.currency,
         archived_at = excluded.archived_at, archive_note = excluded.archive_note`,
      [
        row.id, row.collection_id, row.slug, row.name, row.descriptor, row.description, row.shape,
        row.default_length, row.finish, row.tag, row.featured, row.display_order, row.is_active,
        row.included, row.price_minor, row.currency, row.created_at, row.updated_at,
        row.archived_at, row.archive_note,
      ],
    );
  }

  for (const row of snapshot.content) {
    await sql(
      `insert into site_content (key, value_type, value, created_at, updated_at)
       values ($1,$2,$3::jsonb,$4,$5)
       on conflict (key) do update set value = excluded.value`,
      [
        row.key,
        row.value_type,
        // `pg` parses jsonb into a JavaScript value on read, so it has to be
        // re-serialised to be a valid jsonb parameter on write.
        JSON.stringify(row.value),
        row.created_at,
        row.updated_at,
      ],
    );
  }

  // Anything stored that the capture did not know about is a row this run added.
  const known = snapshot.content.map((row) => row.key);
  await sql(`delete from site_content where not (key = any($1::text[]))`, [known]);
}

beforeAll(async () => {
  await client.connect();
  baseline = await capture();

  /*
   * Heal a baseline the previous run damaged, before adopting it.
   *
   * These suites capture the catalogue and `site_content` at the start and write
   * them back at the end, which is what makes them non-destructive. The
   * consequence is that a run killed mid-flight (timeout, Ctrl-C, dropped
   * connection) leaves its *current* state in place, so the next run captures the
   * damage as its baseline and faithfully preserves it.
   *
   * The first attempt at guarding this threw an error here — which was worse than
   * the disease: an exception in `beforeAll` prevents `afterAll` from running, so
   * the damaged snapshot was never restored and every later run kept re-adopting
   * it. A guard that blocks the repair it is asking for is a deadlock.
   *
   * So the baseline is healed instead of refused. Only two fields can be damaged
   * this way and both have an unambiguous intended value: the announcement text
   * must be non-empty, and the default currency is shipped as USD. Nothing is
   * invented — an empty announcement falls back to the wording the storefront
   * already displays, and the currency is the value the migration seeds.
   *
   * `scripts/checks/restore-seeded-content.mjs` is still the general-purpose
   * repair, and `--check` reports deeper drift that this does not cover.
   */
  const contentRow = (key: string) => baseline.content.find((row) => row.key === key);
  const healed: string[] = [];

  const announcement = contentRow("site.announcement");
  if (announcement && typeof announcement.value === "object" && announcement.value !== null) {
    const asRecord = announcement.value as { text?: string };
    if (String(asRecord.text ?? "").trim().length === 0) {
      // The storefront's own fallback, written back so the snapshot is usable.
      asRecord.text = DEFAULT_SITE_CONTENT.announcement.text;
      await sql(
        `update site_content set value = jsonb_set(value, '{text}', to_jsonb($1::text)) where key = 'site.announcement'`,
        [asRecord.text],
      );
      healed.push("site.announcement.text");
    }
  }

  const currency = contentRow("site.currency");
  if (currency && typeof currency.value === "object" && currency.value !== null) {
    const asRecord = currency.value as { default?: string };
    if (asRecord.default !== DEFAULT_SITE_CONTENT.currency.default) {
      asRecord.default = DEFAULT_SITE_CONTENT.currency.default;
      await sql(`update site_content set value = $1::jsonb where key = 'site.currency'`, [
        JSON.stringify(asRecord),
      ]);
      healed.push("site.currency.default");
    }
  }

  if (healed.length > 0) {
    console.warn(
      `[e2e] healed a damaged baseline left by an earlier run: ${healed.join(", ")}. ` +
        "Run `npm run db:content:check` to see whether anything else has drifted.",
    );
  }

  // Restore before the run too, so an earlier interrupted run cannot leave the
  // assertions below measuring the wrong baseline.
  await restore(baseline);

  const session = await sessionFor(adminEmails()[0]);
  adminCookie = encodeSessionCookie(session);
  setCookieJar([authCookie(adminCookie)]);
}, 120_000);

afterAll(async () => {
  // Remove every uploaded object, then restore the database exactly.
  const paths = [...uploadedPaths];
  if (paths.length > 0) {
    await db.storage.from("site-assets").remove(paths);
  }
  await restore(baseline);

  const [{ count: bucketCount }] = await Promise.all([
    db.storage.from("site-assets").list("site", { limit: 1000 }).then(({ data }) => ({
      count: (data ?? []).length,
    })),
  ]);
  expect(bucketCount).toBe(0);

  const leftover = await sql(`select slug from products where slug = any($1::text[])`, [
    [...createdSlugs],
  ]);
  expect(leftover).toHaveLength(0);

  await client.end();
}, 150_000);

describe("storefront content", () => {
  it("saves the announcement bar and invalidates the content cache", async () => {
    const before = await contentRow(CONTENT_KEYS.announcement);
    expect(before).toBeDefined();

    clearRevalidated();
    const result = await actions.saveContentDocument({
      key: CONTENT_KEYS.announcement,
      value: {
        enabled: true,
        text: "E2E announcement — safe to delete",
        href: "/size-guide",
      },
    });

    expect(result.ok).toBe(true);
    // The write must expire the content cache, or the storefront would keep
    // serving the previous wording.
    expect(revalidatedUpdates()).toContain("storefront-content");

    const row = await contentRow(CONTENT_KEYS.announcement);
    expect(row?.value.text).toBe("E2E announcement — safe to delete");
  }, 120_000);

  it("refuses an announcement link that would run script", async () => {
    const result = await actions.saveContentDocument({
      key: CONTENT_KEYS.announcement,
      value: { enabled: true, text: "Hostile", href: "javascript:alert(1)" },
    });

    // The document saves, but the unsafe destination is replaced by the shipped
    // one: the parser is the guard, not the caller.
    expect(result.ok).toBe(true);
    const row = await contentRow(CONTENT_KEYS.announcement);
    expect(String(row?.value.href)).not.toContain("javascript:");
  }, 120_000);

  it("restores the announcement to the shipped wording", async () => {
    const result = await actions.resetContentDocumentAction({ key: CONTENT_KEYS.announcement });
    expect(result.ok).toBe(true);

    // Reset is a row delete; the read path then supplies the code default.
    expect(await contentRow(CONTENT_KEYS.announcement)).toBeUndefined();
  }, 120_000);

  it("saves store settings in one call and keeps them independently valid", async () => {
    const result = await actions.saveStoreSettings({
      name: "E2E Studio",
      shortName: "E2E",
      tagline: "Header line",
      footerTagline: "Footer line",
      mobileTagline: "Menu line",
      metaTitle: "E2E title",
      metaDescription: "E2E description",
      homeMetaTitle: "E2E home title",
      homeMetaDescription: "E2E home description",
      email: "e2e@example.com",
      phone: "+92 300 0000000",
      addressLines: "Line one\nLine two",
      country: "Pakistan",
      jurisdiction: "Pakistan",
      defaultCurrency: "PKR",
      socials: [{ label: "Instagram", href: "https://instagram.com/e2e" }],
    });

    expect(result.ok).toBe(true);

    const identity = await contentRow(CONTENT_KEYS.identity);
    expect(identity?.value.name).toBe("E2E Studio");

    const contact = await contentRow(CONTENT_KEYS.contact);
    expect(contact?.value.addressLines).toEqual(["Line one", "Line two"]);

    const currency = await contentRow(CONTENT_KEYS.currency);
    expect(currency?.value.default).toBe("PKR");

    const socials = await contentRow(CONTENT_KEYS.socials);
    expect(Array.isArray(socials?.value)).toBe(true);
    expect(socials?.value).toHaveLength(1);
  }, 120_000);

  it("rejects a malformed email and a malformed currency rather than publishing them", async () => {
    const badEmail = await actions.saveStoreSettings({
      ...settings("USD"),
      email: "not-an-email",
    });
    expect(badEmail.ok).toBe(false);

    const badCurrency = await actions.saveStoreSettings({
      ...settings("DOLLARS"),
      email: "ok@example.com",
    });
    expect(badCurrency.ok).toBe(false);
  }, 120_000);

  it("edits a policy page and restores it", async () => {
    const key = policyKey("returns-refunds");
    const original = await contentRow(key);
    expect(original).toBeDefined();

    const edited = structuredClone(original!.value) as Record<string, unknown>;
    const sections = edited.sections as { heading: string }[];
    sections[0].heading = "E2E heading — safe to delete";

    const saved = await actions.saveContentDocument({ key, value: edited });
    expect(saved.ok).toBe(true);

    const row = await contentRow(key);
    expect((row?.value.sections as { heading: string }[])[0].heading).toBe(
      "E2E heading — safe to delete",
    );

    // Restoring the capture puts the real wording back; assert that path works.
    await restore(baseline);
    const restored = await contentRow(key);
    expect((restored?.value.sections as { heading: string }[])[0].heading).not.toBe(
      "E2E heading — safe to delete",
    );
  }, 120_000);

  it("refuses a content key that is not part of the closed set", async () => {
    const result = await actions.saveContentDocument({
      key: "home.injected",
      value: { anything: true },
    });

    expect(result.ok).toBe(false);
    expect(await contentRow("home.injected")).toBeUndefined();
  }, 120_000);

  it("uploads, attaches and clears a storefront image", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );

    const prepared = await actions.prepareSiteImageUpload({
      key: CONTENT_KEYS.hero,
      contentType: "image/png",
      sizeBytes: png.byteLength,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    uploadedPaths.add(prepared.path);

    const { error } = await db.storage
      .from("site-assets")
      .uploadToSignedUrl(prepared.path, prepared.token, png, { contentType: "image/png" });
    expect(error).toBeNull();

    const finalized = await actions.finalizeSiteImageUpload({
      key: CONTENT_KEYS.hero,
      path: prepared.path,
      pathField: "imagePath",
    });
    expect(finalized.ok).toBe(true);

    const row = await contentRow(CONTENT_KEYS.hero);
    expect(row?.value.imagePath).toBe(prepared.path);

    // Clearing must remove both the stored path and the object.
    const cleared = await actions.clearSiteImage({ key: CONTENT_KEYS.hero, pathField: "imagePath" });
    expect(cleared.ok).toBe(true);
    expect((await contentRow(CONTENT_KEYS.hero))?.value.imagePath).toBeNull();
  }, 150_000);

  it("refuses an image path belonging to another content slot", async () => {
    const forged = await actions.finalizeSiteImageUpload({
      key: CONTENT_KEYS.hero,
      // A well-formed path, but for the gallery rather than the hero.
      path: "site/home/gallery/6f1c8a2e-1111-2222-3333-444455556666.webp",
      pathField: "imagePath",
    });
    expect(forged.ok).toBe(false);
  }, 120_000);

  it("refuses an image slot that does not exist in the document", async () => {
    const result = await actions.clearSiteImage({
      key: CONTENT_KEYS.hero,
      pathField: "notARealField",
    });
    expect(result.ok).toBe(false);
  }, 120_000);
});

describe("migrated content fidelity", () => {
  /**
   * The migration's central requirement: what customers see must not change.
   *
   * The unit suite proves the code defaults have not drifted from the parser's
   * expectations; this proves the *stored* rows still carry those same values. If
   * someone edits a seeded document by hand in SQL — or a future migration
   * rewrites one — the two diverge and this fails, naming the field.
   */
  it("stores exactly the copy the storefront shipped with", async () => {
    const rows = await sql(`select key, value from site_content`);
    const byKey = new Map(rows.map((row) => [row.key as string, row.value as Record<string, unknown>]));

    const expectations: [string, unknown, unknown][] = [];
    const hero = byKey.get(CONTENT_KEYS.hero);
    expectations.push(["home.hero.eyebrow", hero?.eyebrow, DEFAULT_SITE_CONTENT.home.hero.eyebrow]);
    expectations.push(["home.hero.headline", hero?.headline, DEFAULT_SITE_CONTENT.home.hero.headline]);

    const identity = byKey.get(CONTENT_KEYS.identity);
    expectations.push(["site.identity.name", identity?.name, DEFAULT_IDENTITY.name]);

    const announcement = byKey.get(CONTENT_KEYS.announcement);
    expectations.push([
      "site.announcement.text",
      announcement?.text,
      DEFAULT_SITE_CONTENT.announcement.text,
    ]);

    for (const [field, stored, expected] of expectations) {
      expect(stored, `${field} has drifted from the shipped wording`).toBe(expected);
    }

    // Policy pages carry the same section structure as the code defaults, which
    // is what makes a "restore original" reset lossless.
    for (const slug of POLICY_SLUGS) {
      const stored = byKey.get(policyKey(slug));
      const sections = stored?.sections as { heading: string }[] | undefined;
      const fallback = DEFAULT_POLICIES[slug].sections;

      expect(sections?.length, `${slug} section count`).toBe(fallback.length);
      expect(sections?.[0]?.heading, `${slug} first heading`).toBe(fallback[0].heading);
    }
  }, 120_000);
});

describe("catalogue lifecycle", () => {
  it("creates a product as an unpublished draft and derives a slug", async () => {
    const result = await actions.createProduct({
      name: "E2E Draft Set — safe to delete",
      collectionId: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.slug) throw new Error("create failed");
    createdSlugs.add(result.slug);

    const row = (await sql(`select * from products where slug = $1`, [result.slug]))[0];
    expect(row.name).toBe("E2E Draft Set — safe to delete");
    // Created unpublished: a half-filled row must never reach the storefront.
    expect(row.is_active).toBe(false);
    expect(row.archived_at).toBeNull();
    expect(row.collection_id).toBeNull();
  }, 120_000);

  it("duplicates a product without copying its published state or position", async () => {
    const source = (await sql(`select id, name, display_order from products where archived_at is null limit 1`))[0];
    const result = await actions.duplicateProduct({ productId: source.id as string });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.slug) throw new Error("duplicate failed");
    createdSlugs.add(result.slug);

    const copy = (await sql(`select * from products where slug = $1`, [result.slug]))[0];
    expect(String(copy.name)).toContain("(copy)");
    expect(copy.is_active).toBe(false);
    expect(copy.featured).toBe(false);
    expect(copy.id).not.toBe(source.id);
  }, 120_000);

  it("archives, restores and then permanently deletes a product", async () => {
    const created = await actions.createProduct({ name: "E2E Lifecycle Set", collectionId: null });
    if (!created.ok || !created.slug || !created.id) throw new Error("create failed");
    createdSlugs.add(created.slug);

    // Archive hides it from every public read.
    const archived = await actions.archiveProduct({ productId: created.id, note: "e2e" });
    expect(archived.ok).toBe(true);
    let row = (await sql(`select * from products where id = $1`, [created.id]))[0];
    expect(row.archived_at).not.toBeNull();
    expect(row.archive_note).toBe("e2e");
    expect(row.is_active).toBe(false);

    // Restore returns it as a draft.
    const restored = await actions.restoreProduct({ productId: created.id });
    expect(restored.ok).toBe(true);
    row = (await sql(`select * from products where id = $1`, [created.id]))[0];
    expect(row.archived_at).toBeNull();
    expect(row.is_active).toBe(false);

    // Deletion requires the exact name.
    const wrongName = await actions.deleteProduct({
      productId: created.id,
      confirmName: "something else",
    });
    expect(wrongName.ok).toBe(false);
    expect(await sql(`select 1 from products where id = $1`, [created.id])).toHaveLength(1);

    const deleted = await actions.deleteProduct({
      productId: created.id,
      confirmName: "E2E Lifecycle Set",
    });
    expect(deleted.ok).toBe(true);
    expect(await sql(`select 1 from products where id = $1`, [created.id])).toHaveLength(0);

    createdSlugs.delete(created.slug);
  }, 150_000);

  it("creates a collection, blocks its deletion, reassigns, then deletes it", async () => {
    const collection = await actions.createCollection({ title: "E2E Collection — safe to delete" });
    if (!collection.ok || !collection.id || !collection.slug) throw new Error("create failed");
    createdCollectionSlugs.add(collection.slug);

    const product = await actions.createProduct({
      name: "E2E In Collection",
      collectionId: collection.id,
    });
    if (!product.ok || !product.slug || !product.id) throw new Error("create failed");
    createdSlugs.add(product.slug);

    // A collection with products must not be deletable.
    const blocked = await actions.deleteCollection({
      collectionId: collection.id,
      confirmName: "E2E Collection — safe to delete",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toMatch(/still holds 1 product/);

    // The safe workflow: move the products out, then delete.
    const moved = await actions.reassignCollectionProducts({
      fromCollectionId: collection.id,
      toCollectionId: null,
    });
    expect(moved.ok).toBe(true);

    const row = (await sql(`select collection_id from products where id = $1`, [product.id]))[0];
    expect(row.collection_id).toBeNull();

    const removed = await actions.deleteCollection({
      collectionId: collection.id,
      confirmName: "E2E Collection — safe to delete",
    });
    expect(removed.ok).toBe(true);
    expect(await sql(`select 1 from collections where id = $1`, [collection.id])).toHaveLength(0);

    createdCollectionSlugs.delete(collection.slug);
  }, 150_000);

  it("refuses a collection deletion with the wrong confirmation", async () => {
    const collection = await actions.createCollection({ title: "E2E Confirm Guard" });
    if (!collection.ok || !collection.id || !collection.slug) throw new Error("create failed");
    createdCollectionSlugs.add(collection.slug);

    const result = await actions.deleteCollection({
      collectionId: collection.id,
      confirmName: "E2E Confirm",
    });
    expect(result.ok).toBe(false);
    expect(await sql(`select 1 from collections where id = $1`, [collection.id])).toHaveLength(1);
  }, 120_000);

  it("applies bulk actions and an explicit order atomically", async () => {
    const a = await actions.createProduct({ name: "E2E Bulk A", collectionId: null });
    const b = await actions.createProduct({ name: "E2E Bulk B", collectionId: null });
    if (!a.ok || !a.id || !a.slug || !b.ok || !b.id || !b.slug) throw new Error("create failed");
    createdSlugs.add(a.slug);
    createdSlugs.add(b.slug);

    const published = await actions.bulkUpdateProducts({
      productIds: [a.id, b.id],
      action: "activate",
    });
    expect(published.ok).toBe(true);

    const rows = await sql(`select id, is_active from products where id = any($1::uuid[])`, [
      [a.id, b.id],
    ]);
    expect(rows.every((row) => row.is_active === true)).toBe(true);

    // Order is rewritten densively as 1..n.
    const reordered = await actions.reorderProducts({ productIds: [b.id, a.id] });
    expect(reordered.ok).toBe(true);
    expect((await sql(`select display_order from products where id = $1`, [b.id]))[0].display_order).toBe(1);
    expect((await sql(`select display_order from products where id = $1`, [a.id]))[0].display_order).toBe(2);

    // A stale id refuses the whole operation rather than half-applying it.
    const stale = await actions.reorderProducts({
      productIds: [b.id, "00000000-0000-0000-0000-000000000000"],
    });
    expect(stale.ok).toBe(false);
    expect((await sql(`select display_order from products where id = $1`, [b.id]))[0].display_order).toBe(1);
  }, 150_000);
});

/** A settings payload with a variable currency, for the validation cases. */
function settings(defaultCurrency: string) {
  return {
    name: DEFAULT_IDENTITY.name,
    shortName: DEFAULT_IDENTITY.shortName,
    tagline: DEFAULT_IDENTITY.tagline,
    footerTagline: DEFAULT_IDENTITY.footerTagline,
    mobileTagline: DEFAULT_IDENTITY.mobileTagline,
    metaTitle: DEFAULT_IDENTITY.metaTitle,
    metaDescription: DEFAULT_IDENTITY.metaDescription,
    homeMetaTitle: DEFAULT_IDENTITY.homeMetaTitle,
    homeMetaDescription: DEFAULT_IDENTITY.homeMetaDescription,
    email: "ok@example.com",
    phone: "123",
    addressLines: "Somewhere",
    country: "Pakistan",
    jurisdiction: "Pakistan",
    defaultCurrency,
    socials: [],
  };
}
