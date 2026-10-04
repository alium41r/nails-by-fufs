"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { useCart } from "@/providers/CartProvider";
import {
  CHECKOUT_FIELD_LIMITS,
  CHECKOUT_FIELD_ORDER,
  INITIAL_CHECKOUT_STATE,
  checkoutFieldId,
  trimCheckoutForm,
  validateCheckoutField,
  validateCheckoutForm,
  type CheckoutErrors,
  type CheckoutFieldName,
  type CheckoutFormState,
  type CheckoutSubmission,
  type CheckoutSubmitResult,
} from "@/data/checkout";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKEND SEAM
 *
 * `submitCheckout` is the only place the UI talks to the server. It currently
 * does nothing real: no order is created, no payment is started and no customer
 * data leaves the browser. Replace the body with a server action that
 * (1) re-validates the payload, (2) creates/looks up the order using
 * `submission.orderToken` for idempotency (see `placeOrder` in
 * `src/app/cart/actions.ts`), and (3) starts payment.
 *
 * The UI already renders everything in `CheckoutSubmitResult`: a top-level
 * `message`, optional `details` bullets, and per-field `fieldErrors`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function submitCheckout(submission: CheckoutSubmission): Promise<CheckoutSubmitResult> {
  void submission;
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    ok: false,
    message:
      "Online payment isn’t available yet, so this order can’t be completed. Your details were not sent and your bag is unchanged.",
  };
}

const noopSubscribe = () => () => {};

