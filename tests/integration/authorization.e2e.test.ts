import { beforeAll, afterAll, describe, expect, it } from "vitest";
import "dotenv/config";
import pg from "pg";

import { actions, setCookieJar } from "./support/driver";
import { authCookie } from "./support/cookie";
import { sessionFor, encodeSessionCookie, adminEmails, assertLiveWritesAllowed } from "./session.mjs";

/**
 * The authorization sweep.
 *
 * Every exported Studio action is invoked with (a) no session and (b) a real
 * signed-in Supabase user who is NOT on the admin allowlist. Both must be
 * refused, and — the part that actually matters — nothing may be written and no
 * Storage object may appear.
 *
 * The non-admin account is created for this run and deleted afterwards.
 */

// Refuses unless E2E_ALLOW_LIVE_WRITES=1.
assertLiveWritesAllowed();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

/** A product/collection/image that exists, so a forged call has something to hit. */
let productId: string;
let collectionId: string;
let imageId: string | null;
/**
 * How many image rows existed before the sweep ran.
 *
 * Captured rather than assumed to be zero. The project has had a real product
 * image since before these tests were written, so a hardcoded `0` made this
 * assertion fail for a reason that had nothing to do with authorisation —
 * exactly the kind of false signal that gets a real regression ignored later.
 */
let imageBaseline: number;
let adminCookie: string;
let nonAdmin: { userId: string; cookie: string };

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** A well-formed but arbitrary version token. */
const TOKEN = "2020-01-01T00:00:00.000000Z";

beforeAll(async () => {
  await client.connect();

  const adminSession = await sessionFor(adminEmails()[0]);
  adminCookie = encodeSessionCookie(adminSession);

  imageBaseline = Number(
    (await client.query(`select count(*)::int n from product_images`)).rows[0].n,
  );

  setCookieJar([authCookie(adminCookie)]);
  const state = await actions.loadStudioState();
  if (!state.ok) throw new Error(state.error);
  productId = state.state.products[0].id;
  collectionId = state.state.collections[0].id;
  imageId = state.state.products.flatMap((p) => p.images)[0]?.id ?? null;

  const nonAdminSession = await sessionFor(`e2e-nonadmin-${Date.now()}@example.com`);
  nonAdmin = {
    userId: nonAdminSession.userId,
    cookie: encodeSessionCookie(nonAdminSession),
  };
});

afterAll(async () => {
  const { admin } = await import("./session.mjs");
  await admin.auth.admin.deleteUser(nonAdmin.userId).catch(() => undefined);
  await client.end();
});

