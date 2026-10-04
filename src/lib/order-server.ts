import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  SIZE_LABELS,
  isValidCurrency,
  validateOrderLines,
  type OrderErrorCode,
  type OrderSummary,
} from "@/lib/order-validation";

/**
 * Server-authoritative order creation.
 *
 * The take-a-client signature is deliberate: the server action runs this inside
 * a transaction so an order and its items are written atomically, and tests can
 * run the exact production code path inside a transaction they roll back.
 *
 * Prices are never taken from the request. Each line is re-priced from the
 * catalogue, and the catalogue currently has no verified prices, so unpriced
 * items are refused outright instead of being given a placeholder value.
 */

export type { OrderSummary };

export type CreateOrderResult =
  | { ok: true; order: OrderSummary; alreadyExisted: boolean }
  | { ok: false; code: OrderErrorCode; message: string; details?: string[] };

function summarise(
  order: { id: string; status: string; currency: string; subtotal_minor: number; total_minor: number },
  items: { quantity: number }[],
  alreadyExisted: boolean,
): CreateOrderResult {
  return {
    ok: true,
    alreadyExisted,
    order: {
      orderId: order.id,
      status: order.status,
      currency: order.currency,
      subtotalMinor: order.subtotal_minor,
      totalMinor: order.total_minor,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      lineCount: items.length,
    },
  };
}

export async function createOrderFromCart(
  db: Prisma.TransactionClient,
  rawItems: unknown,
  orderToken: string,
): Promise<CreateOrderResult> {
  // Idempotency first: a retry with the same token returns the original order
  // rather than creating a second one, and never re-prices it.
  const existing = await db.orders.findUnique({
    where: { order_token: orderToken },
    include: { order_items: { select: { quantity: true } } },
  });
  if (existing) return summarise(existing, existing.order_items, true);

  const parsed = validateOrderLines(rawItems);
  if (!parsed.ok) return { ok: false, code: parsed.code, message: parsed.message };
  const lines = parsed.lines;

  const products = await db.products.findMany({
    where: { id: { in: lines.map((line) => line.productId) } },
    select: {
      id: true,
      slug: true,
      name: true,
      descriptor: true,
      shape: true,
      finish: true,
      price_minor: true,
      currency: true,
      is_active: true,
      collections: { select: { slug: true, is_active: true } },
    },
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  const unavailable: string[] = [];
  const unpriced: string[] = [];
  const currencies = new Set<string>();
  const priced: {
    line: (typeof lines)[number];
    product: (typeof products)[number];
    currency: string;
    unitPriceMinor: number;
  }[] = [];

  for (const line of lines) {
    const product = byId.get(line.productId);

    // Missing, unpublished, or inside an unpublished collection: not orderable.
    if (!product || !product.is_active || !product.collections.is_active) {
      unavailable.push(product?.name ?? "A set in your bag");
      continue;
    }

    if (product.price_minor === null || !isValidCurrency(product.currency)) {
      unpriced.push(product.name);
      continue;
    }

    currencies.add(product.currency);
    priced.push({
      line,
      product,
      currency: product.currency,
      unitPriceMinor: product.price_minor,
    });
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      code: "unavailable",
      message: "Some sets in your bag are no longer available. Please review your bag and try again.",
      details: unavailable,
    };
  }

  if (unpriced.length > 0) {
    // Production behaviour while the catalogue has no verified prices: refuse,
    // never invent a number.
    return {
      ok: false,
      code: "unpriced",
      message:
        "Some sets in your bag do not have a verified price yet, so this order cannot be placed.",
      details: unpriced,
    };
  }

  if (currencies.size !== 1) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "Your bag mixes sets priced in different currencies, so it cannot be ordered as one order.",
    };
  }

  const currency = [...currencies][0];
  const subtotalMinor = priced.reduce(
    (sum, entry) => sum + entry.unitPriceMinor * entry.line.quantity,
    0,
  );

  const order = await db.orders.create({
    data: {
      order_token: orderToken,
      currency,
      subtotal_minor: subtotalMinor,
      // No shipping, tax or discount is collected by the current UI, and the
      // database enforces total = subtotal until B6 introduces fees.
      total_minor: subtotalMinor,
      status: "pending_payment",
    },
  });

  await db.order_items.createMany({
    data: priced.map((entry) => ({
      order_id: order.id,
      product_id: entry.product.id,
      // Immutable snapshot: everything the customer saw, copied at purchase time.
      product_slug: entry.product.slug,
      product_name: entry.product.name,
      product_descriptor: entry.product.descriptor,
      product_shape: entry.product.shape,
      product_finish: entry.product.finish,
      collection_slug: entry.product.collections.slug,
      selected_size: entry.line.size,
      selected_size_label: SIZE_LABELS[entry.line.size],
      selected_length: entry.line.length,
      unit_price_minor: entry.unitPriceMinor,
      currency: entry.currency,
      quantity: entry.line.quantity,
      line_total_minor: entry.unitPriceMinor * entry.line.quantity,
    })),
  });

  return summarise(
    order,
    priced.map((entry) => ({ quantity: entry.line.quantity })),
    false,
  );
}
