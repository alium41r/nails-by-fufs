/**
 * Order validation and money helpers.
 *
 * Pure and dependency-free (no Prisma, no `server-only`) so the same rules run
 * on the server as the authority and can be unit-tested directly.
 *
 * Everything is derived from what the cart already collects:
 *   src/providers/CartProvider.tsx — product id, selected size, selected length,
 *   quantity (clamped to 10), and a composite line id of
 *   `<productId>__size-<size>__len-<length>`.
 *   src/components/shop/ProductOptions.tsx — the size ids and length labels.
 *
 * The browser is untrusted: nothing here accepts a price, currency, product
 * name or total from the client. Only identity, options and quantity are read
 * from the request; money is derived server-side from the catalogue.
 */

/** Size options, mirroring ProductOptions.tsx. Single source for cart + server. */
export const SIZE_LABELS = {
  xs: "XS",
  s: "S",
  m: "M",
  l: "L",
  custom: "Custom",
} as const;

export type SizeId = keyof typeof SIZE_LABELS;
export const SIZE_IDS = Object.keys(SIZE_LABELS) as SizeId[];

/** Length options, mirroring ProductOptions.tsx. */
export const ORDER_LENGTHS = ["Short", "Medium", "Long"] as const;
export type OrderLength = (typeof ORDER_LENGTHS)[number];

/** Mirrors the cart's own per-line clamp. */
export const MAX_QUANTITY_PER_LINE = 10;
/** Technical bound: how many distinct lines one order may contain. */
export const MAX_LINE_ITEMS = 20;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export type OrderErrorCode =
  | "empty_cart"
  | "invalid_input"
  | "unavailable"
  | "unpriced"
  | "currency_mismatch"
  | "server_error";

/** Authoritative order summary returned to the UI after a confirmed creation. */
export interface OrderSummary {
  orderId: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  totalMinor: number;
  totalQuantity: number;
  lineCount: number;
}

export interface OrderLineInput {
  productId: string;
  size: SizeId;
  length: OrderLength;
  quantity: number;
}

export type OrderLinesResult =
  | { ok: true; lines: OrderLineInput[] }
  | { ok: false; code: OrderErrorCode; message: string };

export function isValidOrderToken(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && CURRENCY_PATTERN.test(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Validates the client's line items and merges duplicate configurations.
 *
 * Duplicates are summed rather than rejected: the cart already keys lines by
 * product+size+length, so a duplicate can only come from a tampered payload, and
 * silently merging keeps the authoritative total correct (capped like the cart).
 */
export function validateOrderLines(raw: unknown): OrderLinesResult {
  if (!Array.isArray(raw)) {
    return { ok: false, code: "invalid_input", message: "This order could not be read. Please reload and try again." };
  }
  if (raw.length === 0) {
    return { ok: false, code: "empty_cart", message: "Your bag is empty." };
  }
  if (raw.length > MAX_LINE_ITEMS) {
    return {
      ok: false,
      code: "invalid_input",
      message: `A single order can contain up to ${MAX_LINE_ITEMS} sets. Please split this order or contact the studio.`,
    };
  }

  const merged = new Map<string, OrderLineInput>();

  for (const entry of raw) {
    const line = asRecord(entry);

    const productId = typeof line.productId === "string" ? line.productId : "";
    if (!UUID_PATTERN.test(productId)) {
      return { ok: false, code: "invalid_input", message: "This bag contains an item we cannot order. Please review your bag." };
    }

    const size = typeof line.size === "string" ? line.size.toLowerCase() : "";
    if (!SIZE_IDS.includes(size as SizeId)) {
      return { ok: false, code: "invalid_input", message: "Please choose a size for every set in your bag." };
    }

    const length = typeof line.length === "string" ? line.length : "";
    if (!ORDER_LENGTHS.includes(length as OrderLength)) {
      return { ok: false, code: "invalid_input", message: "Please choose a length for every set in your bag." };
    }

    const quantity = typeof line.quantity === "number" ? line.quantity : Number.NaN;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      return {
        ok: false,
        code: "invalid_input",
        message: `Quantities must be whole numbers between 1 and ${MAX_QUANTITY_PER_LINE}.`,
      };
    }

    const key = `${productId}__size-${size}__len-${length}`;
    const existing = merged.get(key);
    merged.set(key, {
      productId,
      size: size as SizeId,
      length: length as OrderLength,
      quantity: Math.min(MAX_QUANTITY_PER_LINE, (existing?.quantity ?? 0) + quantity),
    });
  }

  return { ok: true, lines: [...merged.values()] };
}

/** Deterministic display formatting for an authoritative server total. */
export function formatMinorUnits(minor: number, currency: string): string {
  return `${currency} ${(minor / 100).toFixed(2)}`;
}