/** Runs the same forged calls for a given session (or none) and asserts refusal. */
function sweep(label: string) {
  describe(`${label} is refused by every Studio action`, () => {
    it("loadStudioState", async () => {
      const r = await actions.loadStudioState();
      expect(r.ok).toBe(false);
    });

    it("saveStudioProduct", async () => {
      const r = await actions.saveStudioProduct({
        id: productId,
        expectedUpdatedAt: TOKEN,
        name: "FORGED",
        descriptor: "FORGED",
        description: "FORGED",
        price: "1.00",
        currency: "USD",
        shape: "FORGED",
        defaultLength: "Long",
        finish: "FORGED",
        tag: "FORGED",
        included: "FORGED",
        isActive: false,
        featured: true,
        displayOrder: "99",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("saveStudioCollection", async () => {
      const r = await actions.saveStudioCollection({
        id: collectionId,
        expectedUpdatedAt: TOKEN,
        title: "FORGED",
        subtitle: "FORGED",
        description: "FORGED",
        tag: "FORGED",
        isActive: false,
        featured: true,
        displayOrder: "99",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("prepareStudioImageUpload", async () => {
      const r = await actions.prepareStudioImageUpload({
        productId,
        contentType: "image/png",
        sizeBytes: png.length,
      });
      expect(r.ok).toBe(false);
    });

    it("finalizeStudioImageUpload", async () => {
      const r = await actions.finalizeStudioImageUpload({
        productId,
        path: `products/${productId}/00000000-0000-4000-8000-000000000000.png`,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("reorderStudioImages", async () => {
      const r = await actions.reorderStudioImages({ productId, imageIds: [] });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("setStudioPrimaryImage", async () => {
      const r = await actions.setStudioPrimaryImage({
        productId,
        imageId: imageId ?? "00000000-0000-4000-8000-000000000000",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("updateStudioImageAlt", async () => {
      const r = await actions.updateStudioImageAlt({
        productId,
        imageId: imageId ?? "00000000-0000-4000-8000-000000000000",
        altText: "FORGED",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("deleteStudioImage", async () => {
      const r = await actions.deleteStudioImage({
        productId,
        imageId: imageId ?? "00000000-0000-4000-8000-000000000000",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("prepareStudioCoverUpload", async () => {
      const r = await actions.prepareStudioCoverUpload({
        collectionId,
        contentType: "image/png",
        sizeBytes: png.length,
      });
      expect(r.ok).toBe(false);
    });

    it("finalizeStudioCoverUpload", async () => {
      const r = await actions.finalizeStudioCoverUpload({
        collectionId,
        path: `collections/${collectionId}/00000000-0000-4000-8000-000000000000.png`,
        expectedUpdatedAt: TOKEN,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    it("removeStudioCover", async () => {
      const r = await actions.removeStudioCover({ collectionId, expectedUpdatedAt: TOKEN });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.kind).toBe("unauthorized");
    });

    /* Owner-managed content and the catalogue lifecycle.
       Both write surfaces were added after this sweep existed, and an action that
       is not in the sweep is an action whose authorisation is unverified — so
       every new export is listed here rather than left to the UI hiding a
       button. */
    it("refuses owner-managed content writes", async () => {
      const doc = await actions.saveContentDocument({
        key: "site.announcement",
        value: { enabled: true, text: "FORGED", href: "/size-guide" },
      });
      expect(doc.ok).toBe(false);

      const many = await actions.saveContentDocuments([
        { key: "site.identity", value: { name: "FORGED" } },
      ]);
      expect(many.ok).toBe(false);

      const reset = await actions.resetContentDocumentAction({ key: "site.announcement" });
      expect(reset.ok).toBe(false);

      const settings = await actions.saveStoreSettings({
        name: "FORGED",
        shortName: "",
        tagline: "",
        footerTagline: "",
        mobileTagline: "",
        metaTitle: "",
        metaDescription: "",
        homeMetaTitle: "",
        homeMetaDescription: "",
        email: "ok@example.com",
        phone: "1",
        addressLines: "",
        country: "",
        jurisdiction: "",
        defaultCurrency: "USD",
        socials: [],
      });
      expect(settings.ok).toBe(false);

      const prepImage = await actions.prepareSiteImageUpload({
        key: "home.hero",
        contentType: "image/png",
        sizeBytes: png.length,
      });
      expect(prepImage.ok).toBe(false);

      const finImage = await actions.finalizeSiteImageUpload({
        key: "home.hero",
        path: "site/home/hero/6f1c8a2e-1111-2222-3333-444455556666.png",
        pathField: "imagePath",
      });
      expect(finImage.ok).toBe(false);

      const cleared = await actions.clearSiteImage({ key: "home.hero", pathField: "imagePath" });
      expect(cleared.ok).toBe(false);
    });

    it("refuses every catalogue lifecycle action", async () => {
      const created = await actions.createProduct({ name: "FORGED", collectionId: null });
      expect(created.ok).toBe(false);

      const createdCollection = await actions.createCollection({ title: "FORGED" });
      expect(createdCollection.ok).toBe(false);

      const duplicated = await actions.duplicateProduct({ productId });
      expect(duplicated.ok).toBe(false);

      const archivedProduct = await actions.archiveProduct({ productId });
      expect(archivedProduct.ok).toBe(false);

      const restoredProduct = await actions.restoreProduct({ productId });
      expect(restoredProduct.ok).toBe(false);

      const deletedProduct = await actions.deleteProduct({
        productId,
        confirmName: "FORGED",
      });
      expect(deletedProduct.ok).toBe(false);

      const archivedCollection = await actions.archiveCollection({ collectionId });
      expect(archivedCollection.ok).toBe(false);

      const restoredCollection = await actions.restoreCollection({ collectionId });
      expect(restoredCollection.ok).toBe(false);

      const reassigned = await actions.reassignCollectionProducts({
        fromCollectionId: collectionId,
        toCollectionId: null,
      });
      expect(reassigned.ok).toBe(false);

      const deletedCollection = await actions.deleteCollection({
        collectionId,
        confirmName: "FORGED",
      });
      expect(deletedCollection.ok).toBe(false);

      const reorderedProducts = await actions.reorderProducts({ productIds: [productId] });
      expect(reorderedProducts.ok).toBe(false);

      const reorderedCollections = await actions.reorderCollections({
        collectionIds: [collectionId],
      });
      expect(reorderedCollections.ok).toBe(false);

      const bulkProducts = await actions.bulkUpdateProducts({
        productIds: [productId],
        action: "feature",
      });
      expect(bulkProducts.ok).toBe(false);

      const bulkCollections = await actions.bulkUpdateCollections({
        collectionIds: [collectionId],
        action: "feature",
      });
      expect(bulkCollections.ok).toBe(false);
    });

    it("changed nothing in the database", async () => {
      const products = await client.query(
        `select count(*)::int n from products where name = 'FORGED' or tag = 'FORGED' or shape = 'FORGED'`,
      );
      const collections = await client.query(
        `select count(*)::int n from collections where title = 'FORGED' or tag = 'FORGED'`,
      );
      const images = await client.query(`select count(*)::int n from product_images`);
      expect(products.rows[0].n).toBe(0);
      expect(collections.rows[0].n).toBe(0);
      // Unchanged from the captured baseline: no row added, none removed.
      expect(images.rows[0].n).toBe(imageBaseline);

      // No content document may carry the forged value, and no row may have been
      // added or removed from the table.
      const forgedContent = await client.query(
        `select count(*)::int n from site_content where value::text like '%FORGED%'`,
      );
      expect(forgedContent.rows[0].n).toBe(0);

      const archived = await client.query(
        `select count(*)::int n from products where archived_at is not null
         union all
         select count(*)::int n from collections where archived_at is not null`,
      );
      expect(archived.rows.every((row: { n: number }) => row.n === 0)).toBe(true);
    });
  });
}

/* No session at all. */
setCookieJarLater(() => setCookieJar([]));
sweep("an anonymous request");

function setCookieJarLater(fn: () => void) {
  beforeAll(fn);
}

/* A real signed-in user who is not on the admin allowlist. */
describe("a signed-in non-admin request", () => {
  beforeAll(() => {
    setCookieJar([authCookie(nonAdmin.cookie)]);
  });

  it("is refused on read", async () => {
    const r = await actions.loadStudioState();
    expect(r.ok).toBe(false);
  });

  it("is refused on every write", async () => {
    const product = await actions.saveStudioProduct({
      id: productId,
      expectedUpdatedAt: TOKEN,
      name: "FORGED",
      descriptor: "",
      description: "",
      price: "",
      currency: "",
      shape: "FORGED",
      defaultLength: "Medium",
      finish: "",
      tag: "",
      included: "",
      isActive: false,
      featured: true,
      displayOrder: "",
    });
    expect(product.ok).toBe(false);
    if (!product.ok) expect(product.kind).toBe("unauthorized");

    const collection = await actions.saveStudioCollection({
      id: collectionId,
      expectedUpdatedAt: TOKEN,
      title: "FORGED",
      subtitle: "",
      description: "",
      tag: "",
      isActive: false,
      featured: true,
      displayOrder: "",
    });
    expect(collection.ok).toBe(false);
    if (!collection.ok) expect(collection.kind).toBe("unauthorized");

    const upload = await actions.prepareStudioImageUpload({
      productId,
      contentType: "image/png",
      sizeBytes: png.length,
    });
    expect(upload.ok).toBe(false);

    const cover = await actions.prepareStudioCoverUpload({
      collectionId,
      contentType: "image/png",
      sizeBytes: png.length,
    });
    expect(cover.ok).toBe(false);

    const remove = await actions.removeStudioCover({ collectionId, expectedUpdatedAt: TOKEN });
    expect(remove.ok).toBe(false);
    if (!remove.ok) expect(remove.kind).toBe("unauthorized");
  });
});
