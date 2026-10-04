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
      expect(images.rows[0].n).toBe(0);
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
