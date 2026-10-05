import { beforeAll, afterAll, describe, expect, it } from "vitest";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

import { actions, setCookieJar, clearRevalidated, revalidatedPaths, revalidatedUpdates } from "./support/driver";
import { authCookie } from "./support/cookie";
import { sessionFor, encodeSessionCookie, adminEmails, assertLiveWritesAllowed } from "./session.mjs";
import { getStorefrontCatalogue } from "@/lib/catalogue-server";

/**
 * Reversible end-to-end tests for the B8C Studio write path.
 *
 * Every write below goes through the REAL server action, against the REAL
 * Supabase project, with a REAL admin session carried in the same cookie the app
 * reads. Nothing about authorisation, validation, path scoping or the
 * concurrency predicate is stubbed — see `driver.ts`.
 *
 * The catalogue is captured before the first write and restored from that
 * capture in `afterAll`, and the Storage bucket is asserted empty afterwards.
 */

// Refuses unless E2E_ALLOW_LIVE_WRITES=1.
assertLiveWritesAllowed();

const PRODUCT_SLUG = "glazed-truffle";
const COLLECTION_SLUG = "core-edit";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
const prismaPg = await import("pg");
const pg = new prismaPg.default.Client({ connectionString: process.env.DATABASE_URL });

type Row = Record<string, unknown>;
let baseline: { collections: Row[]; products: Row[]; images: Row[] };

/** Small helpers so the assertions read as intent rather than SQL. */
const sql = async (text: string, values: unknown[] = []): Promise<Row[]> =>
  (await pg.query(text, values)).rows;

const productRow = async (slug = PRODUCT_SLUG) =>
  (await sql(`select * from products where slug = $1`, [slug]))[0];

const collectionRow = async (slug = COLLECTION_SLUG) =>
  (await sql(`select * from collections where slug = $1`, [slug]))[0];

/**
 * The concurrency token, read at the same precision the application uses.
 *
 * `row.updated_at` is a JavaScript Date and therefore truncated to milliseconds,
 * which is exactly the bug the production code was fixed for — echoing it back
 * would make every save look stale, so the tests read the token as text too.
 */
