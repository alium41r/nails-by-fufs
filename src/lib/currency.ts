/**
 * Currency: PKR, and only PKR.
 *
 * Deliberately free of `server-only` and of any database or React import, so the
 * storefront (server components), the Studio editors (client components) and the
 * unit tests all share exactly one definition of what a price looks like.
 *
 * ## One currency, enforced in three places
 *
 * This store prices in Pakistani rupees and in nothing else. There is no picker,
 * no per-product currency and no conversion, because a second currency would
 * mean a second price, a second rounding rule and an exchange rate that nothing
 * here is equipped to keep honest. The rule is enforced at every layer:
 *
 *   1. **This module** — the only formatter, and the only currency constant. The
 *      UI never receives a choice to make.
 *   2. **The write path** (`parsePricePair`, `saveStudioProduct`) — refuses a
 *      price that is not PKR, and derives the stored code server-side rather
 *      than trusting the client.
 *   3. **The database** — `products_currency_pkr`, `orders_currency_pkr` and
 *      `order_items_currency_pkr` CHECK constraints, so a row in any other
 *      currency cannot exist even if the application is bypassed.
 *
 * ## Money is stored in minor units, and that does not change here
 *
 * `products.price_minor` is an integer of minor units and `orders` records
 * `unit_price_minor`, `line_total_minor` and a `char(3)` currency. That
 * convention is what the existing order history and the database CHECK
 * constraints are written against, so this module keeps it: `formatPrice`
 * divides by 100. PKR has two decimal places, so a minor unit is one paisa.
 *
 * `majorUnitsHint` tells an owner how to type a rupee amount into a field that
 * stores paisa; `majorToMinor` and `minorToMajor` are the explicit conversions
 * for any caller that would rather collect major units. Nothing here ever
 * rewrites a stored price.
 */

/**
 * The one currency this store trades in.
 *
 * A `char(3)` column still stores the code per row — that is what keeps an
 * order's historical snapshot meaningful — but it is always this value, and the
 * database enforces it.
 */
export const STORE_CURRENCY = "PKR";

/** Plain-language name, for the few places a code alone reads as jargon. */
export const STORE_CURRENCY_LABEL = "Pakistani Rupee";

/**
 * Three uppercase letters — the shape every `char(3)` currency column stores.
 *
 * Kept even though the value is now fixed, because it is the shape half of the
 * database CHECK constraints and the first thing a malformed submission fails.
 */
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * True only for the store's currency, case-insensitively.
 *
 * Used to reject a price that claims any other currency. A stored code that is
 * NULL is *not* the store currency: "no price" is represented by the absence of
 * both the amount and the code, never by the code alone.
 */
export function isStoreCurrency(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === STORE_CURRENCY;
}

/**
 * What the storefront shows when a product has no price at all.
 *
 * The code rather than a symbol, and with a space before `XX`, so it matches
 * the exact shape `formatPrice` produces for a real amount (`PKR 4,500.00`): a
 * customer reads the placeholder as the same kind of thing as a price, just not
 * filled in yet. It is a constant string, so no store setting can make the
 * storefront and the Studio editor disagree about what "unpriced" looks like.
 */
export function pricePlaceholder(): string {
  return `${STORE_CURRENCY} XX`;
}

/**
 * The per-currency assist shown beside a minor-unit price field.
 *
 * Exists because "Price (minor units, e.g. 450000)" is a poor instruction for an
 * owner who thinks in whole rupees, and because the alternative — switching
 * storage to major units — would reinterpret every stored price and every
 * existing order line. The example is a realistic rupee amount (Rs 4,500)
 * rather than a realistic dollar amount, so the digits an owner types match the
 * magnitude they actually charge.
 */
export function majorUnitsHint(): string {
  return "Stored in minor units: type 450000 for PKR 4,500.00.";
}

/** Major (as typed) to minor (as stored). Rounds to the nearest minor unit. */
export function majorToMinor(major: number): number {
  return Math.round(major * 100);
}

/** Minor (as stored) to major (as displayed in a form field). */
export function minorToMajor(minor: number | null | undefined): number | null {
  if (minor === null || minor === undefined) return null;
  return minor / 100;
}

/**
 * Formats a stored price for display, or the placeholder when there is none.
 *
 * Kept as `PKR 4,500.00` rather than Intl's currency style because that is
 * exactly what the storefront, the admin catalogue list and the Studio price
 * field already rendered (`USD 10.00`), and because it is locale-independent: an
 * `Intl.NumberFormat` call resolves its default locale differently on the server
 * and in the browser, which is a hydration mismatch on a price. The grouping
 * separator is deliberately absent for the same reason — `toFixed` is the one
 * formatting primitive that cannot vary between the two.
 *
 * The currency is not a parameter. Passing one would leave a code path that can
 * render a currency the store does not accept.
 */
export function formatPrice(priceMinor: number | null | undefined): string {
  if (priceMinor === null || priceMinor === undefined) return pricePlaceholder();
  return `${STORE_CURRENCY} ${(priceMinor / 100).toFixed(2)}`;
}

/**
 * A price without an amount is not a price: this is the checkout-eligibility
 * rule.
 *
 * The stored currency code is not consulted. `products_price_currency_pair`
 * already guarantees amount and code are present or absent together, and the
 * PKR constraint guarantees the code's value, so testing the amount is both
 * necessary and sufficient.
 */
export function isPriced(priceMinor: number | null | undefined): boolean {
  return priceMinor !== null && priceMinor !== undefined;
}
