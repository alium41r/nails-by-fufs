import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { adminEmails, adminUserIds, isAdminConfigured, isAdminUser } from "@/config/admin";
import {
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_TYPES,
  isCollectionCoverPath,
  isProductImagePath,
  isUuid,
} from "@/lib/admin/paths";

/* -------------------------------------------------------------------------- */
/* Allowlist: the authorisation model                                          */
/* -------------------------------------------------------------------------- */

describe("admin allowlist", () => {
  const original = { emails: process.env.ADMIN_EMAILS, ids: process.env.ADMIN_USER_IDS };

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "Owner@Example.com, second@example.com ";
    process.env.ADMIN_USER_IDS = "";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = original.emails;
    process.env.ADMIN_USER_IDS = original.ids;
  });

  it("parses a comma-separated list, trimming and lowercasing", () => {
    expect(adminEmails()).toEqual(["owner@example.com", "second@example.com"]);
  });

  it("treats a listed email as admin regardless of case", () => {
    expect(isAdminUser({ email: "owner@example.com" })).toBe(true);
    expect(isAdminUser({ email: "OWNER@EXAMPLE.COM" })).toBe(true);
    expect(isAdminUser({ email: " second@example.com " })).toBe(true);
  });

  it("refuses any email that is not listed", () => {
    expect(isAdminUser({ email: "stranger@example.com" })).toBe(false);
    expect(isAdminUser({ email: "owner@example.com.evil.test" })).toBe(false);
    expect(isAdminUser({ email: "" })).toBe(false);
    expect(isAdminUser({})).toBe(false);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it("also accepts an allowlisted user id", () => {
    process.env.ADMIN_EMAILS = "";
    process.env.ADMIN_USER_IDS = "11111111-2222-4333-8444-555555555555";
    expect(adminUserIds()).toEqual(["11111111-2222-4333-8444-555555555555"]);
    expect(isAdminUser({ id: "11111111-2222-4333-8444-555555555555" })).toBe(true);
    expect(isAdminUser({ id: "99999999-2222-4333-8444-555555555555" })).toBe(false);
  });

  it("is unconfigured when neither list is set, so nobody is an admin", () => {
    process.env.ADMIN_EMAILS = "";
    process.env.ADMIN_USER_IDS = "";
    expect(isAdminConfigured()).toBe(false);
    expect(isAdminUser({ email: "owner@example.com" })).toBe(false);
  });

  it("ignores empty entries and stray commas", () => {
    process.env.ADMIN_EMAILS = " ,owner@example.com,, ";
    expect(adminEmails()).toEqual(["owner@example.com"]);
    expect(isAdminConfigured()).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Path scoping: the arbitrary-path boundary                                   */
/* -------------------------------------------------------------------------- */

const PRODUCT = "11111111-2222-4333-8444-555555555555";
const OTHER_PRODUCT = "99999999-2222-4333-8444-555555555555";
const COLLECTION = "22222222-3333-4444-8555-666666666666";
const OBJECT = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const productPath = `products/${PRODUCT}/${OBJECT}.jpg`;
const coverPath = `collections/${COLLECTION}/${OBJECT}.png`;

describe("product image paths", () => {
  it("accepts a server-generated path inside the product's own folder", () => {
    expect(isProductImagePath(productPath, PRODUCT)).toBe(true);
    expect(isProductImagePath(`products/${PRODUCT}/${OBJECT}.webp`, PRODUCT)).toBe(true);
  });

  it("refuses another product's folder", () => {
    expect(isProductImagePath(`products/${OTHER_PRODUCT}/${OBJECT}.jpg`, PRODUCT)).toBe(false);
    expect(isProductImagePath(productPath, OTHER_PRODUCT)).toBe(false);
  });

  it("refuses traversal, absolute paths, nested folders and wrong types", () => {
    expect(isProductImagePath(`products/${PRODUCT}/../${OTHER_PRODUCT}/${OBJECT}.jpg`, PRODUCT)).toBe(false);
    expect(isProductImagePath(`/${productPath}`, PRODUCT)).toBe(false);
    expect(isProductImagePath(`products/${PRODUCT}/nested/${OBJECT}.jpg`, PRODUCT)).toBe(false);
    expect(isProductImagePath(`products/${PRODUCT}/${OBJECT}.svg`, PRODUCT)).toBe(false);
    expect(isProductImagePath(`products/${PRODUCT}/${OBJECT}`, PRODUCT)).toBe(false);
    expect(isProductImagePath("", PRODUCT)).toBe(false);
    expect(isProductImagePath(null, PRODUCT)).toBe(false);
    expect(isProductImagePath(42, PRODUCT)).toBe(false);
  });

  it("refuses a non-uuid product id even with a matching path", () => {
    expect(isProductImagePath(`products/not-a-uuid/${OBJECT}.jpg`, "not-a-uuid")).toBe(false);
  });
});

describe("collection cover paths", () => {
  it("accepts only the collection's own folder", () => {
    expect(isCollectionCoverPath(coverPath, COLLECTION)).toBe(true);
    expect(isCollectionCoverPath(coverPath, PRODUCT)).toBe(false);
    expect(isCollectionCoverPath(`collections/${COLLECTION}/${OBJECT}.svg`, COLLECTION)).toBe(false);
    expect(isCollectionCoverPath(`collections/${COLLECTION}/../${PRODUCT}/${OBJECT}.png`, COLLECTION)).toBe(false);
    expect(isCollectionCoverPath(productPath, COLLECTION)).toBe(false);
  });

  it("keeps the two namespaces separate", () => {
    expect(isProductImagePath(coverPath, COLLECTION)).toBe(false);
    expect(isCollectionCoverPath(productPath, PRODUCT)).toBe(false);
  });
});

describe("storage limits", () => {
  it("exposes one technical bound used by both the action and the bucket", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
    expect([...ALLOWED_IMAGE_TYPES]).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
      "image/gif",
    ]);
  });

  it("recognises uuid identifiers", () => {
    expect(isUuid(PRODUCT)).toBe(true);
    expect(isUuid(OBJECT.replace(/-/g, ""))).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