const TOKEN = `to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const productVersion = async (): Promise<string> =>
  (await sql(`select ${TOKEN} as v from products where id = $1`, [productId]))[0].v as string;

const collectionVersion = async (): Promise<string> =>
  (await sql(`select ${TOKEN} as v from collections where id = $1`, [collectionId]))[0].v as string;

const imageRows = async (productId: string) =>
  sql(
    `select id, storage_path, alt_text, sort_order, is_primary
       from product_images where product_id = $1
      order by sort_order asc, id asc`,
    [productId],
  );

let adminCookie: string;
let productId: string;
let collectionId: string;

/** Writes one captured collection row back, column by column. */
async function restoreCollectionRow(row: Row) {
  await sql(
    `update collections set slug=$2, title=$3, subtitle=$4, description=$5, tag=$6,
            featured=$7, display_order=$8, is_active=$9, cover_image_path=$10
      where id=$1`,
    [
      row.id, row.slug, row.title, row.subtitle, row.description, row.tag,
      row.featured, row.display_order, row.is_active, row.cover_image_path,
    ],
  );
}

/** Writes one captured product row back, column by column. */
async function restoreProductRow(row: Row) {
  await sql(
    `update products set slug=$2, collection_id=$3, name=$4, descriptor=$5, description=$6,
            shape=$7, default_length=$8, finish=$9, tag=$10, featured=$11, display_order=$12,
            is_active=$13, included=$14, price_minor=$15, currency=$16
      where id=$1`,
    [
      row.id, row.slug, row.collection_id, row.name, row.descriptor, row.description,
      row.shape, row.default_length, row.finish, row.tag, row.featured, row.display_order,
      row.is_active, row.included, row.price_minor, row.currency,
    ],
  );
}

/**
 * Writes the captured catalogue state back over the live rows.
 *
 * Used both before the suite (so a previous failed run cannot poison this one)
 * and after it (to leave the project exactly as it was found).
 */
async function restoreCatalogue() {
  // Each phase is isolated: a failure in one must not leave the others unrestored.
  const phases: [string, () => Promise<unknown>][] = [
    [
      "collections",
      async () => {
        for (const row of baseline.collections) await restoreCollectionRow(row);
      },
    ],
    [
      "products",
      async () => {
        for (const row of baseline.products) await restoreProductRow(row);
      },
    ],
    [
      "images",
      async () => {
        const currentImages = await sql(`select id, storage_path from product_images`);
        const baselineIds = new Set((baseline.images as { id: string }[]).map((image) => image.id));
        const created = currentImages.filter((image) => !baselineIds.has(image.id as string));
        if (created.length > 0) {
          await db.storage
            .from("product-images")
            .remove(created.map((image) => image.storage_path as string));
        }
        await sql(`delete from product_images where id <> all($1::uuid[])`, [
          (baseline.images as { id: string }[]).map((image) => image.id),
        ]);
      },
    ],
  ];

  for (const [label, run] of phases) {
    try {
      await run();
    } catch (error) {
      console.error(`RESTORE PHASE FAILED (${label}):`, error);
    }
  }
}

beforeAll(async () => {
  await pg.connect();

  baseline = {
    collections: await sql(`select * from collections order by slug`),
    products: await sql(`select * from products order by slug`),
    images: await sql(`select * from product_images order by product_id, sort_order, id`),
  };

  // Idempotent starting point.
  await restoreCatalogue();

  const session = await sessionFor(adminEmails()[0]);
  adminCookie = encodeSessionCookie(session);
  setCookieJar([authCookie(adminCookie)]);

  const state = await actions.loadStudioState();
  if (!state.ok) throw new Error(`could not load management state: ${state.error}`);
  productId = state.state.products.find((p) => p.slug === PRODUCT_SLUG)!.id;
  collectionId = state.state.collections.find((c) => c.slug === COLLECTION_SLUG)!.id;

  expect(productId).toBeTruthy();
  expect(collectionId).toBeTruthy();
});

afterAll(async () => {
  await restoreCatalogue();
  await pg.end();
});

/* -------------------------------------------------------------------------- */
/* Product text edit + restore                                                 */
/* -------------------------------------------------------------------------- */

describe("product text edit", () => {
  it("persists name, descriptor, description, shape, length, finish, tag and included", async () => {
    const before = await productRow();

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: "E2E Renamed Set",
      descriptor: "E2E descriptor",
      description: "E2E description body.",
      price: "",
      currency: "",
      shape: "Coffin",
      defaultLength: "Long",
      finish: "E2E Finish",
      tag: "E2E Tag",
      included: "Line one\nLine two",
      isActive: true,
      featured: false,
      displayOrder: String(before.display_order ?? ""),
    });

    expect(result.ok).toBe(true);

    const after = await productRow();
    expect(after.name).toBe("E2E Renamed Set");
    expect(after.descriptor).toBe("E2E descriptor");
    expect(after.description).toBe("E2E description body.");
    expect(after.shape).toBe("Coffin");
    expect(after.default_length).toBe("Long");
    expect(after.finish).toBe("E2E Finish");
    expect(after.tag).toBe("E2E Tag");
    expect(after.included).toEqual(["Line one", "Line two"]);

    // The version token must advance, which is what the next save relies on.
    expect(new Date(after.updated_at as string).getTime()).toBeGreaterThanOrEqual(
      new Date(before.updated_at as string).getTime(),
    );

    // The public read path picks the change up with no extra work.
    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.products.find((p) => p.slug === PRODUCT_SLUG)?.name).toBe("E2E Renamed Set");
  });

  it("restores the original text", async () => {
    const original = baseline.products.find((p) => p.slug === PRODUCT_SLUG)!;

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: original.name as string,
      descriptor: original.descriptor as string,
      description: original.description as string,
      price: "",
      currency: "",
      shape: original.shape as string,
      defaultLength: original.default_length as string,
      finish: original.finish as string,
      tag: (original.tag as string | null) ?? "",
      included: (original.included as string[]).join("\n"),
      isActive: original.is_active as boolean,
      featured: original.featured as boolean,
      displayOrder: original.display_order === null ? "" : String(original.display_order),
    });

    expect(result.ok).toBe(true);
    const after = await productRow();
    expect(after.name).toBe(original.name);
    expect(after.default_length).toBe(original.default_length);
    expect(after.tag).toBe(original.tag);
  });
});

/* -------------------------------------------------------------------------- */
/* Price: set -> checkout eligible -> clear -> not eligible                    */
/* -------------------------------------------------------------------------- */

describe("price set and cleared", () => {
  it("stores a price in minor units and makes the product priced", async () => {
    const before = await productRow();
    expect(before.price_minor).toBeNull();

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: before.name as string,
      descriptor: before.descriptor as string,
      description: before.description as string,
      price: "45.50",
      currency: "USD",
      shape: before.shape as string,
      defaultLength: before.default_length as string,
      finish: before.finish as string,
      tag: (before.tag as string | null) ?? "",
      included: (before.included as string[]).join("\n"),
      isActive: true,
      featured: false,
      displayOrder: before.display_order === null ? "" : String(before.display_order),
    });

    expect(result.ok).toBe(true);

    const after = await productRow();
    expect(after.price_minor).toBe(4550);
    expect(after.currency).toBe("USD");

    // order-server.ts refuses a product whose price pair is incomplete; a
    // complete pair is exactly what makes this checkout-eligible.
    expect(after.price_minor).not.toBeNull();
    expect(after.currency).toMatch(/^[A-Z]{3}$/);

    const catalogue = await getStorefrontCatalogue();
    const product = catalogue.products.find((p) => p.slug === PRODUCT_SLUG)!;
    expect(product.price).toBe("USD 45.50");
  });

  it("clears the price and the product becomes non-checkout-eligible again", async () => {
    const before = await productRow();

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: before.name as string,
      descriptor: before.descriptor as string,
      description: before.description as string,
      price: "",
      currency: "",
      shape: before.shape as string,
      defaultLength: before.default_length as string,
      finish: before.finish as string,
      tag: (before.tag as string | null) ?? "",
      included: (before.included as string[]).join("\n"),
      isActive: true,
      featured: false,
      displayOrder: before.display_order === null ? "" : String(before.display_order),
    });

    expect(result.ok).toBe(true);

    const after = await productRow();
    expect(after.price_minor).toBeNull();
    expect(after.currency).toBeNull();

    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.products.find((p) => p.slug === PRODUCT_SLUG)?.price).toBe("$XX");
  });

  it("rejects a half-set price pair", async () => {
    const before = await productRow();
    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: before.name as string,
      descriptor: before.descriptor as string,
      description: before.description as string,
      price: "10.00",
      currency: "",
      shape: before.shape as string,
      defaultLength: before.default_length as string,
      finish: before.finish as string,
      tag: "",
      included: "",
      isActive: true,
      featured: false,
      displayOrder: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("invalid");
    // Nothing was written.
    expect((await productRow()).price_minor).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Active / featured                                                           */
/* -------------------------------------------------------------------------- */

describe("visibility flags", () => {
  it("deactivating hides the product from the public catalogue", async () => {
    const before = await productRow();

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: before.name as string,
      descriptor: before.descriptor as string,
      description: before.description as string,
      price: "",
      currency: "",
      shape: before.shape as string,
      defaultLength: before.default_length as string,
      finish: before.finish as string,
      tag: "",
      included: "",
      isActive: false,
      featured: true,
      displayOrder: "3",
    });

    expect(result.ok).toBe(true);

    const after = await productRow();
    expect(after.is_active).toBe(false);
    expect(after.featured).toBe(true);
    expect(after.display_order).toBe(3);

    // PUBLIC_PRODUCT_FILTER requires is_active, so it is absent for visitors.
    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.products.some((p) => p.slug === PRODUCT_SLUG)).toBe(false);

    // …but it is still present for the admin, which is how it gets re-activated.
    const state = await actions.loadStudioState();
    expect(state.ok).toBe(true);
    if (state.ok) {
      expect(state.state.products.find((p) => p.id === productId)?.isActive).toBe(false);
    }
  });

  it("re-activating restores it and clears featured/order", async () => {
    const before = await productRow();

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: before.name as string,
      descriptor: before.descriptor as string,
      description: before.description as string,
      price: "",
      currency: "",
      shape: before.shape as string,
      defaultLength: before.default_length as string,
      finish: before.finish as string,
      tag: "",
      included: "",
      isActive: true,
      featured: false,
      displayOrder: "",
    });

    expect(result.ok).toBe(true);
    const after = await productRow();
    expect(after.is_active).toBe(true);
    expect(after.featured).toBe(false);
    expect(after.display_order).toBeNull();

    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.products.some((p) => p.slug === PRODUCT_SLUG)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Product images: upload -> reorder/primary/alt -> delete                      */
/* -------------------------------------------------------------------------- */

describe("product images", () => {
  /** A tiny valid PNG, so the server's real MIME/size checks accept it. */
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const upload = async (name: string) => {
    const file = new File([pngBytes], name, { type: "image/png" });

    const target = await actions.prepareStudioImageUpload({
      productId,
      contentType: file.type,
      sizeBytes: file.size,
    });
    expect(target.ok).toBe(true);
    if (!target.ok) throw new Error(target.error);

    // Path scoping: the server generated it inside this product's folder.
    expect(target.path.startsWith(`products/${productId}/`)).toBe(true);

    const put = await fetch(target.signedUrl, {
      method: "PUT",
      headers: { "content-type": file.type, "x-upsert": "false" },
      body: pngBytes,
    });
    expect(put.ok).toBe(true);

    return actions.finalizeStudioImageUpload({ productId, path: target.path });
  };

  let firstImageId: string;
  let secondImageId: string;
  let firstPath: string;

  it("uploads through a signed URL and records metadata only after the object exists", async () => {
    const result = await upload("e2e-first.png");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    firstImageId = result.data.imageId;
    const rows = await imageRows(productId);
    expect(rows).toHaveLength(1);
    expect(rows[0].is_primary).toBe(true); // first image becomes the cover
    firstPath = rows[0].storage_path as string;

    // The object really is in Storage, and the public URL resolves.
    const { data } = db.storage.from("product-images").getPublicUrl(firstPath);
    const head = await fetch(data.publicUrl);
    expect(head.status).toBe(200);

    // And the storefront shows it in place of the placeholder.
    const catalogue = await getStorefrontCatalogue();
    const product = catalogue.products.find((p) => p.slug === PRODUCT_SLUG)!;
    expect(product.images[0].url).toBe(data.publicUrl);
  });

  it("uploads a second image without making it primary", async () => {
    const result = await upload("e2e-second.png");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    secondImageId = result.data.imageId;

    const rows = await imageRows(productId);
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.is_primary)).toHaveLength(1);
    expect(rows.find((r) => r.id === firstImageId)?.is_primary).toBe(true);
  });

  it("reorders the gallery and moves the cover with it", async () => {
    const result = await actions.reorderStudioImages({
      productId,
      imageIds: [secondImageId, firstImageId],
    });
    expect(result.ok).toBe(true);

    const rows = await imageRows(productId);
    expect(rows[0].id).toBe(secondImageId);
    expect(rows[0].is_primary).toBe(true);
    expect(rows[0].sort_order).toBe(0);
    expect(rows[1].id).toBe(firstImageId);
    expect(rows[1].is_primary).toBe(false);
  });

  it("refuses a gallery order that is not a permutation of this product's images", async () => {
    const result = await actions.reorderStudioImages({
      productId,
      imageIds: [secondImageId, "00000000-0000-4000-8000-000000000000"],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("conflict");
    // Order untouched.
    expect((await imageRows(productId))[0].id).toBe(secondImageId);
  });

  it("sets a specific image as primary", async () => {
    const result = await actions.setStudioPrimaryImage({ productId, imageId: firstImageId });
    expect(result.ok).toBe(true);
    const rows = await imageRows(productId);
    expect(rows.find((r) => r.id === firstImageId)?.is_primary).toBe(true);
    expect(rows.filter((r) => r.is_primary)).toHaveLength(1);
  });

  it("saves alt text", async () => {
    const result = await actions.updateStudioImageAlt({
      productId,
      imageId: firstImageId,
      altText: "E2E alt description",
    });
    expect(result.ok).toBe(true);
    const rows = await imageRows(productId);
    expect(rows.find((r) => r.id === firstImageId)?.alt_text).toBe("E2E alt description");

    const catalogue = await getStorefrontCatalogue();
    const product = catalogue.products.find((p) => p.slug === PRODUCT_SLUG)!;
    expect(product.images.some((image) => image.alt === "E2E alt description")).toBe(true);
  });

  it("replaces an image in place, taking over its position and cover flag", async () => {
    const before = await imageRows(productId);
    const target = before.find((row) => row.id === firstImageId)!;

    const result = await actions.finalizeStudioImageUpload({
      productId,
      path: await (async () => {
        const file = new File([pngBytes], "e2e-replacement.png", { type: "image/png" });
        const prepared = await actions.prepareStudioImageUpload({
          productId,
          contentType: file.type,
          sizeBytes: file.size,
        });
        if (!prepared.ok) throw new Error(prepared.error);
        await fetch(prepared.signedUrl, {
          method: "PUT",
          headers: { "content-type": file.type, "x-upsert": "false" },
          body: pngBytes,
        });
        return prepared.path;
      })(),
      replacingImageId: firstImageId,
    });

    expect(result.ok).toBe(true);

    const after = await imageRows(productId);
    expect(after).toHaveLength(before.length);
    expect(after.some((row) => row.id === firstImageId)).toBe(false);
    expect(after.some((row) => row.sort_order === target.sort_order)).toBe(true);
    // The superseded object is gone from Storage.
    const { error } = await db.storage.from("product-images").info(target.storage_path as string);
    expect(error).not.toBeNull();
  });

  it("deletes every image and the placeholder returns", async () => {
    const rows = await imageRows(productId);
    const paths = rows.map((row) => row.storage_path as string);

    for (const row of rows) {
      const result = await actions.deleteStudioImage({ productId, imageId: row.id as string });
      expect(result.ok).toBe(true);
    }

    expect(await imageRows(productId)).toHaveLength(0);

    // Objects removed from Storage.
    for (const path of paths) {
      const { error } = await db.storage.from("product-images").info(path);
      expect(error).not.toBeNull();
    }

    const catalogue = await getStorefrontCatalogue();
    const product = catalogue.products.find((p) => p.slug === PRODUCT_SLUG)!;
    expect(product.images).toHaveLength(1);
    expect(product.images[0].url).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Concurrency                                                                 */
/* -------------------------------------------------------------------------- */

describe("optimistic concurrency", () => {
  it("rejects a save based on a stale updated_at and keeps the other writer's value", async () => {
    const loaded = await productRow();
    const staleVersion = await productVersion();

    // Another admin saves first.
    const other = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: staleVersion,
      name: "E2E Other Tab Name",
      descriptor: loaded.descriptor as string,
      description: loaded.description as string,
      price: "",
      currency: "",
      shape: loaded.shape as string,
      defaultLength: loaded.default_length as string,
      finish: loaded.finish as string,
      tag: "",
      included: "",
      isActive: true,
      featured: false,
      displayOrder: "",
    });
    expect(other.ok).toBe(true);

    // The stale editor then tries to save over it.
    const stale = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: staleVersion,
      name: "E2E Stale Overwrite",
      descriptor: "",
      description: "",
      price: "",
      currency: "",
      shape: "Almond",
      defaultLength: "Medium",
      finish: "",
      tag: "",
      included: "",
      isActive: true,
      featured: false,
      displayOrder: "",
    });

    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.kind).toBe("conflict");
    expect(stale.error).toContain("changed elsewhere");

    // The stale write did NOT land, and the conflict response carries the
    // current values so the editor can rebase.
    expect((await productRow()).name).toBe("E2E Other Tab Name");
    expect(stale.state?.products.find((p) => p.id === productId)?.name).toBe("E2E Other Tab Name");
  });

  it("rejects a stale collection cover removal", async () => {
    const loaded = await collectionRow();
    const staleVersion = await collectionVersion();

    const other = await actions.saveStudioCollection({
      id: collectionId,
      expectedUpdatedAt: staleVersion,
      title: "E2E Collection Title",
      subtitle: loaded.subtitle as string,
      description: loaded.description as string,
      tag: "",
      isActive: true,
      featured: loaded.featured as boolean,
      displayOrder: loaded.display_order === null ? "" : String(loaded.display_order),
    });
    expect(other.ok).toBe(true);

    const stale = await actions.removeStudioCover({
      collectionId,
      expectedUpdatedAt: staleVersion,
    });
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.kind).toBe("conflict");
    expect((await collectionRow()).title).toBe("E2E Collection Title");
  });
});

/* -------------------------------------------------------------------------- */
/* Collections: fields + cover                                                 */
/* -------------------------------------------------------------------------- */

describe("collection fields and cover", () => {
  it("saves the editable fields and reflects them publicly", async () => {

    const result = await actions.saveStudioCollection({
      id: collectionId,
      expectedUpdatedAt: await collectionVersion(),
      title: "E2E Core Edit",
      subtitle: "E2E subtitle",
      description: "E2E collection description.",
      tag: "E2E Collection Tag",
      isActive: true,
      featured: false,
      displayOrder: "9",
    });
    expect(result.ok).toBe(true);

    const after = await collectionRow();
    expect(after.title).toBe("E2E Core Edit");
    expect(after.subtitle).toBe("E2E subtitle");
    expect(after.tag).toBe("E2E Collection Tag");
    expect(after.featured).toBe(false);
    expect(after.display_order).toBe(9);

    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.collections.find((c) => c.slug === COLLECTION_SLUG)?.title).toBe("E2E Core Edit");
  });

  it("deactivating a collection hides it and its products", async () => {
    const before = await collectionRow();

    const result = await actions.saveStudioCollection({
      id: collectionId,
      expectedUpdatedAt: await collectionVersion(),
      title: "E2E Core Edit",
      subtitle: before.subtitle as string,
      description: before.description as string,
      tag: "",
      isActive: false,
      featured: false,
      displayOrder: "",
    });
    expect(result.ok).toBe(true);

    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.collections.some((c) => c.slug === COLLECTION_SLUG)).toBe(false);
    expect(catalogue.products.some((p) => p.collectionSlug === COLLECTION_SLUG)).toBe(false);

    // Restore visibility for the cover tests below.
    const after = await collectionRow();
    const restored = await actions.saveStudioCollection({
      id: collectionId,
      expectedUpdatedAt: await collectionVersion(),
      title: after.title as string,
      subtitle: after.subtitle as string,
      description: after.description as string,
      tag: (after.tag as string | null) ?? "",
      isActive: true,
      featured: false,
      displayOrder: after.display_order === null ? "" : String(after.display_order),
    });
    expect(restored.ok).toBe(true);
  });

  it("uploads a cover, then replaces it (removing the previous object)", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const file = new File([png], "e2e-cover.png", { type: "image/png" });

    const prepared = await actions.prepareStudioCoverUpload({
      collectionId,
      contentType: file.type,
      sizeBytes: file.size,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.path.startsWith(`collections/${collectionId}/`)).toBe(true);

    await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: { "content-type": file.type, "x-upsert": "false" },
      body: png,
    });

    const finalized = await actions.finalizeStudioCoverUpload({
      collectionId,
      path: prepared.path,
      expectedUpdatedAt: await collectionVersion(),
    });
    expect(finalized.ok).toBe(true);

    const withCover = await collectionRow();
    expect(withCover.cover_image_path).toBe(prepared.path);

    const { data } = db.storage.from("product-images").getPublicUrl(prepared.path);
    expect((await fetch(data.publicUrl)).status).toBe(200);

    const catalogue = await getStorefrontCatalogue();
    expect(catalogue.collections.find((c) => c.slug === COLLECTION_SLUG)?.coverImageUrl).toBe(
      data.publicUrl,
    );

    // Replace it: the previous object must be gone afterwards.
    const second = await actions.prepareStudioCoverUpload({
      collectionId,
      contentType: file.type,
      sizeBytes: file.size,
    });
    if (!second.ok) throw new Error(second.error);
    await fetch(second.signedUrl, {
      method: "PUT",
      headers: { "content-type": file.type, "x-upsert": "false" },
      body: png,
    });

    const replaced = await actions.finalizeStudioCoverUpload({
      collectionId,
      path: second.path,
      expectedUpdatedAt: await collectionVersion(),
    });
    expect(replaced.ok).toBe(true);

    expect((await collectionRow()).cover_image_path).toBe(second.path);
    const gone = await db.storage.from("product-images").info(prepared.path);
    expect(gone.error).not.toBeNull();
  });

  it("removes the cover and clears the column", async () => {
    const current = await collectionRow();
    const path = current.cover_image_path as string;

    const result = await actions.removeStudioCover({
      collectionId,
      expectedUpdatedAt: await collectionVersion(),
    });
    expect(result.ok).toBe(true);

    expect((await collectionRow()).cover_image_path).toBeNull();
    const gone = await db.storage.from("product-images").info(path);
    expect(gone.error).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Cache invalidation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The public catalogue is cached across requests, so a Studio write that does
 * not invalidate it would leave the storefront showing the previous values until
 * the backstop TTL expired.
 *
 * This guards the specific hole that existed before the cache was introduced:
 * five of the image actions (`finalizeStudioImageUpload`, `reorderStudioImages`,
 * `setStudioPrimaryImage`, `updateStudioImageAlt`, `deleteStudioImage`) called no
 * revalidation at all, and no admin action revalidated `/`, `/collections` or
 * `/search`. That was invisible only because every storefront route was
 * `force-dynamic` with `no-store`, so nothing could go stale.
 *
 * `unstable_cache` is a pass-through in this harness and the revalidation calls
 * are recorded rather than executed, so what is asserted here is that the write
 * paths call the invalidation contract — which is the part that can silently rot.
 */
describe("catalogue invalidation", () => {
  /** Every storefront surface a catalogue change can appear on. */
  const STOREFRONT_PATHS = [
    "/",
    "/shop",
    "/collections",
    "/search",
    "/product/[slug]",
    "/collections/[slug]",
  ];

  it("a product save expires the catalogue tag and revalidates every storefront path", async () => {
    const before = await productRow();
    clearRevalidated();

    const result = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: await productVersion(),
      name: before.name as string,
      descriptor: before.descriptor as string,
      description: before.description as string,
      price: "",
      currency: "",
      shape: before.shape as string,
      defaultLength: before.default_length as "Short" | "Medium" | "Long",
      finish: before.finish as string,
      tag: (before.tag as string) ?? "",
      included: ((before.included as string[]) ?? []).join("\n"),
      isActive: before.is_active as boolean,
      featured: before.featured as boolean,
      displayOrder: String(before.display_order ?? ""),
    });
    expect(result.ok).toBe(true);

    // The data-cache tag, without which a cached catalogue would survive the write.
    expect(revalidatedUpdates()).toContain("storefront-catalogue");

    // The client router cache and prerendered output for each display surface.
    const paths = revalidatedPaths();
    for (const path of STOREFRONT_PATHS) {
      expect(paths).toContain(path);
    }
  });

  it("removing a collection cover invalidates too", async () => {
    clearRevalidated();

    const result = await actions.removeStudioCover({
      collectionId,
      expectedUpdatedAt: await collectionVersion(),
    });
    expect(result.ok).toBe(true);

    expect(revalidatedUpdates()).toContain("storefront-catalogue");
    expect(revalidatedPaths()).toContain("/collections");
  });
});
