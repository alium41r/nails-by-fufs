"use server";

import { createOrderFromCart, type CreateOrderResult } from "@/lib/order-server";
import { isValidOrderToken } from "@/lib/order-validation";
import { getPrisma } from "@/lib/prisma/db";

/**
 * Places an order from the cart.
 *
 * Accepts only what the cart actually holds — product identity, selected
 * options and quantity — plus a client-minted idempotency token. Prices,
 * currency and totals are computed from the catalogue inside
 * `createOrderFromCart`; anything price-shaped sent by the browser is ignored.
 */

export type PlaceOrderResult = CreateOrderResult;

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const orderToken = input.orderToken;

  if (!isValidOrderToken(orderToken)) {
    return {
      ok: false,
      code: "invalid_input",
      message: "This order could not be identified. Please reload the page and try again.",
    };
  }

  try {
    // One transaction, so an order never exists without its items.
    return await getPrisma().$transaction((tx) =>
      createOrderFromCart(tx, input.items, orderToken),
    );
  } catch {
    return {
      ok: false,
      code: "server_error",
      message: "We could not place your order just now. Your bag is unchanged — please try again.",
    };
  }
}