/** `false` during server render and hydration, `true` afterwards. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  id,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow text-accent tracking-[0.2em]">
        {index} / {eyebrow}
      </span>
      <h2 id={id} className="font-display font-light text-2xl sm:text-3xl text-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground font-sans">{description}</p>
      )}
    </div>
  );
}

function AlertBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-left"
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="flex flex-col gap-10 animate-pulse" aria-busy="true" aria-label="Loading checkout">
      <div className="flex flex-col gap-3 border-b border-border pb-6">
        <div className="h-3 w-24 bg-surface-subtle" />
        <div className="h-10 w-56 bg-surface-subtle" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-20">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5 order-last lg:order-first">
          <div className="h-8 w-48 bg-surface-subtle" />
          <div className="h-11 w-full bg-surface-subtle" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-11 bg-surface-subtle" />
            <div className="h-11 bg-surface-subtle" />
          </div>
        </div>
        <div className="lg:col-span-5 xl:col-span-4 order-first lg:order-last">
          <div className="h-16 lg:h-80 bg-surface-subtle border border-border" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutContent() {
  const { items, totalItems, subtotalPlaceholder } = useCart();
  const hydrated = useHydrated();

  const [formData, setFormData] = useState<CheckoutFormState>(INITIAL_CHECKOUT_STATE);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitDetails, setSubmitDetails] = useState<string[] | null>(null);

  // Idempotency key for the current bag. Reused across retries of the same bag
  // and discarded whenever the bag changes — the same pattern the bag used.
  const orderTokenRef = useRef<string | null>(null);
  useEffect(() => {
    orderTokenRef.current = null;
  }, [items]);

  const errorCount = Object.keys(errors).length;

  const handleChange = (field: CheckoutFieldName, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Format errors surface as soon as a filled field is left; "required" errors
  // wait until submit so tabbing through the form is never punished.
  const handleBlur = (field: CheckoutFieldName) => {
    if (!formData[field].trim()) return;
    const message = validateCheckoutField(field, formData[field]);
    if (message) setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const focusField = (field: CheckoutFieldName) => {
    document.getElementById(checkoutFieldId(field))?.focus();
  };

  // Inputs are disabled while submitting, and a disabled input cannot take
  // focus — so a field flagged by the server is focused once they re-enable.
  const pendingFocusRef = useRef<CheckoutFieldName | null>(null);
  useEffect(() => {
    if (!isSubmitting && pendingFocusRef.current) {
      document.getElementById(checkoutFieldId(pendingFocusRef.current))?.focus();
      pendingFocusRef.current = null;
    }
  }, [isSubmitting]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || items.length === 0) return;

    const validationErrors = validateCheckoutForm(formData);
    setErrors(validationErrors);
    setSubmitError(null);
    setSubmitDetails(null);

    const firstInvalid = CHECKOUT_FIELD_ORDER.find((field) => validationErrors[field]);
    if (firstInvalid) {
      setShowValidationBanner(true);
      focusField(firstInvalid);
      return;
    }
    setShowValidationBanner(false);

    // On success the form deliberately stays locked (see TODO below).
    let keepLocked = false;
    setIsSubmitting(true);

    try {
      orderTokenRef.current ??= crypto.randomUUID();
      const trimmed = trimCheckoutForm(formData);

      const result = await submitCheckout({
        orderToken: orderTokenRef.current,
        // Identity, options and quantity only — the server prices everything.
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          length: item.length,
          quantity: item.quantity,
        })),
        customer: {
          fullName: trimmed.fullName,
          email: trimmed.email,
          phone: trimmed.phone,
        },
        delivery: {
          country: trimmed.country,
          addressLine1: trimmed.addressLine1,
          addressLine2: trimmed.addressLine2,
          city: trimmed.city,
          region: trimmed.region,
          postalCode: trimmed.postalCode,
          deliveryNotes: trimmed.deliveryNotes,
        },
      });

      if (result.ok) {
        // TODO(backend): hand off to payment / confirmation here (e.g. router.push
        // or a payment redirect). The form stays locked so it cannot be
        // submitted twice while navigation takes over.
        keepLocked = true;
        return;
      }

      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      setSubmitError(result.message);
      setSubmitDetails(result.details ?? null);
      pendingFocusRef.current = CHECKOUT_FIELD_ORDER.find((field) => fieldErrors[field]) ?? null;
    } catch {
      setSubmitError("We could not process your checkout just now. Your bag is unchanged — please try again.");
    } finally {
      if (!keepLocked) setIsSubmitting(false);
    }
  };

  const fieldProps = (field: CheckoutFieldName) => ({
    id: checkoutFieldId(field),
    name: field,
    value: formData[field],
    error: errors[field],
    maxLength: CHECKOUT_FIELD_LIMITS[field],
    disabled: isSubmitting,
    "aria-invalid": errors[field] ? (true as const) : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(field, e.target.value),
    onBlur: () => handleBlur(field),
  });

  return (
    <div className="py-10 sm:py-14 lg:py-18 bg-background">
      <Container size="wide">
        {!hydrated ? (
          <CheckoutSkeleton />
        ) : items.length === 0 ? (
          /* Calm empty state — nothing to check out */
          <div className="py-20 sm:py-28 text-center flex flex-col items-center gap-6 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-surface-subtle border border-border flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow text-accent tracking-[0.2em]">Checkout</span>
              <h1 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
                Your bag is empty.
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                Add a set to your bag before checking out.
              </p>
            </div>
            <div className="pt-2">
              <Button href="/shop" variant="primary" size="md" className="min-w-[200px]">
                <span>Explore Collection</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
            {/* Header */}
            <div className="flex flex-col gap-5 border-b border-border pb-6">
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "Bag", href: "/cart" },
                  { label: "Checkout" },
                ]}
              />
              <div className="flex flex-col gap-2">
                <span className="eyebrow text-accent tracking-[0.2em]">Studio Checkout</span>
                <h1 className="font-display font-light text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight">
                  Checkout
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 xl:gap-20 items-start">
              {/* Summary: first on mobile (collapsed), right + sticky on desktop */}
              <div className="order-first lg:order-last lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28">
                <CheckoutSummary items={items} totalItems={totalItems} total={subtotalPlaceholder} />
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Checkout details"
                className="order-last lg:order-first lg:col-span-7 xl:col-span-8 flex flex-col gap-10 sm:gap-12"
              >
                {showValidationBanner && errorCount > 0 && (
                  <AlertBanner>
                    <span>
                      {errorCount === 1
                        ? "Please check the highlighted field and try again."
                        : `Please check the ${errorCount} highlighted fields and try again.`}
                    </span>
                  </AlertBanner>
                )}

                {/* 01 — Contact */}
                <section
                  className="flex flex-col gap-5 border-b border-border pb-10"
                  aria-labelledby="checkout-contact-heading"
                >
                  <SectionHeader
                    id="checkout-contact-heading"
                    index="01"
                    eyebrow="Contact"
                    title="Your details"
                    description="Where we can reach you about your order."
                  />

                  <div className="flex flex-col gap-4 sm:gap-5 pt-1">
                    <Input
                      label="Full Name *"
                      placeholder="e.g. Fatima Khan"
                      autoComplete="name"
                      required
                      {...fieldProps("fullName")}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <Input
                        type="email"
                        label="Email Address *"
                        placeholder="name@example.com"
                        autoComplete="email"
                        inputMode="email"
                        required
                        {...fieldProps("email")}
                      />
                      <Input
                        type="tel"
                        label="Phone Number *"
                        placeholder="+00 000 000 0000"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                        {...fieldProps("phone")}
                      />
                    </div>
                  </div>
                </section>

                {/* 02 — Delivery */}
                <section
                  className="flex flex-col gap-5 border-b border-border pb-10"
                  aria-labelledby="checkout-delivery-heading"
                >
                  <SectionHeader
                    id="checkout-delivery-heading"
                    index="02"
                    eyebrow="Delivery"
                    title="Delivery address"
                    description="Where your order should be sent."
                  />

                  <div className="flex flex-col gap-4 sm:gap-5 pt-1">
                    <Input
                      label="Country *"
                      placeholder="Country"
                      autoComplete="country-name"
                      required
                      {...fieldProps("country")}
                    />
                    <Input
                      label="Street Address *"
                      placeholder="House number and street name"
                      autoComplete="address-line1"
                      required
                      {...fieldProps("addressLine1")}
                    />
                    <Input
                      label="Apartment, Suite, etc. (Optional)"
                      placeholder="Apartment, suite, unit, building"
                      autoComplete="address-line2"
                      {...fieldProps("addressLine2")}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <Input
                        label="City *"
                        placeholder="City"
                        autoComplete="address-level2"
                        required
                        {...fieldProps("city")}
                      />
                      <Input
                        label="State / Region (Optional)"
                        placeholder="State, province or region"
                        autoComplete="address-level1"
                        {...fieldProps("region")}
                      />
                      <Input
                        label="Postal Code (Optional)"
                        placeholder="Postal or ZIP code"
                        autoComplete="postal-code"
                        {...fieldProps("postalCode")}
                      />
                    </div>
                    <Textarea
                      label="Delivery Notes (Optional)"
                      rows={3}
                      placeholder="Anything that helps with delivery, such as a landmark or building access."
                      {...fieldProps("deliveryNotes")}
                    />
                  </div>
                </section>

                {/* 03 — Payment & total */}
                <section className="flex flex-col gap-6" aria-labelledby="checkout-payment-heading">
                  <SectionHeader
                    id="checkout-payment-heading"
                    index="03"
                    eyebrow="Payment"
                    title="Payment"
                  />

                  {/* Payment slot: replace this block with the payment element when wired. */}
                  <div
                    id="checkout-payment-slot"
                    className="p-5 sm:p-6 border border-dashed border-border bg-surface-subtle/40 flex flex-col gap-1.5"
                  >
                    <span className="text-xs uppercase tracking-[0.16em] font-medium text-foreground">
                      Payment method
                    </span>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                      Payment options will appear here once online payment is connected.
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between border-y border-border py-4">
                    <span className="text-foreground uppercase tracking-wider text-xs font-medium">
                      Total
                    </span>
                    <span className="font-mono text-lg text-foreground font-semibold">
                      {subtotalPlaceholder}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {submitError && (
                      <AlertBanner>
                        <span>{submitError}</span>
                        {submitDetails && submitDetails.length > 0 && (
                          <ul className="list-disc list-inside text-[11px]">
                            {submitDetails.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                          </ul>
                        )}
                      </AlertBanner>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                      <Link
                        href="/cart"
                        className="inline-flex items-center justify-center sm:justify-start gap-1.5 min-h-[44px] text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Return to bag</span>
                      </Link>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isSubmitting}
                        className="w-full sm:w-auto sm:px-12 min-h-[50px] text-xs uppercase tracking-[0.18em]"
                      >
                        {isSubmitting ? "Processing..." : "Continue to Payment"}
                      </Button>
                    </div>
                  </div>
                </section>
              </form>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
