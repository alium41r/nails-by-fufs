/**
 * Currency: the supported list, the store default, and price formatting.
 *
 * Deliberately free of `server-only` and of any database or React import, so the
 * storefront (server components), the Studio editors (client components) and the
 * unit tests all share exactly one definition of what a price looks like.
 *
 * ## Money is stored in minor units, and that does not change here
 *
 * `products.price_minor` is an integer of minor units and `orders` already
 * records `unit_price_minor`, `line_total_minor` and a `char(3)` currency. That
 * convention is what the existing order history and the database CHECK
 * constraints are written against, so this module keeps it: `formatPrice`
 * divides by 100 for every currency.
 *
 * Adding PKR therefore does NOT introduce a second storage convention. The
 * owner's helper (`majorUnitsHint`) tells them how to type a rupee amount into a
 * field that stores minor units, and `majorToMinor`/`minorToMajor` are the
 * explicit conversions used by the admin form. Nothing here ever rewrites a
 * stored price: switching the default currency leaves every existing row alone.
 *
 * ## Why a fixed list rather than free text
 *
 * A `char(3)` column accepts any three uppercase letters, so a typo ("USDD" is
 * rejected by the CHECK, but "PKA" is not) would be stored happily and then
 * render as a currency no customer recognises. The list below is the validation
 * boundary for new price entry; existing stored values are always rendered even
 * if they are not in it, so tightening this list can never blank out a price
 * that is already live.
 */

export interface CurrencyOption {
  /** ISO 4217 alphabetic code, as stored. */
  code: string;
  /** Symbol shown when the code itself would be noisy. */
  symbol: string;
  /** Plain-language name, for the picker. */
  label: string;
  /**
   * Decimal places in the currency's own convention. Only used for the
   * "how to type this" hint and the major/minor conversion — storage is always
   * minor units, so a 0-decimal currency simply means the minor and major unit
   * coincide.
   */
  decimals: number;
}

/**
 * The currencies the admin can select. PKR leads because the studio is in
 * Lahore and prices in Pakistan; USD, CAD, GBP, EUR and AUD were the set the
 * Studio editor already offered, plus AED and SAR for the wider region.
 */
export const CURRENCIES: readonly CurrencyOption[] = [
  { code: "PKR", symbol: "Rs", label: "Pakistani Rupee", decimals: 2 },
  { code: "USD", symbol: "$", label: "US Dollar", decimals: 2 },
  { code: "GBP", symbol: "£", label: "Pound Sterling", decimals: 2 },
  { code: "EUR", symbol: "€", label: "Euro", decimals: 2 },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar", decimals: 2 },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", decimals: 2 },
  { code: "AED", symbol: "AED", label: "UAE Dirham", decimals: 2 },
  { code: "SAR", symbol: "SAR", label: "Saudi Riyal", decimals: 2 },
] as const;

/** Three uppercase letters — the same rule as the `products_currency_format` CHECK. */
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * Fallback when no default is configured, and the value the seeded
 * `site.currency` uses. Chosen because it is what the one existing priced
 * product row already stores, so the migrated storefront shows exactly what it
 * showed before.
 */
export const FALLBACK_CURRENCY = "USD";

/**
 * What the storefront shows when a product has no price at all.
 *
 * This used to be the literal `"$XX"` in `src/lib/catalogue.ts` — a dollar sign
 * hardcoded on a store that may price in rupees. It is now derived from the
 * store's configured default currency so the placeholder names the right money.
 *
 * The *symbol* is used rather than the code, and with no space before the `XX`,
 * so the value stays byte-identical to what the storefront already rendered for
 * the currency it already used: with the default set to USD this produces exactly
 * `$XX`, which is what customers see today. Changing the default currency changes
 * only this placeholder — never a stored price.
 */
export function pricePlaceholder(currency: string | null | undefined): string {
  const code = normalizeCurrency(currency) ?? FALLBACK_CURRENCY;
  const option = CURRENCIES.find((entry) => entry.code === code);
  return `${option?.symbol ?? code}XX`;
}

/** Upper-cases and validates a candidate code, or returns null. */
export function normalizeCurrency(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toUpperCase();
  return CURRENCY_PATTERN.test(trimmed) ? trimmed : null;
}

/** True when the code is one the picker offers. */
export function isKnownCurrency(value: string | null | undefined): boolean {
  const code = normalizeCurrency(value);
  return code !== null && CURRENCIES.some((currency) => currency.code === code);
}

export function currencyOption(code: string | null | undefined): CurrencyOption | undefined {
  const normalized = normalizeCurrency(code);
  return CURRENCIES.find((currency) => currency.code === normalized);
}

/**
 * The per-currency assist shown beside a minor-unit price field.
 *
 * Exists because "Price (minor units, e.g. 4500 = 45.00)" is a poor instruction
 * for an owner who thinks in whole rupees, and because the alternative —
 * switching storage to major units — would reinterpret every stored price and
 * every existing order line.
 */
export function majorUnitsHint(code: string | null | undefined): string {
  const option = currencyOption(code);
  if (!option) return "Stored as minor units: type 4500 for 45.00.";

  if (option.decimals === 0) {
    return `Stored in minor units. ${option.code} has no decimal places, so type 4500 for ${option.code} 4,500.00 and 450000 for ${option.code} 450,000.00.`;
  }

  const example = option.code === "PKR" ? 450000 : 4500;
  return `Stored in minor units: type ${example.toLocaleString("en-US")} for ${option.code} ${(example / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;
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
 * Formats a stored price for display.
 *
 * Kept as `CODE amount` rather than Intl's currency style because that is
 * exactly what the storefront, the admin catalogue list and the Studio price
 * field already rendered (`USD 10.00`), and because it is locale-independent: an
 * `Intl.NumberFormat` call resolves its default locale differently on the server
 * and in the browser, which is a hydration mismatch on a price.
 */
export function formatPrice(
  priceMinor: number | null | undefined,
  currency: string | null | undefined,
): string {
  const code = normalizeCurrency(currency);
  if (priceMinor === null || priceMinor === undefined || code === null) {
    return pricePlaceholder(currency);
  }
  return `${code} ${(priceMinor / 100).toFixed(2)}`;
}

/** A price without a currency is not a price: this is the checkout-eligibility rule. */
export function isPriced(
  priceMinor: number | null | undefined,
  currency: string | null | undefined,
): boolean {
  return priceMinor !== null && priceMinor !== undefined && normalizeCurrency(currency) !== null;
}

/**
 * The currencies to offer in a picker, with the store's default first.
 *
 * Ordering matters for usability: the owner prices in one currency almost all of
 * the time, so putting the configured default at the top means the common case is
 * a single keystroke rather than a scroll. A stored code that is not in
 * `CURRENCIES` (possible historically, since the column is any three uppercase
 * letters) is appended so an existing value is never silently unreachable — the
 * editor can always show what is actually stored.
 */
export function currenciesForPicker(storeDefault: string | null | undefined): CurrencyOption[] {
  const preferred = normalizeCurrency(storeDefault) ?? FALLBACK_CURRENCY;
  const ordered = [...CURRENCIES].sort((a, b) => {
    if (a.code === preferred) return -1;
    if (b.code === preferred) return 1;
    return 0;
  });

  if (!CURRENCIES.some((currency) => currency.code === preferred)) {
    ordered.unshift({ code: preferred, symbol: preferred, label: preferred, decimals: 2 });
  }
  return ordered;
}
