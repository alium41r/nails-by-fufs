import { describe, expect, it } from "vitest";

import {
  MAX_LINE_ITEMS,
  MAX_QUANTITY_PER_LINE,
  SIZE_IDS,
  SIZE_LABELS,
  formatMinorUnits,
  isValidCurrency,
  isValidOrderToken,
  validateOrderLines,
} from "@/lib/order-validation";

const PRODUCT_A = "11111111-1111-4111-8111-111111111111";
const PRODUCT_B = "22222222-2222-4222-8222-222222222222";
const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";

const line = (overrides: Record<string, unknown> = {}) => ({
  productId: PRODUCT_A,
  size: "m",
  length: "Medium",
  quantity: 1,
  ...overrides,
});

describe("validateOrderLines", () => {
  it("accepts what the cart actually holds", () => {
    const result = validateOrderLines([line(), line({ productId: PRODUCT_B, size: "custom", length: "Long" })]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.lines).toEqual([
      { productId: PRODUCT_A, size: "m", length: "Medium", quantity: 1 },
      { productId: PRODUCT_B, size: "custom", length: "Long", quantity: 1 },
    ]);
  });

  it("rejects an empty or malformed bag", () => {
    expect(validateOrderLines([])).toMatchObject({ ok: false, code: "empty_cart" });
    for (const bad of [undefined, null, "items", 42, {}]) {
      expect(validateOrderLines(bad), String(bad)).toMatchObject({ ok: false, code: "invalid_input" });
    }
  });

  it("rejects product ids that are not catalogue uuids", () => {
    for (const productId of ["", "glazed-truffle", "../../etc/passwd", "1; drop table orders"]) {
      expect(validateOrderLines([line({ productId })]), productId).toMatchObject({
        ok: false,
        code: "invalid_input",
      });
    }
  });

  it("accepts only the option ids the storefront offers, case-insensitively", () => {
    for (const size of SIZE_IDS) {
      expect(validateOrderLines([line({ size })]).ok, size).toBe(true);
    }
    expect(validateOrderLines([line({ size: "M" })]).ok).toBe(true);
    expect(validateOrderLines([line({ size: "xxl" })]).ok).toBe(false);

    for (const length of ["Short", "Medium", "Long"]) {
      expect(validateOrderLines([line({ length })]).ok, length).toBe(true);
    }
    for (const length of ["short", "XL", ""]) {
      expect(validateOrderLines([line({ length })]), length).toMatchObject({ ok: false });
    }
  });

  it("bounds quantities like the cart does", () => {
    expect(validateOrderLines([line({ quantity: 1 })]).ok).toBe(true);
    expect(validateOrderLines([line({ quantity: MAX_QUANTITY_PER_LINE })]).ok).toBe(true);
    for (const quantity of [0, -1, MAX_QUANTITY_PER_LINE + 1, 1.5, Number.NaN, "3", null]) {
      expect(validateOrderLines([line({ quantity })]), String(quantity)).toMatchObject({
        ok: false,
        code: "invalid_input",
      });
    }
  });

  it("ignores price-shaped fields from the client", () => {
    const result = validateOrderLines([
      { ...line(), price: 1, unitPriceMinor: 1, currency: "XXX", lineTotalMinor: 1, name: "Free Set" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Nothing but identity, options and quantity survives validation.
    expect(Object.keys(result.lines[0]).sort()).toEqual(["length", "productId", "quantity", "size"]);
  });

  it("merges duplicate configurations and caps the merged quantity", () => {
    const result = validateOrderLines([
      line({ quantity: 2 }),
      line({ quantity: 3 }),
      line({ productId: PRODUCT_B, quantity: MAX_QUANTITY_PER_LINE }),
      line({ productId: PRODUCT_B, quantity: MAX_QUANTITY_PER_LINE }),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // First-seen order preserved; duplicates summed, then clamped.
    expect(result.lines).toEqual([
      { productId: PRODUCT_A, size: "m", length: "Medium", quantity: 5 },
      { productId: PRODUCT_B, size: "m", length: "Medium", quantity: MAX_QUANTITY_PER_LINE },
    ]);
  });

  it("bounds how many lines one order may contain", () => {
    const many = Array.from({ length: MAX_LINE_ITEMS + 1 }, (_, index) =>
      line({ productId: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111` }),
    );
    expect(validateOrderLines(many)).toMatchObject({ ok: false, code: "invalid_input" });
    expect(validateOrderLines(many.slice(0, MAX_LINE_ITEMS)).ok).toBe(true);
  });
});

describe("order tokens and money", () => {
  it("recognises well-formed idempotency tokens only", () => {
    expect(isValidOrderToken(TOKEN)).toBe(true);
    expect(isValidOrderToken(TOKEN.replace(/-/g, ""))).toBe(false);
    expect(isValidOrderToken("")).toBe(false);
    expect(isValidOrderToken(null)).toBe(false);
    expect(isValidOrderToken(123)).toBe(false);
  });

  it("recognises ISO-4217 style currency codes only", () => {
    expect(isValidCurrency("USD")).toBe(true);
    expect(isValidCurrency("eur")).toBe(false);
    expect(isValidCurrency("US")).toBe(false);
    expect(isValidCurrency("USDD")).toBe(false);
    expect(isValidCurrency(null)).toBe(false);
  });

  it("formats authoritative minor-unit totals without floating point drift", () => {
    expect(formatMinorUnits(4500, "USD")).toBe("USD 45.00");
    expect(formatMinorUnits(0, "USD")).toBe("USD 0.00");
    expect(formatMinorUnits(5, "USD")).toBe("USD 0.05");
    expect(formatMinorUnits(10200, "EUR")).toBe("EUR 102.00");
    expect(formatMinorUnits(999999, "GBP")).toBe("GBP 9999.99");
  });

  it("keeps one label source for the snapshot", () => {
    expect(SIZE_LABELS).toEqual({ xs: "XS", s: "S", m: "M", l: "L", custom: "Custom" });
  });
});
