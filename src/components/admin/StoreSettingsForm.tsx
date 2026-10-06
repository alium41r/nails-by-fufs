"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { resetContentDocumentAction, saveStoreSettings } from "@/app/admin/content-actions";
import { CURRENCIES } from "@/lib/currency";
import { AdminSection } from "@/components/admin/ui/primitives";
import {
  AdminButton,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/ui/controls";
import { cn } from "@/lib/utils";

export interface StoreSettingsValues {
  name: string;
  shortName: string;
  tagline: string;
  footerTagline: string;
  mobileTagline: string;
  metaTitle: string;
  metaDescription: string;
  homeMetaTitle: string;
  homeMetaDescription: string;
  email: string;
  phone: string;
  addressLines: string;
  country: string;
  jurisdiction: string;
  defaultCurrency: string;
  socials: { label: string; href: string }[];
}

/**
 * "Restore the wording the site shipped with" for one content document.
 *
 * Declared at module scope rather than inside the form: a component defined during
 * render is a new type on every pass, so React unmounts and remounts it instead of
 * updating it.
 */
function ResetButton({
  contentKey,
  description,
  pending,
  onReset,
}: {
  contentKey: string;
  description: string;
  pending: boolean;
  onReset: (key: string, description: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onReset(contentKey, description)}
      className="text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      title="Restore the wording the site shipped with"
    >
      Restore original
    </button>
  );
}

/**
 * Store settings.
 *
 * ## The same seventeen fields, in a readable order
 *
 * Every setting the previous form exposed is still here and still submits to the
 * same action. What changed is grouping and disclosure:
 *
 *   - **Business name**, the details a customer actually sees, and the default
 *     currency are always visible, because they are what an owner comes here to
 *     change.
 *   - **Search and sharing** (four title/description fields that only affect
 *     browser tabs, link previews and search results) moved behind a disclosure.
 *     They matter, but they are not what "settings" usually means, and they were
 *     previously interleaved with the business name as if equally urgent.
 *   - **Advanced accents** (the footer and mobile-menu descriptors) are inside the
 *     same disclosure, since they exist only because three surfaces historically
 *     used different wording.
 *
 * Labels are sentence case with the technical phrasing moved into hints.
 *
 * ## What this deliberately does not touch
 *
 * No environment configuration, no keys, no database or hosting settings. Those are
 * not business content, and a web form is the wrong place to change them.
 */
export function StoreSettingsForm({ values }: { values: StoreSettingsValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [form, setForm] = useState(values);

  const set = <K extends keyof StoreSettingsValues>(key: K, value: StoreSettingsValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await saveStoreSettings(form);
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message });
        router.refresh();
      } else {
        setNotice({ kind: "error", message: result.error });
      }
    });
  };

  const reset = (key: string, description: string) => {
    if (!window.confirm(`Restore ${description} to the wording the site shipped with?`)) return;
    setNotice(null);
    startTransition(async () => {
      const result = await resetContentDocumentAction({ key });
      if (result.ok) {
        setNotice({ kind: "ok", message: result.message });
        router.refresh();
      } else {
        setNotice({ kind: "error", message: result.error });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-8">
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg border p-3.5 text-[13px]",
            notice.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
          )}
        >
          {notice.message}
        </p>
      )}

      {/* ── Business identity ───────────────────────────────────────────── */}
      <AdminSection
        title="Business identity"
        description="The studio's name as it appears in the header, footer and browser tab."
        actions={<ResetButton contentKey="site.identity" description="the business name" pending={pending} onReset={reset} />}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Business name" htmlFor="s-name" hint="Shown in the header and footer.">
            <TextInput
              id="s-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </Field>
          <Field
            label="Short name"
            htmlFor="s-short"
            optional
            hint="Used in the small line under the header wordmark."
          >
            <TextInput
              id="s-short"
              value={form.shortName}
              onChange={(event) => set("shortName", event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Tagline"
          htmlFor="s-tagline"
          optional
          hint="The line under the header wordmark, e.g. “Press-On Nail Studio”."
        >
          <TextInput
            id="s-tagline"
            value={form.tagline}
            onChange={(event) => set("tagline", event.target.value)}
          />
        </Field>
      </AdminSection>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <AdminSection
        title="Public contact details"
        description="Published on your contact page and on every policy page. Changing them updates any policy wording that mentions them."
        actions={<ResetButton contentKey="site.contact" description="the contact details" pending={pending} onReset={reset} />}
        divided
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="s-email">
            <TextInput
              id="s-email"
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>
          <Field label="Phone" htmlFor="s-phone">
            <TextInput
              id="s-phone"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Address"
          htmlFor="s-address"
          optional
          hint="One line per row. Only the locality is published — no house number is stored."
        >
          <TextArea
            id="s-address"
            value={form.addressLines}
            onChange={(event) => set("addressLines", event.target.value)}
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Country" htmlFor="s-country">
            <TextInput
              id="s-country"
              value={form.country}
              onChange={(event) => set("country", event.target.value)}
            />
          </Field>
          <Field
            label="Governing law"
            htmlFor="s-jurisdiction"
            optional
            hint="Named in the Terms & Conditions."
          >
            <TextInput
              id="s-jurisdiction"
              value={form.jurisdiction}
              onChange={(event) => set("jurisdiction", event.target.value)}
            />
          </Field>
        </div>
      </AdminSection>

      {/* ── Currency ────────────────────────────────────────────────────── */}
      <AdminSection
        title="Default currency"
        description="The currency new prices start in, and the one used to label a product that has no price yet."
        actions={<ResetButton contentKey="site.currency" description="the default currency" pending={pending} onReset={reset} />}
        divided
      >
        <Field label="Currency" htmlFor="s-currency" className="max-w-xs">
          <Select
            id="s-currency"
            value={form.defaultCurrency}
            onChange={(event) => set("defaultCurrency", event.target.value)}
          >
            {!CURRENCIES.some((currency) => currency.code === form.defaultCurrency) && (
              <option value={form.defaultCurrency}>{form.defaultCurrency} (current)</option>
            )}
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} — {currency.label}
              </option>
            ))}
          </Select>
        </Field>

        <p className="rounded-md bg-surface-subtle/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          Changing this does <strong className="font-medium">not</strong> convert or rewrite any
          existing price — every product keeps the currency it was priced in. To move a set to a
          different currency, change it on that product and re-enter the figure.
        </p>
      </AdminSection>

      {/* ── Socials ─────────────────────────────────────────────────────── */}
      <AdminSection
        title="Social profiles"
        description="Shown in the footer. Clear a row to remove that link."
        actions={<ResetButton contentKey="site.socials" description="the social links" pending={pending} onReset={reset} />}
        divided
      >
        <div className="flex flex-col gap-3">
          {form.socials.map((social, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
              <TextInput
                value={social.label}
                onChange={(event) =>
                  set(
                    "socials",
                    form.socials.map((entry, position) =>
                      position === index ? { ...entry, label: event.target.value } : entry,
                    ),
                  )
                }
                placeholder="Label"
                aria-label={`Social link ${index + 1} label`}
              />
              <TextInput
                value={social.href}
                onChange={(event) =>
                  set(
                    "socials",
                    form.socials.map((entry, position) =>
                      position === index ? { ...entry, href: event.target.value } : entry,
                    ),
                  )
                }
                placeholder="https://instagram.com/your-studio"
                aria-label={`Social link ${index + 1} address`}
              />
            </div>
          ))}
        </div>

        <div>
          <AdminButton
            type="button"
            size="sm"
            onClick={() => set("socials", [...form.socials, { label: "", href: "" }])}
          >
            Add social link
          </AdminButton>
        </div>
      </AdminSection>

      {/* ── Advanced: search, sharing and surface accents ────────────────── */}
      <details className="group border-t border-border/60 pt-8">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-medium text-foreground">
          Search, sharing and accents
          <span
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-open:rotate-180"
          >
            ⌄
          </span>
        </summary>

        <div className="flex flex-col gap-8 pt-6">
          <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            These affect how the site appears in search results and shared links, and the small
            descriptors used in the footer and mobile menu. Most owners never need to change them.
          </p>

          <div className="flex flex-col gap-5">
            <Field
              label="Site title"
              htmlFor="s-meta-title"
              hint="Used in browser tabs and link previews for every page."
            >
              <TextInput
                id="s-meta-title"
                value={form.metaTitle}
                onChange={(event) => set("metaTitle", event.target.value)}
              />
            </Field>
            <Field label="Site description" htmlFor="s-meta-description">
              <TextArea
                id="s-meta-description"
                value={form.metaDescription}
                onChange={(event) => set("metaDescription", event.target.value)}
                rows={2}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-5 border-t border-border/50 pt-5">
            <Field label="Homepage title" htmlFor="s-home-title">
              <TextInput
                id="s-home-title"
                value={form.homeMetaTitle}
                onChange={(event) => set("homeMetaTitle", event.target.value)}
              />
            </Field>
            <Field label="Homepage description" htmlFor="s-home-description">
              <TextArea
                id="s-home-description"
                value={form.homeMetaDescription}
                onChange={(event) => set("homeMetaDescription", event.target.value)}
                rows={2}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-5 border-t border-border/50 pt-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Footer descriptor"
                htmlFor="s-footer-tagline"
                hint="Shown under the footer wordmark."
              >
                <TextInput
                  id="s-footer-tagline"
                  value={form.footerTagline}
                  onChange={(event) => set("footerTagline", event.target.value)}
                />
              </Field>
              <Field
                label="Mobile menu descriptor"
                htmlFor="s-mobile-tagline"
                hint="Shown at the end of the mobile menu."
              >
                <TextInput
                  id="s-mobile-tagline"
                  value={form.mobileTagline}
                  onChange={(event) => set("mobileTagline", event.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      </details>

      {/*
        A sticky save bar, which matters most on a phone: this form is the longest
        in the admin (seven sections plus a disclosure), and the save button was
        otherwise a long scroll away from whichever field was just edited. On a
        narrow screen the two controls stack and the primary action takes the full
        width, so neither is a cramped target and neither wraps mid-label.
      */}
      <div className="sticky bottom-3 z-30 flex flex-col gap-2 rounded-lg border border-border bg-surface/95 p-3 backdrop-blur sm:bottom-4 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
        <AdminButton type="submit" variant="primary" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Save settings"}
        </AdminButton>
        <button
          type="button"
          onClick={() => setForm(values)}
          className="w-full rounded-md py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:w-auto sm:py-0"
        >
          Undo unsaved changes
        </button>
      </div>
    </form>
  );
}
