/**
 * Checkout form contract (frontend).
 *
 * This file is the single description of what the checkout UI collects. The
 * backend phase should treat `CheckoutFormState` / `CheckoutSubmission` as the
 * input contract and re-validate everything on the server — the client
 * validation below is for presentation only and is never authoritative.
 *
 * Deliberately NOT collected here: prices, totals, shipping fees, tax,
 * discounts or payment-method data. Those are decided server-side.
 */

export interface CheckoutFormState {
  // Contact
  fullName: string;
  email: string;
  phone: string;
  // Delivery
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  deliveryNotes: string;
}

export type CheckoutFieldName = keyof CheckoutFormState;
export type CheckoutErrors = Partial<Record<CheckoutFieldName, string>>;

export const INITIAL_CHECKOUT_STATE: CheckoutFormState = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  deliveryNotes: "",
};

/** Top-to-bottom order of the fields on the page; used to focus the first error. */
export const CHECKOUT_FIELD_ORDER: CheckoutFieldName[] = [
  "fullName",
  "email",
  "phone",
  "country",
  "addressLine1",
  "addressLine2",
  "city",
  "region",
  "postalCode",
  "deliveryNotes",
];

/** DOM id for each field, so errors can move focus to the right control. */
export const checkoutFieldId = (field: CheckoutFieldName) => `checkout-${field}`;

/** Maximum lengths, mirrored as `maxLength` on the inputs. */
export const CHECKOUT_FIELD_LIMITS: Record<CheckoutFieldName, number> = {
  fullName: 100,
  email: 254,
  phone: 24,
  country: 80,
  addressLine1: 150,
  addressLine2: 150,
  city: 80,
  region: 80,
  postalCode: 20,
  deliveryNotes: 500,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS_PATTERN = /^[+()\d\s.-]+$/;

/** Returns an error message for one field, or `undefined` when it is valid. */
export function validateCheckoutField(
  field: CheckoutFieldName,
  rawValue: string,
): string | undefined {
  const value = rawValue.trim();

  switch (field) {
    case "fullName":
      if (!value) return "Please enter your full name";
      return undefined;

    case "email":
      if (!value) return "Please enter your email address";
      if (!EMAIL_PATTERN.test(value)) return "Please enter a valid email address";
      return undefined;

    case "phone": {
      if (!value) return "Please enter a phone number";
      const digits = value.replace(/\D/g, "");
      if (!PHONE_CHARS_PATTERN.test(value) || digits.length < 7 || digits.length > 15) {
        return "Please enter a valid phone number";
      }
      return undefined;
    }

    case "country":
      if (!value) return "Please enter your country";
      return undefined;

    case "addressLine1":
      if (!value) return "Please enter your street address";
      return undefined;

    case "city":
      if (!value) return "Please enter your city";
      return undefined;

    // Optional: addressLine2, region, postalCode, deliveryNotes.
    default:
      return undefined;
  }
}

/** Validates the whole form. An empty object means the form is valid. */
export function validateCheckoutForm(state: CheckoutFormState): CheckoutErrors {
  const errors: CheckoutErrors = {};

  for (const field of CHECKOUT_FIELD_ORDER) {
    const message = validateCheckoutField(field, state[field]);
    if (message) errors[field] = message;
  }

  return errors;
}

/** Trims every value; call this on the payload just before it is submitted. */
export function trimCheckoutForm(state: CheckoutFormState): CheckoutFormState {
  const entries = CHECKOUT_FIELD_ORDER.map((field) => [field, state[field].trim()] as const);
  return Object.fromEntries(entries) as unknown as CheckoutFormState;
}

/**
 * What the checkout sends to the server. Line items carry identity, options and
 * quantity only — exactly like the existing `placeOrder` input in
 * `src/app/cart/actions.ts`. `orderToken` is the same client-minted idempotency
 * UUID used by the bag.
 */
export interface CheckoutSubmission {
  orderToken: string;
  items: { productId: string; size: string; length: string; quantity: number }[];
  customer: Pick<CheckoutFormState, "fullName" | "email" | "phone">;
  delivery: Pick<
    CheckoutFormState,
    "country" | "addressLine1" | "addressLine2" | "city" | "region" | "postalCode" | "deliveryNotes"
  >;
}

/** What the UI expects back. `fieldErrors` are shown inline next to the fields. */
export type CheckoutSubmitResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: CheckoutErrors; details?: string[] };
